"use client";
import { Fragment, useState } from "react";
import { GripVertical } from "lucide-react";
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
  // Drag-and-drop reordering state.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overGap, setOverGap] = useState<number | null>(null);

  function update(key: string, patch: Partial<LocalRow>) {
    setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
  }
  function remove(key: string) { setRows(rs => rs.filter(r => r.key !== key)); }

  // Insert a new level row at a specific position (the gap '+' action).
  function insertAt(index: number) {
    setRows(rs => { const a = [...rs]; a.splice(index, 0, makeLevel()); return a; });
  }

  // Move the dragged row into the gap at gapIndex.
  function moveToGap(gapIndex: number) {
    setRows(rs => {
      if (!dragKey) return rs;
      const from = rs.findIndex(r => r.key === dragKey);
      if (from === -1) return rs;
      const a = [...rs];
      const [item] = a.splice(from, 1);
      const insertIndex = from < gapIndex ? gapIndex - 1 : gapIndex;
      a.splice(insertIndex, 0, item);
      return a;
    });
    setDragKey(null);
    setOverGap(null);
  }

  // Level numbers follow row order: the Nth level row is level N (breaks/stages skipped).
  const levelNoByKey = new Map<string, number>();
  let lvCount = 0;
  for (const r of rows) if (r.row_type === "level") levelNoByKey.set(r.key, ++lvCount);
  const serializedRows = rows.map(r =>
    r.row_type === "level" ? { ...r, level_no: levelNoByKey.get(r.key) ?? null } : r,
  );

  // A drop / insert zone between rows. Shows a white line + '+' on hover or while a
  // row is dragged over it; clicking '+' inserts a new level at that position.
  const renderGap = (index: number) => (
    <div
      className={cn("group relative", dragKey ? "h-7" : "h-3")}
      onDragOver={(e) => { if (dragKey) { e.preventDefault(); setOverGap(index); } }}
      onDragLeave={() => setOverGap((g) => (g === index ? null : g))}
      onDrop={(e) => { e.preventDefault(); moveToGap(index); }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center gap-2 px-1 transition-opacity",
          overGap === index ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <span className="h-px flex-1 bg-white/70" />
        <button
          type="button"
          aria-label="여기에 레벨 추가"
          onClick={() => insertAt(index)}
          className="pointer-events-auto flex size-5 items-center justify-center rounded-full border border-white/50 bg-card text-sm leading-none text-white transition-colors hover:bg-white hover:text-bg"
        >
          +
        </button>
        <span className="h-px flex-1 bg-white/70" />
      </div>
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
          <div className="flex flex-col">
            {rows.map((row, idx) => (
              <Fragment key={row.key}>
                {renderGap(idx)}
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 px-3.5 py-2.5",
                    dragKey === row.key && "opacity-50",
                  )}
                >
                  <span
                    draggable
                    onDragStart={(e) => { setDragKey(row.key); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragKey(null); setOverGap(null); }}
                    title="드래그하여 순서 변경"
                    aria-label="드래그하여 순서 변경"
                    className="text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
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
                      <Input placeholder="브레이크명" value={row.break_name} onChange={e => update(row.key, { break_name: e.target.value })} className="w-40" />
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
