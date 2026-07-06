"use client";

import { memo, useCallback, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ListOrdered,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { TimerLevel, TimerPrize, TimerSession, TimerStatus } from "@/lib/types";
import {
  adjustTime,
  commitAdvance,
  finishTimer,
  jumpToLevel,
  pauseTimer,
  reopenTimer,
  setCounts,
  setRemaining,
  startTimer,
  updateStructure,
  updateTimerMeta,
  type TimerActionResult,
} from "@/app/admin/actions/timers";
import { useTimerSession } from "@/lib/timer/useTimerSession";
import { avgStack, avgStackBB, deriveTimerState, totalChips } from "@/lib/timer/state";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const STATUS_META: Record<TimerStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  running: { label: "진행중", variant: "default" },
  paused: { label: "일시정지", variant: "secondary" },
  finished: { label: "종료", variant: "outline" },
};

const CONNECTION_META: Record<string, { label: string; dot: string }> = {
  connected: { label: "실시간 연결됨", dot: "bg-primary" },
  connecting: { label: "연결 중", dot: "bg-warning" },
  disconnected: { label: "연결 끊김", dot: "bg-destructive" },
};

/** Toast an action result's error; returns whether the action succeeded. */
function reportError(res: TimerActionResult): boolean {
  if (res.ok) return true;
  if (res.error === "conflict") {
    toast.error("다른 곳에서 변경됨 — 최신 상태로 갱신됩니다");
  } else {
    toast.error(res.error);
  }
  return false;
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function formatNum(n: number): string {
  return n.toLocaleString("ko-KR");
}

/** Chip values may be free text ("PLO") — numbers get formatted, text passes through. */
function chipText(v: number | string): string {
  return typeof v === "number" ? formatNum(v) : v;
}

function blindsLabel(row: TimerLevel): string {
  const base = `${chipText(row.sb)} / ${chipText(row.bb)}`;
  const hasAnte = typeof row.ante === "number" ? row.ante > 0 : row.ante.trim() !== "";
  return hasAnte ? `${base} (앤티 ${chipText(row.ante)})` : base;
}

// --------------------------------------------------------------------------
// Root
// --------------------------------------------------------------------------
export function TimerControl({ initial }: { initial: TimerSession }) {
  const { session: live, now, connectionState, refresh } = useTimerSession(initial.id);
  const session = live ?? initial;

  // Re-render on a fixed cadence; the clock is always DERIVED from timestamps,
  // never decremented, so a missed tick self-corrects on the next one.
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const t = window.setInterval(() => tick(), 250);
    return () => window.clearInterval(t);
  }, []);

  const derived = deriveTimerState(session, now());

  // Latest version we know of. Actions return their bumped version and we
  // adopt it immediately, so rapid sequential clicks (+1분 ×5) don't fire with
  // the pre-echo version and get dropped as conflicts.
  const versionRef = useRef(session.version);
  useEffect(() => {
    versionRef.current = Math.max(versionRef.current, session.version);
  }, [session.version]);
  const adopt = useCallback((v?: number) => {
    if (v != null && v > versionRef.current) versionRef.current = v;
  }, []);

  // Persist a boundary the display already crossed. At most once per boundary:
  // committedRef holds the last index we asked the server to move to, reset when
  // the session's own level_index catches up via realtime.
  const committedRef = useRef(session.level_index);
  useEffect(() => {
    committedRef.current = session.level_index;
  }, [session.level_index, session.version]);
  useEffect(() => {
    if (session.status !== "running") return;
    if (derived.levelIndex > session.level_index && derived.levelIndex > committedRef.current) {
      committedRef.current = derived.levelIndex;
      // Background sync — realtime will refresh; conflicts self-heal, so ignore.
      void commitAdvance(session.id, versionRef.current, derived.levelIndex).then((res) => {
        if (res.ok) adopt(res.version);
        void refresh();
      });
    }
  }, [derived.levelIndex, session.level_index, session.status, session.version, session.id, adopt, refresh]);

  const isFinished = session.status === "finished";
  const isRunning = session.status === "running";
  const status = STATUS_META[session.status];
  const conn = CONNECTION_META[connectionState] ?? CONNECTION_META.connecting;
  const displayUrl = `/timer/${session.id}`;

  // Jump confirmation is a single controlled dialog reused by prev / next / list.
  const [jumpTarget, setJumpTarget] = useState<number | null>(null);
  const [levelListOpen, setLevelListOpen] = useState(false);

  // Serialize clock actions — one in flight at a time, adopting the bumped
  // version between clicks. busyRef guards re-entry without a stale closure.
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<TimerActionResult>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await fn();
      if (reportError(res) && res.ok) adopt(res.version);
      // Reflect the action immediately — never depend on the realtime echo
      // (a still-connecting or dropped socket would leave the UI stale until
      // the next poll). Also resyncs after a conflict.
      void refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function toggleClock() {
    void run(() =>
      isRunning ? pauseTimer(session.id, versionRef.current) : startTimer(session.id, versionRef.current),
    );
  }
  function nudge(deltaSec: number) {
    void run(() => adjustTime(session.id, versionRef.current, deltaSec));
  }
  async function confirmJump() {
    if (jumpTarget == null) return;
    const target = jumpTarget;
    setJumpTarget(null);
    await run(() => jumpToLevel(session.id, versionRef.current, target));
  }

  const canPrev = !isFinished && derived.levelIndex > 0;
  const canNext = !isFinished && derived.levelIndex < session.structure.length - 1;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link href="/admin/timers">← 타이머 목록</Link>
        </Button>
      </div>

      {/* Live status header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{session.title}</CardTitle>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <span className={cn("size-2 rounded-full", conn.dot)} aria-hidden />
                {conn.label}
              </span>
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs"
              >
                <ExternalLink className="size-3" aria-hidden />
                디스플레이 열기
                <span className="sr-only">(새 창)</span>
              </a>
              <CopyDisplayUrl id={session.id} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <div>
              <p className="text-muted-foreground text-xs">
                {derived.isBreak
                  ? `브레이크${derived.row.name ? ` · ${derived.row.name}` : ""}`
                  : `레벨 ${derived.displayLevelNo ?? "—"}`}
              </p>
              <p className="text-gold text-6xl font-bold tabular-nums leading-none">
                {formatClock(derived.remainingSec)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">블라인드</p>
              <p className="text-foreground text-lg font-semibold tabular-nums">
                {derived.isBreak ? "—" : blindsLabel(derived.row)}
              </p>
              <p className="text-muted-foreground text-xs">
                {derived.regOpen ? "레지 오픈" : "레지 마감"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">다음 레벨</p>
              <p className="text-foreground text-sm tabular-nums">
                {derived.nextLevelRow ? blindsLabel(derived.nextLevelRow) : "마지막 레벨"}
              </p>
              {derived.timeToNextBreakSec != null && (
                <p className="text-muted-foreground text-xs tabular-nums">
                  다음 브레이크까지 {formatClock(derived.timeToNextBreakSec)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clock controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>클록 제어</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={toggleClock} disabled={isFinished || busy} className="min-w-28">
              {isRunning ? <Pause aria-hidden /> : <Play aria-hidden />}
              {isRunning ? "일시정지" : "시작"}
            </Button>
            <Separator orientation="vertical" className="mx-1 h-8" />
            <Button type="button" variant="outline" onClick={() => nudge(60)} disabled={isFinished || busy}>
              <Plus aria-hidden />1분
            </Button>
            <Button type="button" variant="outline" onClick={() => nudge(-60)} disabled={isFinished || busy}>
              <Minus aria-hidden />1분
            </Button>
            <SetRemainingForm
              disabled={isFinished || busy}
              maxSec={derived.row.duration_min * 60}
              onSubmit={(sec) => run(() => setRemaining(session.id, versionRef.current, sec))}
            />
            <Separator orientation="vertical" className="mx-1 h-8" />
            <Button
              type="button"
              variant="outline"
              onClick={() => setJumpTarget(derived.levelIndex - 1)}
              disabled={!canPrev}
            >
              <ChevronLeft aria-hidden />이전 레벨
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setJumpTarget(derived.levelIndex + 1)}
              disabled={!canNext}
            >
              다음 레벨<ChevronRight aria-hidden />
            </Button>
            <Popover open={levelListOpen} onOpenChange={setLevelListOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" disabled={isFinished}>
                  <ListOrdered aria-hidden />레벨 이동
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-h-80 w-64 overflow-y-auto p-1">
                <ul className="space-y-0.5">
                  {session.structure.map((row, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          setLevelListOpen(false);
                          setJumpTarget(i);
                        }}
                        className={cn(
                          "hover:bg-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
                          i === derived.levelIndex && "bg-muted text-foreground font-medium",
                        )}
                      >
                        <span>
                          {row.type === "break"
                            ? `브레이크${row.name ? ` · ${row.name}` : ""}`
                            : `레벨 ${row.level_no ?? "—"}`}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {row.type === "break" ? `${row.duration_min}분` : `${chipText(row.sb)}/${chipText(row.bb)}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={jumpTarget != null} onOpenChange={(o) => !o && setJumpTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>레벨을 이동합니다</AlertDialogTitle>
            <AlertDialogDescription>
              현재 레벨의 경과 시간이 초기화됩니다. 계속할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmJump}>계속</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CountersCard session={session} currentBB={derived.row.bb} versionRef={versionRef} adopt={adopt} refresh={refresh} />
      <MetaCard session={session} versionRef={versionRef} adopt={adopt} refresh={refresh} />
      <StructureCard session={session} versionRef={versionRef} adopt={adopt} refresh={refresh} />
      <FinishCard session={session} versionRef={versionRef} adopt={adopt} refresh={refresh} />
    </div>
  );
}

// --------------------------------------------------------------------------
// Exact-time entry ("put 10:00 back on the clock" after a ruling)
// --------------------------------------------------------------------------
function SetRemainingForm({
  disabled,
  maxSec,
  onSubmit,
}: {
  disabled: boolean;
  maxSec: number;
  onSubmit: (sec: number) => void;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const m = /^(\d{1,3}):([0-5]?\d)$/.exec(value.trim());
    const sec = m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
    if (!Number.isFinite(sec)) {
      toast.error("MM:SS 형식으로 입력하세요 (예: 10:00)");
      return;
    }
    if (sec > maxSec) {
      toast.error(`이 레벨의 최대 시간은 ${formatClock(maxSec)}입니다`);
      return;
    }
    onSubmit(sec);
    setValue("");
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        aria-label="남은 시간 설정 (MM:SS)"
        placeholder="MM:SS"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.code === "Enter" || e.code === "NumpadEnter") {
            e.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
        className="w-24 text-center tabular-nums"
        inputMode="numeric"
      />
      <Button type="button" variant="outline" onClick={submit} disabled={disabled || value.trim() === ""}>
        시간 설정
      </Button>
    </div>
  );
}

// --------------------------------------------------------------------------
// Copy display URL (header)
// --------------------------------------------------------------------------
function CopyDisplayUrl({ id }: { id: string }) {
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/timer/${id}`);
      toast.success("디스플레이 URL이 복사되었습니다");
    } catch {
      toast.error("복사에 실패했습니다");
    }
  }
  return (
    <Button type="button" variant="outline" size="xs" onClick={onCopy}>
      URL 복사
    </Button>
  );
}

// --------------------------------------------------------------------------
// Counters
// --------------------------------------------------------------------------
interface VersionProps {
  /** Latest known version, shared with the root — actions adopt bumps into it. */
  versionRef: React.RefObject<number>;
  adopt: (v?: number) => void;
  /** Immediate refetch after a mutation — see useTimerSession.refresh. */
  refresh: () => Promise<void>;
}

const CountersCard = memo(function CountersCard({
  session,
  currentBB,
  versionRef,
  adopt,
  refresh,
}: {
  session: TimerSession;
  currentBB: number | string;
} & VersionProps) {
  const [entries, setEntries] = useState(session.entries);
  const [players, setPlayers] = useState(session.players);
  const dirtyRef = useRef(false);

  // Pull realtime updates in only when the operator isn't mid-edit.
  useEffect(() => {
    if (dirtyRef.current) return;
    setEntries(session.entries);
    setPlayers(session.players);
  }, [session.entries, session.players]);

  // Debounced persist. Clears the dirty flag ONLY on success so a failed save
  // never lets the next realtime sync silently overwrite the operator's edit;
  // it stays pending and retries when a fresh version arrives.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = window.setTimeout(async () => {
      const res = await setCounts(session.id, versionRef.current, entries, players);
      if (res.ok) {
        adopt(res.version);
        dirtyRef.current = false;
        void refresh();
      } else if (res.error !== "conflict") {
        // Validation errors are surfaced; conflicts self-heal via resync+retry.
        toast.error(res.error);
        dirtyRef.current = false;
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [entries, players, session.id, session.version, versionRef, adopt, refresh]);

  function changeEntries(n: number) {
    const v = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
    dirtyRef.current = true;
    setEntries(v);
    if (players > v) setPlayers(v); // survivors can never exceed entries
  }
  function changePlayers(n: number) {
    const v = Math.max(0, Math.min(entries, Math.floor(Number.isFinite(n) ? n : 0)));
    dirtyRef.current = true;
    setPlayers(v);
  }

  const preview: TimerSession = { ...session, entries, players };
  const chips = totalChips(preview);
  const avg = avgStack(preview);
  const avgBB = avgStackBB(preview, currentBB);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>엔트리 / 생존</CardTitle>
        <CardDescription>변경 후 자동 저장됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-8">
          <Stepper label="총 엔트리" value={entries} onChange={changeEntries} />
          <Stepper label="생존 인원" value={players} onChange={changePlayers} max={entries} />
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">평균 스택</p>
            <p className="text-foreground text-lg font-semibold tabular-nums">
              {avg != null ? formatNum(avg) : "—"}
              {avgBB != null && <span className="text-muted-foreground ml-1 text-sm">({avgBB} BB)</span>}
            </p>
            <p className="text-muted-foreground text-xs tabular-nums">총 칩 {formatNum(chips)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

function Stepper({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value - 1)}
          disabled={value <= 0}
          aria-label={`${label} 감소`}
        >
          <Minus aria-hidden />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 text-center tabular-nums"
          min={0}
          max={max}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value + 1)}
          disabled={max != null && value >= max}
          aria-label={`${label} 증가`}
        >
          <Plus aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Meta
// --------------------------------------------------------------------------
const MetaCard = memo(function MetaCard({
  session,
  versionRef,
  adopt,
  refresh,
}: { session: TimerSession } & VersionProps) {
  const [title, setTitle] = useState(session.title);
  const [startingStack, setStartingStack] = useState<string>(session.starting_stack?.toString() ?? "");
  const [regCloseLevel, setRegCloseLevel] = useState<string>(session.reg_close_level?.toString() ?? "");
  const [prizes, setPrizes] = useState<TimerPrize[]>(session.prizes);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    setTitle(session.title);
    setStartingStack(session.starting_stack?.toString() ?? "");
    setRegCloseLevel(session.reg_close_level?.toString() ?? "");
    setPrizes(session.prizes);
  }, [session.title, session.starting_stack, session.reg_close_level, session.prizes]);

  function touch() {
    dirtyRef.current = true;
  }
  function setPrize(i: number, patch: Partial<TimerPrize>) {
    touch();
    setPrizes((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addPrize() {
    touch();
    setPrizes((ps) => [...ps, { place: ps.length + 1, amount: "" }]);
  }
  function removePrize(i: number) {
    touch();
    setPrizes((ps) => ps.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    const res = await updateTimerMeta(session.id, versionRef.current, {
      title: title.trim(),
      startingStack: startingStack.trim() === "" ? null : Number(startingStack),
      regCloseLevel: regCloseLevel.trim() === "" ? null : Number(regCloseLevel),
      prizes: prizes.map((p) => ({ place: Math.floor(p.place), amount: p.amount })),
    });
    setSaving(false);
    if (reportError(res)) {
      if (res.ok) adopt(res.version);
      dirtyRef.current = false;
      toast.success("저장되었습니다");
      void refresh();
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>대회 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="timer-title">제목</Label>
            <Input
              id="timer-title"
              value={title}
              onChange={(e) => {
                touch();
                setTitle(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timer-stack">스타팅 스택</Label>
            <Input
              id="timer-stack"
              type="number"
              inputMode="numeric"
              value={startingStack}
              onChange={(e) => {
                touch();
                setStartingStack(e.target.value);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timer-reg">레지 마감 레벨</Label>
            <Input
              id="timer-reg"
              type="number"
              inputMode="numeric"
              value={regCloseLevel}
              onChange={(e) => {
                touch();
                setRegCloseLevel(e.target.value);
              }}
            />
            <p className="text-muted-foreground text-xs">
              {regCloseLevel.trim() === "" ? "마감 없음" : `레벨 ${regCloseLevel} 종료 시 마감`}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>상금</Label>
          <p className="text-muted-foreground text-xs">디스플레이에는 순위 기준 상위 4개까지 표시됩니다.</p>
          <div className="space-y-2">
            {prizes.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  aria-label={`${i + 1}번째 순위`}
                  value={p.place}
                  onChange={(e) => setPrize(i, { place: Number(e.target.value) })}
                  className="w-20 tabular-nums"
                  min={1}
                />
                <span className="text-muted-foreground text-sm">위</span>
                <Input
                  aria-label={`${i + 1}번째 금액`}
                  value={p.amount}
                  onChange={(e) => setPrize(i, { amount: e.target.value })}
                  placeholder="금액 (예: 1,000,000원)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removePrize(i)}
                  aria-label="상금 삭제"
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPrize}>
            <Plus aria-hidden />상금 추가
          </Button>
        </div>

        <div>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// --------------------------------------------------------------------------
// Structure
// --------------------------------------------------------------------------
type StructRow = TimerLevel & { key: string };

let structKeySeq = 0;
function withKeys(structure: TimerLevel[]): StructRow[] {
  return structure.map((r) => ({ ...r, key: `s${structKeySeq++}` }));
}

const StructureCard = memo(function StructureCard({
  session,
  versionRef,
  adopt,
  refresh,
}: { session: TimerSession } & VersionProps) {
  const [rows, setRows] = useState<StructRow[]>(() => withKeys(session.structure));
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

  // Once the tournament has started, rows before the current level are locked:
  // inserting/deleting there would shift level_index onto a different row and
  // jump the live clock's blinds (server enforces the same rule).
  const started = session.status === "running" || session.level_index > 0 || session.elapsed_offset_sec > 0;
  const lockedBefore = started ? session.level_index : 0;

  useEffect(() => {
    if (dirtyRef.current) return;
    setRows(withKeys(session.structure));
  }, [session.structure]);

  function touch() {
    dirtyRef.current = true;
  }
  function update(key: string, patch: Partial<StructRow>) {
    touch();
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function remove(key: string) {
    touch();
    setRows((rs) => rs.filter((r) => r.key !== key));
  }
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    touch();
    setRows((rs) => {
      const next = [...rs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addRow(type: "level" | "break") {
    touch();
    setRows((rs) => [
      ...rs,
      { key: `s${structKeySeq++}`, type, level_no: null, name: null, sb: 0, bb: 0, ante: 0, duration_min: 20 },
    ]);
  }

  // Level numbers follow row order; breaks are skipped.
  let lv = 0;
  const numbered = rows.map((r) => (r.type === "level" ? { r, no: ++lv } : { r, no: null as number | null }));

  async function save() {
    setSaving(true);
    let n = 0;
    const structure: TimerLevel[] = rows.map((r) =>
      r.type === "level"
        ? { type: "level", level_no: ++n, name: null, sb: r.sb, bb: r.bb, ante: r.ante, duration_min: r.duration_min }
        : { type: "break", level_no: null, name: r.name, sb: 0, bb: 0, ante: 0, duration_min: r.duration_min },
    );
    const res = await updateStructure(session.id, versionRef.current, structure);
    setSaving(false);
    if (reportError(res)) {
      if (res.ok) adopt(res.version);
      dirtyRef.current = false;
      toast.success("스트럭처를 저장했습니다");
      void refresh();
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>블라인드 스트럭처</CardTitle>
        {started && (
          <CardDescription className="text-warning">
            완료된 레벨(현재 레벨 이전)은 잠겨 있습니다. 현재·이후 레벨만 수정할 수 있습니다.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          {numbered.map(({ r, no }, idx) => {
            const locked = idx < lockedBefore;
            return (
              <div
                key={r.key}
                className={cn(
                  "border-border bg-card/60 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2",
                  locked && "opacity-60",
                )}
              >
                <div className="flex shrink-0 flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0 || idx <= lockedBefore}
                    aria-label="위로 이동"
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(idx, 1)}
                    disabled={idx === rows.length - 1 || locked}
                    aria-label="아래로 이동"
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-24 shrink-0"
                  onClick={() => update(r.key, { type: r.type === "level" ? "break" : "level" })}
                  disabled={locked}
                >
                  {r.type === "level" ? `레벨 ${no}` : "브레이크"}
                </Button>

                {locked && (
                  <Badge variant="outline" className="shrink-0">
                    완료
                  </Badge>
                )}

                {r.type === "level" ? (
                  <>
                    <ChipField label="SB" value={r.sb} onChange={(v) => update(r.key, { sb: v })} disabled={locked} />
                    <ChipField label="BB" value={r.bb} onChange={(v) => update(r.key, { bb: v })} disabled={locked} />
                    <ChipField label="앤티" value={r.ante} onChange={(v) => update(r.key, { ante: v })} disabled={locked} />
                  </>
                ) : (
                  <Input
                    aria-label="브레이크 이름"
                    placeholder="브레이크명"
                    value={r.name ?? ""}
                    onChange={(e) => update(r.key, { name: e.target.value })}
                    className="w-56"
                    disabled={locked}
                  />
                )}
                <NumField
                  label="분"
                  value={r.duration_min}
                  onChange={(v) => update(r.key, { duration_min: v })}
                  min={1}
                  disabled={locked}
                />

                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  className="ml-auto"
                  onClick={() => remove(r.key)}
                  aria-label="행 삭제"
                  disabled={locked}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => addRow("level")}>
            <Plus aria-hidden />레벨 추가
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addRow("break")}>
            <Plus aria-hidden />브레이크 추가
          </Button>
          <Button type="button" onClick={save} disabled={saving} className="ml-auto">
            {saving ? "저장 중…" : "스트럭처 저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// Chip fields accept free text: digits (with commas) commit as numbers, any
// other text ("PLO") is kept verbatim and shown as-is on the clock.
function ChipField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number | string;
  onChange: (v: number | string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground text-2xs">{label}</span>
      <Input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const compact = raw.trim().replace(/[,\s]/g, "");
          if (compact === "") onChange(0);
          else if (/^\d+$/.test(compact)) onChange(parseInt(compact, 10));
          else onChange(raw);
        }}
        className="w-20 tabular-nums"
        disabled={disabled}
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  min = 0,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground text-2xs">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.floor(Number(e.target.value) || 0)))}
        className="w-20 tabular-nums"
        min={min}
        disabled={disabled}
      />
    </div>
  );
}

// --------------------------------------------------------------------------
// Finish / reopen
// --------------------------------------------------------------------------
function FinishCard({ session, versionRef, adopt, refresh }: { session: TimerSession } & VersionProps) {
  const isFinished = session.status === "finished";

  async function finish() {
    const res = await finishTimer(session.id, versionRef.current);
    if (reportError(res) && res.ok) adopt(res.version);
    void refresh();
  }
  async function reopen() {
    const res = await reopenTimer(session.id, versionRef.current);
    if (reportError(res) && res.ok) {
      adopt(res.version);
      toast.success("타이머를 재개했습니다");
    }
    void refresh();
  }

  if (isFinished) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>종료됨</CardTitle>
          <CardDescription>
            최종 엔트리 {session.entries}명 / 생존 {session.players}명이 이벤트에 기록되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={reopen}>
            <RotateCcw aria-hidden />재개
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-destructive/30">
      <CardHeader>
        <CardTitle>대회 종료</CardTitle>
        <CardDescription>종료 시 최종 엔트리·생존 인원이 이벤트 결과로 기록됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
              타이머 종료
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>타이머를 종료할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                타이머를 종료하고 최종 엔트리 {session.entries}명 / 생존 {session.players}명을 이벤트에 기록합니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={finish}>종료</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
