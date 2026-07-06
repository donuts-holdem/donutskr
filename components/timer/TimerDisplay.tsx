"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Maximize, Volume2, VolumeX } from "lucide-react";
import { useTimerSession } from "@/lib/timer/useTimerSession";
import { deriveTimerState, totalChips, avgStack, avgStackBB } from "@/lib/timer/state";
import type { TimerSession } from "@/lib/types";

// Minimal shape of the Screen Wake Lock API (not in every lib.dom yet).
interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}
interface WakeLockLike {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

const TICK_MS = 250;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Seconds → M:SS (minutes uncapped, so a 90-min level reads 90:00). */
function fmtMMSS(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${m}:${pad(s % 60)}`;
}

/** Wall-clock HH:MM in the viewer's local time. */
function fmtClock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtChips(n: number): string {
  return n.toLocaleString("en-US");
}

export function TimerDisplay({ initial, id }: { initial: TimerSession; id: string }) {
  const { session: live, now, connectionState, gone } = useTimerSession(id);
  const session = live ?? initial;

  // 4×/s repaint. Every frame re-derives from now() — timestamps, never counters —
  // so a throttled background tab self-heals the moment it repaints.
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const iv = window.setInterval(tick, TICK_MS);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const derived = deriveTimerState(session, now());

  // ── Screen Wake Lock ──────────────────────────────────────────────────────
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: WakeLockLike };
    if (!nav.wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await nav.wakeLock!.request("screen");
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
      } catch {
        // Denied or unsupported — the display still works, screen may just sleep.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, []);

  // ── Sound cues (WebAudio, opt-in) ─────────────────────────────────────────
  const [soundOn, setSoundOn] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(false);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  const tone = useCallback((freq: number, startOffset: number, dur: number) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const t = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      if (next) {
        if (!audioRef.current) {
          const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (Ctor) audioRef.current = new Ctor();
        }
        void audioRef.current?.resume();
      }
      return next;
    });
  }, []);

  // Boundary + 10s-warning detection, driven off derived state between renders.
  const prevLevelRef = useRef<number | null>(null);
  const warnedRef = useRef(false);
  const secLeft = Math.ceil(derived.remainingSec);
  const running = session.status === "running";
  useEffect(() => {
    const prev = prevLevelRef.current;
    if (prev !== null && prev !== derived.levelIndex) {
      warnedRef.current = false;
      if (soundOnRef.current && running) {
        tone(660, 0, 0.18);
        tone(880, 0.16, 0.28);
      }
    }
    prevLevelRef.current = derived.levelIndex;

    if (secLeft > 10) {
      warnedRef.current = false;
    } else if (secLeft <= 10 && secLeft > 0 && !warnedRef.current && !derived.isBreak) {
      warnedRef.current = true;
      if (soundOnRef.current && running) tone(880, 0, 0.5);
    }
  }, [derived.levelIndex, derived.isBreak, secLeft, running, tone]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void rootRef.current?.requestFullscreen?.();
    }
  }, []);

  // ── Removed session ───────────────────────────────────────────────────────
  // Without this, a soft-deleted timer would freeze on its last frame forever
  // (the row vanishes from both realtime and the poll).
  if (gone) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-ink select-none">
        <p className="text-display font-black tracking-tight sm:text-display-2xl">타이머가 종료되었습니다</p>
        <p className="text-base text-ink/60 sm:text-xl">이 타이머는 운영자에 의해 삭제되었습니다.</p>
      </div>
    );
  }

  // ── Finished screen ───────────────────────────────────────────────────────
  if (derived.isFinished) {
    return (
      <FinishedScreen session={session} rootRef={rootRef} onFullscreen={toggleFullscreen} />
    );
  }

  const paused = session.status === "paused";
  const bbForAvg = derived.isBreak ? derived.nextLevelRow?.bb ?? 0 : derived.row.bb;
  const avg = avgStack(session);
  const avgBB = avgStackBB(session, bbForAvg);
  const breakEndsAt = derived.isBreak ? fmtClock(now() + derived.remainingSec * 1000) : null;

  // Left column shows what players are actually returning to during a break.
  const leftLevel = derived.isBreak ? derived.nextLevelRow : derived.row;

  return (
    <div
      ref={rootRef}
      onDoubleClick={toggleFullscreen}
      className="flex h-dvh w-full flex-col overflow-hidden bg-bg text-ink select-none"
    >
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between gap-4 px-6 py-4 sm:px-10 sm:py-5">
        <span className="text-lg font-medium tabular-nums text-ink/70 sm:text-2xl" aria-label="현재 시각">
          {fmtClock(now())}
        </span>
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-semibold tracking-tight sm:text-3xl">
          {session.title}
        </h1>
        {/* stopPropagation: a double-click on the controls must not bubble to
            the root's fullscreen toggle. */}
        <span
          className="flex items-center gap-2 text-2xs uppercase tracking-widest text-ink/60 sm:text-xs"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? "소리 끄기" : "소리 켜기"}
            className="rounded-pill border border-border bg-surface/80 p-1.5 text-ink/70 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {soundOn ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="전체화면"
            className="rounded-pill border border-border bg-surface/80 p-1.5 text-ink/70 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <Maximize className="size-4" aria-hidden />
          </button>
          <ConnectionDot state={connectionState} />
        </span>
      </header>

      {/* ── Reg banner ── */}
      {session.reg_close_level != null && (
        <div
          className={`px-6 py-1.5 text-center text-sm font-semibold uppercase tracking-widest sm:text-base ${
            derived.regOpen ? "bg-gold/10 text-gold" : "bg-danger/15 text-danger"
          }`}
        >
          {derived.regOpen
            ? `REG OPEN · 레벨 ${session.reg_close_level} 종료 시 마감`
            : "REGISTRATION CLOSED"}
        </div>
      )}

      {/* ── Main grid ── */}
      <main className="relative grid flex-1 grid-cols-1 items-center gap-6 px-6 py-6 sm:px-10 lg:grid-cols-[1fr_1.5fr_1fr] lg:gap-8">
        {/* Left — current (or upcoming during break) blinds */}
        <section className="order-2 lg:order-1">
          {derived.isBreak && (
            <p className="mb-3 text-center text-2xs font-semibold uppercase tracking-[0.25em] text-pink lg:text-left">
              다음 레벨
            </p>
          )}
          <BlindStack
            sb={leftLevel?.sb ?? null}
            bb={leftLevel?.bb ?? null}
            ante={leftLevel?.ante ?? null}
            emphatic
          />
        </section>

        {/* Center — level pill · countdown · next break */}
        <section className="order-1 flex flex-col items-center gap-3 lg:order-2">
          <span
            className={`rounded-pill px-5 py-1.5 text-lg font-bold uppercase tracking-[0.2em] sm:text-2xl ${
              derived.isBreak ? "bg-pink/15 text-pink" : "bg-glass text-gold"
            }`}
          >
            {derived.isBreak
              ? "BREAK"
              : `LEVEL ${derived.displayLevelNo ?? derived.levelIndex + 1}`}
          </span>

          <div className="relative">
            <time
              aria-live="off"
              className={`block text-center font-bold leading-none tabular-nums text-clock ${
                paused ? "opacity-40" : ""
              } ${derived.isBreak ? "text-pink" : "text-ink"}`}
            >
              {fmtMMSS(derived.remainingSec)}
            </time>
            {paused && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <span className="-rotate-12 rounded-md bg-danger/90 px-6 py-2 text-2xl font-black uppercase tracking-[0.3em] text-ink shadow-lg sm:text-4xl">
                  PAUSED
                </span>
              </span>
            )}
          </div>

          <p className="text-center text-sm font-medium uppercase tracking-widest text-ink/55 sm:text-lg">
            {derived.isBreak
              ? `BREAK · 종료 ${breakEndsAt}`
              : derived.timeToNextBreakSec != null
                ? `NEXT BREAK IN ${fmtMMSS(derived.timeToNextBreakSec)} · ${derived.nextBreakDurationMin} MIN`
                : "브레이크 없음"}
          </p>
        </section>

        {/* Right — next blinds, dimmed */}
        <section className="order-3 opacity-45">
          <p className="mb-3 text-center text-2xs font-semibold uppercase tracking-[0.25em] text-ink/60 lg:text-right">
            NEXT
          </p>
          <BlindStack
            sb={derived.nextLevelRow?.sb ?? null}
            bb={derived.nextLevelRow?.bb ?? null}
            ante={derived.nextLevelRow?.ante ?? null}
            align="end"
          />
        </section>
      </main>

      {/* ── Bottom strip ── */}
      <footer className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-3">
        <Panel label="Players">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums sm:text-5xl">{session.players}</span>
            <span className="text-sm text-ink/50 sm:text-base">생존</span>
          </div>
          <p className="mt-1 text-sm text-ink/55 sm:text-base">
            <span className="tabular-nums">{session.entries}</span> 엔트리
          </p>
        </Panel>

        <Panel label="Average Stack">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums sm:text-5xl">
              {avg != null ? fmtChips(avg) : "—"}
            </span>
            {avgBB != null && (
              <span className="text-xl font-semibold tabular-nums text-gold sm:text-3xl">
                {avgBB} BB
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink/55 sm:text-base">
            Total <span className="tabular-nums">{fmtChips(totalChips(session))}</span>
            {session.starting_stack != null && (
              <>
                {" · "}Start <span className="tabular-nums">{fmtChips(session.starting_stack)}</span>
              </>
            )}
          </p>
        </Panel>

        <Panel label="Prize">
          {session.prizes.length > 0 ? (
            <ul className="space-y-0.5">
              {[...session.prizes].sort((a, b) => a.place - b.place).slice(0, 4).map((p) => (
                <li key={p.place} className="flex items-baseline justify-between gap-3 text-base sm:text-xl">
                  <span className="text-ink/60">{p.place}위</span>
                  <span className="font-semibold tabular-nums">{p.amount}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-ink/60 sm:text-xl">프라이즈 미정</p>
          )}
        </Panel>
      </footer>

    </div>
  );
}

function BlindStack({
  sb,
  bb,
  ante,
  emphatic = false,
  align = "start",
}: {
  sb: number | string | null;
  bb: number | string | null;
  ante: number | string | null;
  emphatic?: boolean;
  align?: "start" | "end";
}) {
  const itemAlign =
    align === "end" ? "items-center lg:items-end" : "items-center lg:items-start";
  const valueCls = emphatic
    ? "text-blind font-bold text-ink"
    : "text-3xl font-semibold text-ink sm:text-5xl";
  const rows: [string, number | string | null][] = [
    ["SMALL BLIND", sb],
    ["BIG BLIND", bb],
    ["ANTE", ante],
  ];
  // Text chip values ("PLO") render verbatim; 0 renders as an em-dash.
  const chip = (val: number | string | null): string => {
    if (val == null) return "-";
    if (typeof val === "string") return val.trim() === "" ? "-" : val;
    return val === 0 ? "—" : fmtChips(val);
  };
  return (
    <dl className={`flex flex-col gap-4 ${itemAlign}`}>
      {rows.map(([label, val]) => (
        <div key={label} className={`flex flex-col gap-0.5 ${itemAlign}`}>
          <dt className="text-2xs font-semibold uppercase tracking-[0.2em] text-ink/60 sm:text-xs">
            {label}
          </dt>
          <dd className={`leading-none tabular-nums ${valueCls}`}>{chip(val)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg px-6 py-4 sm:px-8 sm:py-5">
      <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.2em] text-ink/60 sm:text-xs">
        {label}
      </p>
      {children}
    </div>
  );
}

function ConnectionDot({ state }: { state: "connecting" | "connected" | "disconnected" }) {
  const color =
    state === "connected" ? "bg-gold" : state === "connecting" ? "bg-ink/40" : "bg-danger";
  const label =
    state === "connected" ? "실시간 연결됨" : state === "connecting" ? "연결 중" : "연결 끊김";
  return (
    <span className="flex items-center gap-1.5" title={label}>
      <span className={`h-2 w-2 rounded-pill ${color}`} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function FinishedScreen({
  session,
  rootRef,
  onFullscreen,
}: {
  session: TimerSession;
  rootRef: React.RefObject<HTMLDivElement | null>;
  onFullscreen: () => void;
}) {
  return (
    <div
      ref={rootRef}
      onDoubleClick={onFullscreen}
      className="flex h-dvh w-full flex-col items-center justify-center gap-8 bg-bg px-6 text-center text-ink select-none"
    >
      <p className="text-2xs font-semibold uppercase tracking-[0.35em] text-gold sm:text-sm">
        {session.title}
      </p>
      <p className="text-display-2xl font-black tracking-tight sm:text-display-3xl">종료</p>
      <dl className="flex gap-12">
        <div className="flex flex-col gap-1">
          <dt className="text-2xs font-semibold uppercase tracking-[0.2em] text-ink/60 sm:text-xs">
            엔트리
          </dt>
          <dd className="text-4xl font-bold tabular-nums sm:text-6xl">{session.entries}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-2xs font-semibold uppercase tracking-[0.2em] text-ink/60 sm:text-xs">
            생존
          </dt>
          <dd className="text-4xl font-bold tabular-nums sm:text-6xl">{session.players}</dd>
        </div>
      </dl>
      {session.prizes.length > 0 && (
        <ul className="flex flex-col gap-1 text-lg sm:text-2xl">
          {[...session.prizes].sort((a, b) => a.place - b.place).slice(0, 4).map((p) => (
            <li key={p.place} className="flex items-baseline justify-center gap-4">
              <span className="text-ink/55">{p.place}위</span>
              <span className="font-semibold tabular-nums">{p.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
