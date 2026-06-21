"use client";
import { useState } from "react";
import type { BlindRow, BlindStructure } from "@/lib/types";
import { duplicateStructure } from "@/app/admin/actions/blindStructures";

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
}

export function BlindStructureEditor({ structureId, initialRows, action, structures = [], initialName = "" }: Props) {
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

  const inputCls = "bg-white/[0.08] border border-white/15 text-ink rounded px-2 py-1 text-sm";
  const btnCls = "bg-white/[0.08] border border-white/15 text-ink rounded px-2 py-1 text-xs cursor-pointer hover:bg-white/[0.14]";

  return (
    <>
    <form action={action} style={{ display: "grid", gap: "1.25rem" }}>
      <input type="hidden" name="structure_id" value={structureId} />
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />

      {/* Name */}
      <div>
        <label style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)", fontSize: "0.875rem" }}>스트럭처 이름</label>
        <input name="name" type="text" defaultValue={initialName} required
          className={inputCls} style={{ width: "100%", maxWidth: "400px" }} />
      </div>

      {/* Add buttons */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setRows(rs => [...rs, makeLevel()])} className={btnCls}>레벨 추가</button>
        <button type="button" onClick={() => setRows(rs => [...rs, makeBreak()])} className={btnCls}>브레이크 추가</button>
        <button type="button" onClick={() => setRows(rs => [...rs, makeStage()])} className={btnCls}>스테이지 추가</button>
      </div>

      {/* Rows */}
      {rows.length > 0 && (
        <div style={{ display: "grid", gap: "8px" }}>
          {rows.map((row, idx) => (
            <div key={row.key} className="bg-white/5 border border-white/10 rounded-lg" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ color: "var(--muted-2)", fontSize: "0.75rem", width: "50px", flexShrink: 0 }}>
                {row.row_type === "level" ? "레벨" : row.row_type === "break" ? "브레이크" : "스테이지"}
              </span>

              {row.row_type === "level" && (
                <>
                  <input type="number" placeholder="Lv" value={row.level_no ?? ""} onChange={e => update(row.key, { level_no: e.target.value ? Number(e.target.value) : undefined })}
                    className={inputCls} style={{ width: "48px" }} />
                  <input type="text" placeholder="SB" value={row.sb} onChange={e => update(row.key, { sb: e.target.value })}
                    className={inputCls} style={{ width: "70px" }} />
                  <input type="text" placeholder="BB" value={row.bb} onChange={e => update(row.key, { bb: e.target.value })}
                    className={inputCls} style={{ width: "70px" }} />
                  <input type="text" placeholder="Ante" value={row.ante} onChange={e => update(row.key, { ante: e.target.value })}
                    className={inputCls} style={{ width: "80px" }} />
                  <input type="number" placeholder="분" value={row.duration ?? ""} onChange={e => update(row.key, { duration: e.target.value ? Number(e.target.value) : undefined })}
                    className={inputCls} style={{ width: "60px" }} />
                </>
              )}

              {row.row_type === "break" && (
                <>
                  <input type="text" placeholder="브레이크명" value={row.break_name} onChange={e => update(row.key, { break_name: e.target.value })}
                    className={inputCls} style={{ width: "160px" }} />
                  <input type="number" placeholder="분" value={row.break_minutes ?? ""} onChange={e => update(row.key, { break_minutes: e.target.value ? Number(e.target.value) : undefined })}
                    className={inputCls} style={{ width: "60px" }} />
                </>
              )}

              {row.row_type === "stage" && (
                <input type="text" placeholder="스테이지 메모" value={row.stage_note} onChange={e => update(row.key, { stage_note: e.target.value })}
                  className={inputCls} style={{ width: "260px" }} />
              )}

              <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                <button type="button" onClick={() => moveUp(idx)} className={btnCls} aria-label="위로">↑</button>
                <button type="button" onClick={() => moveDown(idx)} className={btnCls} aria-label="아래로">↓</button>
                <button type="button" onClick={() => remove(row.key)}
                  className="bg-danger/15 border border-danger/40 text-danger rounded px-2 py-1 text-xs cursor-pointer">
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button type="submit" className="bg-gold text-bg" style={{ padding: "8px 20px", borderRadius: "6px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "0.875rem" }}>
          저장
        </button>
      </div>
      </form>

      {/* Duplicate — separate form (creates an independent copy, never edits the source) */}
      {structures.length > 0 && (
        <form action={duplicateStructure} style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "1.25rem" }}>
          <input type="hidden" name="source_id" value={cloneTarget} />
          <select value={cloneTarget} onChange={e => setCloneTarget(e.target.value)}
            className="bg-white/[0.08] border border-white/15 text-ink rounded px-2 py-1 text-sm">
            <option value="">-- 복제할 스트럭처 선택 --</option>
            {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="submit" disabled={!cloneTarget}
            className="bg-white/[0.08] border border-white/15 text-ink rounded px-3 py-1 text-sm disabled:opacity-40 cursor-pointer">
            복사본 생성
          </button>
        </form>
      )}
    </>
  );
}
