"use client";

import { useId, useState } from "react";
import { Area, Field, Pick } from "@/components/domains/Fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pokerCategoryLabels, pokerFormatLabels, pokerPositions } from "@/lib/learning/spot";
import type { PokerSpot } from "@/lib/learning/types";

export function PokerSpotFields({ initial, kind }: { initial?: PokerSpot | null; kind: "GENERAL" | "GTO" }) {
  const id = useId();
  const [selectedCategory, setCategory] = useState(initial?.category ?? "NONE");
  const category = kind === "GTO" && selectedCategory === "NONE" ? "PREFLOP" : selectedCategory;
  return <fieldset className="space-y-5 rounded-card border border-border p-4">
    <legend className="px-2 text-sm font-semibold">포커 상황</legend>
    <div className="space-y-2"><Label htmlFor={id + "-category"}>상황 단계</Label><Select name="spot_category" value={category} onValueChange={setCategory}><SelectTrigger id={id + "-category"} className="min-h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>
      {kind === "GENERAL" && <SelectItem value="NONE">일반 개념 · 상황 없음</SelectItem>}
      {Object.entries(pokerCategoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
    </SelectContent></Select></div>
    {category !== "NONE" && <>
      <div className="grid gap-5 sm:grid-cols-2"><Pick name="spot_format" label="게임 형식" defaultValue={initial?.format ?? "MTT"} options={Object.entries(pokerFormatLabels).map(([value, label]) => ({ value, label }))} />
        <div className="space-y-2"><Label htmlFor={id + "-players"}>테이블 인원</Label><Input id={id + "-players"} name="spot_players" type="number" min={2} max={10} step={1} defaultValue={initial?.players ?? 6} required className="min-h-11" /></div>
        <div className="space-y-2"><Label htmlFor={id + "-stack"}>유효 스택 · BB</Label><Input id={id + "-stack"} name="spot_stack_bb" type="number" min={0.01} max={10000} step="any" defaultValue={initial?.stack_bb} required className="min-h-11" /></div>
        <div className="space-y-2"><Label htmlFor={id + "-pot"}>현재 팟 · BB</Label><Input id={id + "-pot"} name="spot_pot_bb" type="number" min={0.01} max={1000000} step="any" defaultValue={initial?.pot_bb ?? undefined} required={["FLOP", "TURN", "RIVER"].includes(category)} className="min-h-11" /></div>
        <Pick name="spot_hero_position" label="내 포지션" defaultValue={initial?.hero_position ?? "BTN"} options={pokerPositions.map(value => ({ value, label: value }))} />
        <Pick name="spot_villain_position" label="상대 포지션" defaultValue={initial?.villain_position ?? "NONE"} options={[{ value: "NONE", label: "상대 지정 없음" }, ...pokerPositions.map(value => ({ value, label: value }))]} />
        <Field name="spot_hero_hand" label="내 핸드" defaultValue={initial?.hero_hand.join(" ")} maxLength={24} />
        {category !== "PREFLOP" && <Field name="spot_board" label="보드" defaultValue={initial?.board.join(" ")} required={category !== "ICM"} maxLength={60} />}
      </div>
      <p className="text-xs text-muted-foreground">카드 입력: As Kh · 스페이드 s, 하트 h, 다이아몬드 d, 클로버 c</p>
      <Area name="spot_action_history" label="이전 액션" defaultValue={initial?.action_history} />
    </>}
  </fieldset>;
}
