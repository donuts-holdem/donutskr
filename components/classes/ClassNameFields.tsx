"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { suggestClassName, weekdays } from "@/lib/classes/format";
import type { ClassRecord } from "@/lib/classes/types";

export function ClassNameFields({ prefix, course, existingNames = [] }: {
  prefix: string; course?: Pick<ClassRecord, "name" | "weekday" | "start_time">; existingNames?: string[];
}) {
  const [name, setName] = useState(course?.name ?? "");
  const [weekday, setWeekday] = useState(course ? String(course.weekday) : "");
  const [customName, setCustomName] = useState(Boolean(course));
  const suggestion = weekday ? suggestClassName(Number(weekday), existingNames) : "";
  return <>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor={`${prefix}-weekday`}>기본 요일</Label><Select name="weekday" value={weekday} required onValueChange={value => {
        setWeekday(value);
        if (!customName) setName(suggestClassName(Number(value), existingNames));
      }}><SelectTrigger id={`${prefix}-weekday`} className="h-11 w-full"><SelectValue placeholder="요일 선택" /></SelectTrigger><SelectContent>{weekdays.map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-time`}>기본 시작 시간</Label><Input id={`${prefix}-time`} type="time" name="start_time" defaultValue={course?.start_time.slice(0, 5)} required className="h-11" /></div>
    </div>
    <div className="space-y-2"><Label htmlFor={`${prefix}-name`}>클래스명</Label><Input id={`${prefix}-name`} name="name" value={name} maxLength={120} required className="h-11" onChange={event => { setName(event.target.value); setCustomName(true); }} />
      {!course && suggestion && <Button type="button" variant="link" className="h-11 px-0 text-gold" onClick={() => { setName(suggestion); setCustomName(false); }}>기본명 사용</Button>}
    </div>
  </>;
}
