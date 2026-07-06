"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { TimerSession, TimerLevel, TimerPrize } from "@/lib/types";

export type TimerConnectionState = "connecting" | "connected" | "disconnected";

// Local row → TimerSession mapper. Kept here (not imported from lib/data/timers)
// so the client bundle never pulls in the server-only supabase client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(r: any): TimerSession {
  return {
    id: String(r.id ?? ""),
    event_id: r.event_id ?? null,
    title: String(r.title ?? ""),
    buy_in: r.buy_in ?? null,
    starting_stack: r.starting_stack ?? null,
    structure: (Array.isArray(r.structure) ? r.structure : []) as TimerLevel[],
    status: (r.status ?? "paused") as TimerSession["status"],
    started_at: r.started_at ?? null,
    elapsed_offset_sec: Number(r.elapsed_offset_sec ?? 0),
    level_index: Number(r.level_index ?? 0),
    entries: Number(r.entries ?? 0),
    players: Number(r.players ?? 0),
    reg_close_level: r.reg_close_level ?? null,
    prizes: (Array.isArray(r.prizes) ? r.prizes : []) as TimerPrize[],
    finished_at: r.finished_at ?? null,
    version: Number(r.version ?? 0),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

const POLL_INTERVAL_MS = 20_000;
const FAST_POLL_INTERVAL_MS = 4_000;
// Re-measure server skew periodically: an NTP step-correction on the display
// device would otherwise shift the countdown by the correction amount.
const OFFSET_REMEASURE_MS = 30 * 60_000;
// How long a broadcast intent may bridge the gap before the authoritative row
// must have arrived. Long enough for a slow server action (~1-2s), short
// enough that a spoofed/orphaned intent self-heals quickly.
const INTENT_TTL_MS = 4_000;

// The four fields that define the clock's motion. Overlays are invalidated by
// a CLOCK change, not by version alone: an unrelated bump (entries autosave,
// meta edit) must not un-pause an optimistic overlay while the real pause row
// is still in flight.
const CLOCK_KEYS = ["status", "started_at", "elapsed_offset_sec", "level_index"] as const;
type ClockSnapshot = Pick<TimerSession, (typeof CLOCK_KEYS)[number]>;

export function clockSnapshot(s: TimerSession): ClockSnapshot {
  return {
    status: s.status,
    started_at: s.started_at,
    elapsed_offset_sec: s.elapsed_offset_sec,
    level_index: s.level_index,
  };
}
export function sameClock(a: ClockSnapshot, b: ClockSnapshot): boolean {
  return CLOCK_KEYS.every((k) => Object.is(a[k], b[k]));
}

// A control page's declared action, broadcast browser→realtime→peers at click
// time. It skips the whole server round-trip (action → DB → WAL → push), so a
// venue display freezes/starts ~100-300ms after the click instead of 1-2s.
// Receivers treat it strictly as a short-lived overlay: it is dropped once a
// newer row actually CHANGES the clock (see CLOCK_KEYS), or on TTL expiry, and
// every receiver refetches, so the DB row remains the single source of truth.
interface TimerIntent {
  forId: string;
  baseVersion: number;
  patch: Partial<TimerSession>;
  /** Receiver's clock at arrival — a newer row that still matches it is an unrelated bump. */
  snapshot: ClockSnapshot | null;
}

export interface UseTimerSessionResult {
  session: TimerSession | null;
  /** Server-skew-corrected wall clock in ms. Stable reference. */
  now: () => number;
  connectionState: TimerConnectionState;
  /** True once the row has disappeared (soft-deleted) after being seen. */
  gone: boolean;
  /**
   * Refetch the row immediately. Stable reference. Callers that just mutated
   * the timer use this so their own action is reflected without depending on
   * the realtime echo (a still-connecting or dropped socket would otherwise
   * leave the UI stale until the next poll).
   */
  refresh: () => Promise<void>;
  /**
   * Broadcast the expected result of an action to every peer viewing this
   * timer (venue displays, other control pages) so they repaint immediately,
   * before the server action lands. Fire at click time with the same patch
   * used for the local optimistic overlay; pass the caller's freshest known
   * version (e.g. an adopted action result) so rapid sequential actions are
   * not discarded by peers that already saw the previous row. An empty patch
   * cancels the pending intent on peers (used when an action fails). Stable
   * reference; no-op while the channel is still connecting.
   */
  sendIntent: (patch: Partial<TimerSession>, baseVersion?: number) => void;
}

/**
 * Live timer subscription shared by the admin control page and the public
 * display. Realtime is the primary transport; a 20s poll, a visibility refetch,
 * and a resubscribe-refetch cover dropped events so the two views never drift.
 */
export function useTimerSession(id: string): UseTimerSessionResult {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [connectionState, setConnectionState] = useState<TimerConnectionState>("connecting");
  // "Gone" is tracked per id so an id change resets it without a setState in
  // the effect body (goneForId from a previous id simply stops matching).
  const [goneForId, setGoneForId] = useState<string | null>(null);
  // Latest broadcast intent — carries its own id so an id change simply stops
  // matching (same pattern as goneForId, avoids setState in the effect body).
  const [intent, setIntent] = useState<TimerIntent | null>(null);
  const offsetRef = useRef(0);
  const versionRef = useRef(-1);
  const seenRef = useRef(false);
  const sessionRef = useRef<TimerSession | null>(null);
  const refetchRef = useRef<() => Promise<void>>(async () => {});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const connRef = useRef<TimerConnectionState>("connecting");

  const now = useCallback(() => Date.now() + offsetRef.current, []);
  const refresh = useCallback(() => refetchRef.current(), []);
  const sendIntent = useCallback((patch: Partial<TimerSession>, baseVersion?: number) => {
    // Send the freshest version anyone involved knows: the hook's last seen
    // row, or the caller's adopted action result — whichever is newer.
    const base = Math.max(versionRef.current, baseVersion ?? -1);
    void channelRef.current
      ?.send({ type: "broadcast", event: "intent", payload: { baseVersion: base, patch } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let active = true;
    versionRef.current = -1;
    seenRef.current = false;
    sessionRef.current = null;
    const markGone = () => setGoneForId(id);
    const setConn = (s: TimerConnectionState) => {
      connRef.current = s;
      setConnectionState(s);
    };

    // Single apply path with a monotonic version gate: a stale in-flight poll
    // response must never overwrite a newer realtime row (e.g. flashing a
    // paused timer back to running for 20s).
    const apply = (row: TimerSession) => {
      if (!active || row.version < versionRef.current) return;
      versionRef.current = row.version;
      seenRef.current = true;
      sessionRef.current = row;
      setSession(row);
    };

    const refetch = async () => {
      const { data, error } = await supabase
        .from("timer_sessions").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
      if (!active) return;
      // A transient fetch failure must NOT read as "row deleted" — only a
      // successful query with no row means the timer is actually gone.
      if (error) return;
      if (data) apply(rowToSession(data));
      else if (seenRef.current) markGone(); // row vanished (soft-deleted)
    };
    refetchRef.current = refetch;

    // Measure server clock skew. Best-of-3 roundtrip-midpoint samples (keep
    // the one with the smallest RTT — the standard NTP trick) so a single
    // GC-delayed or asymmetric sample can't shift the room's clock for the
    // whole re-measure interval.
    const measureOffset = async () => {
      let best: { rtt: number; offset: number } | null = null;
      for (let i = 0; i < 3; i++) {
        try {
          const t0 = Date.now();
          const res = await fetch("/api/now", { cache: "no-store" });
          const t1 = Date.now();
          const { now: serverNow } = (await res.json()) as { now: number };
          if (typeof serverNow === "number") {
            const rtt = t1 - t0;
            if (!best || rtt < best.rtt) best = { rtt, offset: serverNow - (t0 + t1) / 2 };
          }
        } catch {
          // skip this sample — local clock is the fallback
        }
      }
      if (active && best) offsetRef.current = best.offset;
    };

    void measureOffset();
    void refetch();

    const channel = supabase
      .channel(`timer:${id}`)
      .on("broadcast", { event: "intent" }, (msg) => {
        if (!active) return;
        const p = msg.payload as { baseVersion?: number; patch?: Partial<TimerSession> } | undefined;
        if (typeof p?.baseVersion !== "number" || p.patch == null || typeof p.patch !== "object") return;
        const mine: TimerIntent = {
          forId: id,
          // The sender's version can trail rows this receiver already saw
          // (its own hook lags its adopted action results) — take the max so
          // a rapid second action isn't discarded.
          baseVersion: Math.max(p.baseVersion, versionRef.current),
          patch: p.patch,
          snapshot: sessionRef.current ? clockSnapshot(sessionRef.current) : null,
        };
        setIntent(mine);
        // Expire by identity after the TTL (a newer intent simply replaces
        // it) and reconcile once more at expiry — covers an action that
        // commits late with a dropped postgres_changes event.
        window.setTimeout(() => {
          setIntent((cur) => (cur === mine ? null : cur));
          void refetch();
        }, INTENT_TTL_MS);
        // Reconcile with the authoritative row: once immediately, and once
        // after the server action has surely committed — so even a spoofed or
        // orphaned intent (or a dropped postgres_changes event) is corrected.
        void refetch();
        window.setTimeout(() => void refetch(), 1_500);
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "timer_sessions", filter: `id=eq.${id}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: { new: any }) => {
          // Defensive: RLS normally hides soft-deleted rows from realtime, but
          // if one ever arrives, treat it as a disappearance, not fresh state.
          if (payload.new?.deleted_at != null) {
            if (active && seenRef.current) markGone();
            return;
          }
          apply(rowToSession(payload.new));
        },
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setConn("connected");
          void refetch(); // catch anything missed while connecting
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConn("disconnected");
        }
      });
    channelRef.current = channel;

    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    const poll = window.setInterval(() => void refetch(), POLL_INTERVAL_MS);
    // While the socket is down, realtime AND broadcast intents are both lost —
    // shrink the stale window from 20s to ~4s so a pause during a venue Wi-Fi
    // flap can't let the display run through a level boundary.
    const fastPoll = window.setInterval(() => {
      if (connRef.current !== "connected") void refetch();
    }, FAST_POLL_INTERVAL_MS);
    const remeasure = window.setInterval(() => void measureOffset(), OFFSET_REMEASURE_MS);

    return () => {
      active = false;
      channelRef.current = null;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
      window.clearInterval(fastPoll);
      window.clearInterval(remeasure);
      void supabase.removeChannel(channel);
    };
  }, [id]);

  // Overlay a live intent on top of the last authoritative row. It survives
  // rows that merely bump unrelated fields (entries autosave, meta edits) and
  // drops when a newer row actually changes the clock — normally the very row
  // the intent predicted — or when its TTL timeout clears it.
  const intentActive =
    intent != null &&
    intent.forId === id &&
    session != null &&
    (session.version <= intent.baseVersion ||
      (intent.snapshot != null && sameClock(clockSnapshot(session), intent.snapshot)));
  const view = intentActive && session != null ? { ...session, ...intent.patch } : session;

  return { session: view, now, connectionState, gone: goneForId === id, refresh, sendIntent };
}
