"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseSeoulDateTime, toSeoulInput } from "@/lib/classes/format";

export function ClassCreationDates() {
  const nextId = useRef(1);
  const [rows, setRows] = useState([{ id: 0, value: "" }]);
  function addRow() {
    const id = nextId.current++;
    setRows(previous => {
      let value = "";
      try { value = toSeoulInput(new Date(Date.parse(parseSeoulDateTime(previous[previous.length - 1].value)) + 7 * 24 * 60 * 60 * 1000).toISOString()); } catch { /* The new row stays empty until a date is entered. */ }
      return [...previous, { id, value }];
    });
  }
  return <fieldset className="space-y-4">
    <legend className="mb-2 text-sm font-semibold">회차별 실제 날짜 · 한국 시간</legend>
    <p className="text-sm leading-relaxed text-muted-foreground">최소 1회차가 필요하며 최대 횟수는 없습니다. 추가 버튼은 직전 회차의 일주일 뒤를 기본값으로 제안합니다.</p>
    {rows.map((row, index) => <div key={row.id} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 space-y-2"><Label htmlFor={`new-session-${row.id}`}>{index + 1}회차</Label><Input id={`new-session-${row.id}`} type="datetime-local" name="session_at" value={row.value} required className="h-11" onChange={event => setRows(previous => previous.map(item => item.id === row.id ? { ...item, value: event.target.value } : item))} /></div>
      <Button type="button" variant="outline" className="h-11" disabled={rows.length === 1} aria-label={`${index + 1}회차 입력 삭제`} onClick={() => setRows(previous => previous.filter(item => item.id !== row.id))}>제거</Button>
    </div>)}
    <Button type="button" variant="outline" className="h-11" onClick={addRow}>회차 입력 추가</Button>
  </fieldset>;
}
