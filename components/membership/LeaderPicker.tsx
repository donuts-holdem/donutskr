"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LeaderCandidate } from "@/lib/membership/types";

export function LeaderPicker({ candidates, name, prefix, multiple = false, defaultSelected = [] }: {
  candidates: LeaderCandidate[]; name: string; prefix: string; multiple?: boolean; defaultSelected?: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(defaultSelected.filter(id => candidates.some(person => person.id === id)));
  const terms = query.trim().toLocaleLowerCase("ko-KR").split(/\s+/).filter(Boolean);
  const visible = candidates.filter(person => terms.every(term => person.label.toLocaleLowerCase("ko-KR").includes(term)));
  return <div className="space-y-3">
    {selected.map(id => <input key={id} type="hidden" name={name} value={id} />)}
    <div className="space-y-2"><Label htmlFor={`${prefix}-search`}>리더 검색</Label><Input id={`${prefix}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="이름 검색" className="h-11" /></div>
    <p role="status" className="text-xs text-muted-foreground">{visible.length}명 · 선택 {selected.length}명</p>
    <div className="max-h-64 overflow-y-auto rounded-lg border border-border px-4">
      {!visible.length ? <p className="py-5 text-sm text-muted-foreground">검색 결과가 없습니다.</p> : visible.map(person => <div key={person.id} className="flex min-h-11 items-start gap-3 py-3">
        <Checkbox id={`${prefix}-${person.id}`} checked={selected.includes(person.id)} onCheckedChange={checked => setSelected(previous => checked
          ? multiple ? [...previous.filter(id => id !== person.id), person.id] : [person.id]
          : previous.filter(id => id !== person.id))} />
        <Label htmlFor={`${prefix}-${person.id}`} className="min-w-0 flex-1 break-words leading-relaxed">{person.label}{person.is_admin ? " / 관리자" : " / 정회원"}</Label>
      </div>)}
    </div>
  </div>;
}
