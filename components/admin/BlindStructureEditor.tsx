"use client";
import { useState } from "react";
import type { BlindRow, BlindStructure } from "@/lib/types";
import { duplicateStructure } from "@/app/admin/actions/blindStructures";
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

  function update(key: string, patch: Partial<LocalRow>) {
    setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r));
  }
  function remove(key: string) { setRows(rs => rs.filter(r => r.key !== key)); }
  function moveUp(idx: number) {
    if (idx === 0) return;
    setRows(rs => { const a = [...rs]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  }
  function moveDown(idx: number) {
    setRows(rs => { if (idx >= rs.length - 1) return rs; const a = [...rs]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; });
  }

  return (
    <>
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="structure_id" value={structureId} />
        <input type="hidden" name="rows" value={JSON.stringify(rows)} />

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
          <div className="flex flex-col gap-2">
            {rows.map((row, idx) => (
              <div key={row.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 px-3.5 py-2.5">
                <span className="text-muted-foreground w-[50px] shrink-0 text-xs">
                  {row.row_type === "level" ? "레벨" : row.row_type === "break" ? "브레이크" : "스테이지"}
                </span>

                {row.row_type === "level" && (
                  <>
                    <Input type="number" placeholder="Lv" value={row.level_no ?? ""} onChange={e => update(row.key, { level_no: e.target.value ? Number(e.target.value) : undefined })} className="w-14" />
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
                  <Button type="button" variant="outline" size="icon" onClick={() => moveUp(idx)} aria-label="위로">↑</Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => moveDown(idx)} aria-label="아래로">↓</Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => remove(row.key)}>삭제</Button>
                </div>
              </div>
            ))}
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
