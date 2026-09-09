"use client";

import { useState } from "react";
import { rescheduleClassSessions } from "@/app/classes/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatSessionDate, parseSeoulDateTime, toSeoulInput } from "@/lib/classes/format";
import type { ClassSession } from "@/lib/classes/types";

export function SessionScheduleForm({ session, sessions }: { session: ClassSession; sessions: ClassSession[] }) {
  const [value, setValue] = useState(toSeoulInput(session.scheduled_at));
  const [moveFuture, setMoveFuture] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const targets = moveFuture ? sessions.filter(item => item.session_number >= session.session_number && item.status === "SCHEDULED" && !item.cancelled_at) : [session];
  let delta: number | null = null;
  try { delta = Date.parse(parseSeoulDateTime(value)) - Date.parse(session.scheduled_at); } catch { /* Keep the preview empty until the date is valid. */ }
  return <ActionForm action={rescheduleClassSessions} label={moveFuture ? "확인한 예정 회차 함께 이동" : "이 회차 일정 변경"}>
    <input type="hidden" name="class_id" value={session.class_id} /><input type="hidden" name="session_id" value={session.id} />
    <input type="hidden" name="expected" value={JSON.stringify(Object.fromEntries(targets.map(item => [item.id, item.revision])))} />
    <div className="space-y-2"><Label htmlFor={`${session.id}-new-date`}>변경할 날짜 · 한국 시간</Label><Input id={`${session.id}-new-date`} type="datetime-local" name="scheduled_at" required value={value} className="h-11" onChange={event => { setValue(event.target.value); setConfirmed(false); }} /></div>
    {session.status === "SCHEDULED" && <div className="flex items-start gap-3"><Checkbox id={`${session.id}-future`} name="move_future" checked={moveFuture} onCheckedChange={checked => { setMoveFuture(checked === true); setConfirmed(false); }} /><Label htmlFor={`${session.id}-future`} className="leading-relaxed">이후 번호의 예정 회차도 같은 시간 차이만큼 이동</Label></div>}
    <p className="text-sm leading-relaxed text-muted-foreground">기본값은 이 회차만 변경입니다. 함께 이동하더라도 진행 중·완료·취소된 회차는 제외합니다.</p>
    {delta !== null && <div className="space-y-3 rounded-lg border border-border p-4" aria-label="일정 변경 미리보기"><p className="text-sm font-semibold">변경 대상 {targets.length}회차</p><ul className="max-h-72 divide-y divide-border overflow-y-auto">{targets.map(item => <li key={item.id} className="py-3 text-sm"><p className="font-semibold">{item.session_number}회차</p><p className="mt-2 text-muted-foreground">변경 전: {formatSessionDate(item.scheduled_at)}</p><p className="mt-1 text-gold">변경 후: {formatSessionDate(new Date(Date.parse(item.scheduled_at) + delta!).toISOString())}</p></li>)}</ul></div>}
    <div className="space-y-2"><Label htmlFor={`${session.id}-schedule-reason`}>일정 변경 사유</Label><Textarea id={`${session.id}-schedule-reason`} name="reason" maxLength={500} required /></div>
    {moveFuture && <div className="flex items-start gap-3"><Checkbox id={`${session.id}-shift-confirm`} name="confirm_shift" checked={confirmed} required onCheckedChange={checked => setConfirmed(checked === true)} /><Label htmlFor={`${session.id}-shift-confirm`} className="leading-relaxed">위 회차들의 변경 전·후 날짜를 확인했습니다.</Label></div>}
  </ActionForm>;
}
