"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createTimerFromEvent,
  type CreateTimerResult,
  type TimerCreateIssue,
} from "@/app/admin/actions/timers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
 *
 * Rows with an empty duration block creation — instead of a dead-end error,
 * a dialog lists each offending row and takes a minutes value that is applied
 * to the TIMER snapshot only (the blind structure itself is never modified).
 */
export function TimerCreateForm({ events }: { events: TimerCreateEventOption[] }) {
  const router = useRouter();
  const [eventId, setEventId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<TimerCreateIssue[] | null>(null);
  const [fixInputs, setFixInputs] = useState<Record<number, string>>({});
  const [pending, startTransition] = useTransition();

  function handleResult(res: CreateTimerResult) {
    if (res.ok) {
      setIssues(null);
      if (res.warning) toast.warning(res.warning, { duration: 8000 });
      router.push(`/admin/timers/${res.id}`);
      return;
    }
    if (res.issues && res.issues.length > 0) {
      setIssues(res.issues);
      setFixInputs({});
    } else {
      setError(res.error);
    }
  }

  function onCreate() {
    if (!eventId) return;
    setError(null);
    startTransition(async () => {
      handleResult(await createTimerFromEvent(eventId));
    });
  }

  const fixesValid =
    issues != null &&
    issues.every((i) => {
      const v = fixInputs[i.sortOrder]?.trim() ?? "";
      return /^\d+$/.test(v) && parseInt(v, 10) >= 1;
    });

  function onSubmitFixes() {
    if (!eventId || !issues || !fixesValid) return;
    setError(null);
    const fixes = issues.map((i) => ({
      sortOrder: i.sortOrder,
      minutes: parseInt(fixInputs[i.sortOrder].trim(), 10),
    }));
    startTransition(async () => {
      handleResult(await createTimerFromEvent(eventId, fixes));
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

      <Dialog open={issues != null} onOpenChange={(open) => !open && setIssues(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>진행 시간 입력 필요</DialogTitle>
            <DialogDescription>
              스트럭처에 진행 시간이 비어 있는 행이 있습니다. 아래에 입력한 값은 이
              타이머에만 적용되며, 블라인드 스트럭처 원본은 변경되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {issues?.map((issue) => (
              <div key={issue.sortOrder} className="flex items-center justify-between gap-3">
                <Label htmlFor={`fix-${issue.sortOrder}`} className="min-w-0 flex-1 truncate">
                  {issue.label}
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    id={`fix-${issue.sortOrder}`}
                    inputMode="numeric"
                    placeholder="분"
                    className="w-20 text-right tabular-nums"
                    value={fixInputs[issue.sortOrder] ?? ""}
                    onChange={(e) =>
                      setFixInputs((prev) => ({ ...prev, [issue.sortOrder]: e.target.value }))
                    }
                  />
                  <span className="text-muted-foreground text-sm">분</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIssues(null)}>
              취소
            </Button>
            <Button type="button" onClick={onSubmitFixes} disabled={!fixesValid || pending}>
              {pending ? "생성 중…" : "적용하고 생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
