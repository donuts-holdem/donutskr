"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTimerFromEvent } from "@/app/admin/actions/timers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TimerCreateEventOption {
  id: string;
  label: string;
}

/**
 * Create a timer from an event that already has a blind structure. Events
 * without a structure can't be turned into a clock, so the caller only passes
 * eligible ones; an empty list renders a hint instead of the picker.
 */
export function TimerCreateForm({ events }: { events: TimerCreateEventOption[] }) {
  const router = useRouter();
  const [eventId, setEventId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCreate() {
    if (!eventId) return;
    setError(null);
    startTransition(async () => {
      const res = await createTimerFromEvent(eventId);
      if (res.ok) {
        router.push(`/admin/timers/${res.id}`);
      } else {
        setError(res.error);
      }
    });
  }

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        블라인드 스트럭처가 지정된 이벤트가 없습니다. 이벤트에 스트럭처를 먼저 연결하세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={eventId || undefined} onValueChange={setEventId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="-- 일정 선택 --" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={onCreate} disabled={!eventId || pending}>
          {pending ? "생성 중…" : "타이머 생성"}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
