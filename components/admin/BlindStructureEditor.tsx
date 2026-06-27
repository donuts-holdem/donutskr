"use client";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Plus } from "lucide-react";
import type { BlindRow, BlindStructure } from "@/lib/types";
import { duplicateStructure } from "@/app/admin/actions/blindStructures";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// useLayoutEffect on the server warns; fall back to useEffect there (SSR pass
// only — the FLIP animation it drives is client-only anyway).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type LocalRow = {
  key: string;
  row_type: "level" | "break" | "stage";
  level_no: number | undefined;
  sb: string; bb: string; ante: string; duration: number | undefined;
  break_name: string; break_minutes: number | undefined;
  stage_note: string;
};

function makeLevel(): LocalRow {
  return { key: String(Date.now() + Math.random()), row_type: "level", level_no: undefined, sb: "", bb: "", ante: "", duration: undefined, break_name: "", break_minutes: undefined, stage_note: "" };
}
function makeBreak(): LocalRow {
  return { key: String(Date.now() + Math.random()), row_type: "break", level_no: undefined, sb: "", bb: "", ante: "", duration: undefined, break_name: "", break_minutes: undefined, stage_note: "" };
}
function makeStage(): LocalRow {
  return { key: String(Date.now() + Math.random()), row_type: "stage", level_no: undefined, sb: "", bb: "", ante: "", duration: undefined, break_name: "", break_minutes: undefined, stage_note: "" };
}

function fromBlindRow(r: BlindRow): LocalRow {
  return {
    key: r.id || String(Date.now() + Math.random()),
    row_type: r.row_type,
    level_no: r.level_no ?? undefined,
    sb: r.sb ?? "", bb: r.bb ?? "", ante: r.ante ?? "",
    duration: r.duration ?? undefined,
    break_name: r.break_name ?? "", break_minutes: r.break_minutes ?? undefined,
    stage_note: r.stage_note ?? "",
  };
}

interface Props {
  structureId: string;
  initialRows: BlindRow[];
  action: (fd: FormData) => void | Promise<void>;
  structures?: BlindStructure[];
  initialName?: string;
  initialEventType?: string | null;
}

export function BlindStructureEditor({ structureId, initialRows, action, structures = [], initialName = "", initialEventType = "" }: Props) {
  const [rows, setRows] = useState<LocalRow[]>(() => initialRows.map(fromBlindRow));
  const [cloneTarget, setCloneTarget] = useState("");
  // Drag-and-drop reordering state. The dragged row is moved through `rows` live
  // (so other rows shift to open a slot); no separate drop-line needed.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  // Previous on-screen tops per row key, for FLIP animation of the shift.
  const prevTops = useRef<Map<string, number>>(new Map());

  function update(key: string, patch: Partial<LocalRow>) {
    setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
  }
  function remove(key: string) { setRows(rs => rs.filter(r => r.key !== key)); }

  // Insert a new level row at a specific position (the gap '+' action).
  function insertAt(index: number) {
    setRows(rs => { const a = [...rs]; a.splice(index, 0, makeLevel()); return a; });
  }

  // Pointer-based drag reordering with live "make space" feedback. Native HTML5
  // drag wouldn't even start from the icon handle here, so we drive the gesture
  // ourselves: press the handle → as the pointer moves we splice the dragged row
  // into its new slot in real time, so the surrounding rows shift apart to reveal
  // where it will land → release just keeps the order. Mouse, pen, and touch.
  function beginDrag(e: ReactPointerEvent, key: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragKey(key);

    const onMove = (ev: PointerEvent) => {
      const container = rowsRef.current;
      if (!container) return;
      // Insertion index = how many OTHER rows sit above the pointer. Measuring
      // only the non-dragged rows keeps the result monotonic in cursor-Y, so the
      // slot never oscillates as the dragged row is spliced around.
      // Use offset geometry (immune to the in-flight FLIP transforms below) so a
      // fast drag never reads interpolated mid-animation positions and thrashes.
      // pointerY and each row midpoint are expressed relative to the container top.
      const cRect = container.getBoundingClientRect();
      const pointerY = ev.clientY - cRect.top;
      const els = Array.from(container.querySelectorAll<HTMLElement>("[data-row-key]"));
      let count = 0;
      for (const el of els) {
        if (el.dataset.rowKey === key) continue;
        const mid = el.offsetTop - container.offsetTop + el.offsetHeight / 2;
        if (pointerY > mid) count++;
      }
      setRows((rs) => {
        const item = rs.find((r) => r.key === key);
        if (!item) return rs;
        const others = rs.filter((r) => r.key !== key);
        const next = [...others.slice(0, count), item, ...others.slice(count)];
        if (next.every((r, i) => r.key === rs[i].key)) return rs; // no change
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragKey(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // FLIP: smoothly slide rows from their previous position to the new one when the
  // order changes mid-drag, so the "space opening up" reads as motion, not a snap.
  useIsoLayoutEffect(() => {
    const container = rowsRef.current;
    if (!container) return;
    const els = Array.from(container.querySelectorAll<HTMLElement>("[data-row-key]"));
    // offsetTop is layout-only (unaffected by the transforms we set below), so
    // measuring it mid-animation never compounds — this is the fast-drag fix.
    const tops = new Map<string, number>();
    for (const el of els) tops.set(el.dataset.rowKey ?? "", el.offsetTop);

    if (dragKey) {
      const moved: HTMLElement[] = [];
      for (const el of els) {
        const k = el.dataset.rowKey ?? "";
        if (k === dragKey) continue;
        const prev = prevTops.current.get(k);
        const next = tops.get(k);
        if (prev !== undefined && next !== undefined && prev !== next) {
          el.style.transition = "none";
          el.style.transform = `translateY(${prev - next}px)`;
          moved.push(el);
        }
      }
      if (moved.length) {
        void container.offsetHeight; // one reflow, then release to animate home
        for (const el of moved) {
          el.style.transition = "transform 160ms ease";
          el.style.transform = "";
        }
      }
    } else {
      // Clear any leftover inline transforms once the gesture ends.
      for (const el of els) { el.style.transform = ""; el.style.transition = ""; }
    }
    prevTops.current = tops;
  });

  // Level numbers follow row order: the Nth level row is level N (breaks/stages skipped).
  const levelNoByKey = new Map<string, number>();
  let lvCount = 0;
  for (const r of rows) if (r.row_type === "level") levelNoByKey.set(r.key, ++lvCount);
  const serializedRows = rows.map(r =>
    r.row_type === "level" ? { ...r, level_no: levelNoByKey.get(r.key) ?? null } : r,
  );

  // The insert affordance between rows: on hover a line + '+' appears, and
  // clicking '+' inserts a new level there. Hidden during a drag — there the
  // shifting rows themselves show where the dragged row will land. The resting
  // zone is intentionally tall (h-5) so the hover line is easy to catch.
  const renderGap = (index: number) => (
    <div className="group relative h-5">
      {!dragKey && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center gap-2 px-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="h-0.5 flex-1 rounded-full bg-white/30" />
          <button
            type="button"
            aria-label="여기에 레벨 추가"
            onClick={() => insertAt(index)}
            className="pointer-events-auto flex size-5 items-center justify-center rounded-full border border-white/40 bg-card text-white transition-colors hover:bg-white hover:text-bg"
          >
            <Plus className="size-3" />
          </button>
          <span className="h-0.5 flex-1 rounded-full bg-white/30" />
        </div>
      )}
    </div>
  );

  return (
    <>
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="structure_id" value={structureId} />
        <input type="hidden" name="rows" value={JSON.stringify(serializedRows)} />

        {/* Name */}
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor="name">스트럭처 이름</Label>
          <Input id="name" name="name" defaultValue={initialName} required />
        </div>

        {/* Event type */}
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor="event_type">이벤트 타입 (예: NLH, NLH / PLO)</Label>
          <Input id="event_type" name="event_type" defaultValue={initialEventType ?? ""} />
        </div>

        {/* Add buttons */}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setRows(rs => [...rs, makeLevel()])}>레벨 추가</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows(rs => [...rs, makeBreak()])}>브레이크 추가</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows(rs => [...rs, makeStage()])}>스테이지 추가</Button>
        </div>

        {/* Rows */}
        {rows.length > 0 && (
          <div ref={rowsRef} className="flex flex-col">
            {rows.map((row, idx) => (
              <Fragment key={row.key}>
                {renderGap(idx)}
                <div
                  data-row-key={row.key}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 px-3.5 py-2.5",
                    dragKey === row.key && "relative z-10 border-white/25 opacity-90 shadow-lg ring-1 ring-white/20",
                  )}
                >
                  <span
                    onPointerDown={(e) => beginDrag(e, row.key)}
                    title="드래그하여 순서 변경"
                    aria-label="드래그하여 순서 변경"
                    className="text-muted-foreground shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  <span className="text-muted-foreground w-[50px] shrink-0 text-xs">
                    {row.row_type === "level" ? "레벨" : row.row_type === "break" ? "브레이크" : "스테이지"}
                  </span>

                  {row.row_type === "level" && (
                    <>
                      <span className="w-14 shrink-0 text-center text-sm font-semibold tabular-nums text-white">
                        {levelNoByKey.get(row.key)}
                      </span>
                      <Input placeholder="SB" value={row.sb} onChange={e => update(row.key, { sb: e.target.value })} className="w-20" />
                      <Input placeholder="BB" value={row.bb} onChange={e => update(row.key, { bb: e.target.value })} className="w-20" />
                      <Input placeholder="Ante" value={row.ante} onChange={e => update(row.key, { ante: e.target.value })} className="w-24" />
                      <Input type="number" placeholder="분" value={row.duration ?? ""} onChange={e => update(row.key, { duration: e.target.value ? Number(e.target.value) : undefined })} className="w-16" />
                    </>
                  )}

                  {row.row_type === "break" && (
                    <>
                      <Input placeholder="브레이크명" value={row.break_name} onChange={e => update(row.key, { break_name: e.target.value })} className="w-96" />
                      <Input type="number" placeholder="분" value={row.break_minutes ?? ""} onChange={e => update(row.key, { break_minutes: e.target.value ? Number(e.target.value) : undefined })} className="w-16" />
                    </>
                  )}

                  {row.row_type === "stage" && (
                    <Input placeholder="스테이지 메모" value={row.stage_note} onChange={e => update(row.key, { stage_note: e.target.value })} className="w-64" />
                  )}

                  <div className="ml-auto flex gap-1">
                    <Button type="button" variant="destructive" size="sm" onClick={() => remove(row.key)}>삭제</Button>
                  </div>
                </div>
              </Fragment>
            ))}
            {renderGap(rows.length)}
          </div>
        )}

        {/* Save */}
        <div>
          <Button type="submit">저장</Button>
        </div>
      </form>

      {/* Duplicate — separate form (creates an independent copy, never edits the source) */}
      {structures.length > 0 && (
        <form action={duplicateStructure} className="mt-5 flex items-center gap-2">
          <input type="hidden" name="source_id" value={cloneTarget} />
          <Select value={cloneTarget || undefined} onValueChange={setCloneTarget}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="-- 복제할 스트럭처 선택 --" />
            </SelectTrigger>
            <SelectContent>
              {structures.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" disabled={!cloneTarget}>복사본 생성</Button>
        </form>
      )}
    </>
  );
}
