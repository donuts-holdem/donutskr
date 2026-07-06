"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
// Re-measure server skew periodically: an NTP step-correction on the display
// device would otherwise shift the countdown by the correction amount.
const OFFSET_REMEASURE_MS = 30 * 60_000;

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
  const offsetRef = useRef(0);
  const versionRef = useRef(-1);
  const seenRef = useRef(false);
  const refetchRef = useRef<() => Promise<void>>(async () => {});

  const now = useCallback(() => Date.now() + offsetRef.current, []);
  const refresh = useCallback(() => refetchRef.current(), []);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let active = true;
    versionRef.current = -1;
    seenRef.current = false;
    const markGone = () => setGoneForId(id);

    // Single apply path with a monotonic version gate: a stale in-flight poll
    // response must never overwrite a newer realtime row (e.g. flashing a
    // paused timer back to running for 20s).
    const apply = (row: TimerSession) => {
      if (!active || row.version < versionRef.current) return;
      versionRef.current = row.version;
      seenRef.current = true;
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

    // Measure server clock skew. Roundtrip-midpoint estimate keeps the
    // countdown honest on devices whose local clock is wrong.
    const measureOffset = async () => {
      try {
        const t0 = Date.now();
        const res = await fetch("/api/now", { cache: "no-store" });
        const t1 = Date.now();
        const { now: serverNow } = (await res.json()) as { now: number };
        if (active && typeof serverNow === "number") {
          offsetRef.current = serverNow - (t0 + t1) / 2;
        }
      } catch {
        // keep offset at 0 — local clock is the fallback
      }
    };

    void measureOffset();
    void refetch();

    const channel = supabase
      .channel(`timer:${id}`)
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
          setConnectionState("connected");
          void refetch(); // catch anything missed while connecting
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionState("disconnected");
        }
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    const poll = window.setInterval(() => void refetch(), POLL_INTERVAL_MS);
    const remeasure = window.setInterval(() => void measureOffset(), OFFSET_REMEASURE_MS);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
      window.clearInterval(remeasure);
      void supabase.removeChannel(channel);
    };
  }, [id]);

  return { session, now, connectionState, gone: goneForId === id, refresh };
}
