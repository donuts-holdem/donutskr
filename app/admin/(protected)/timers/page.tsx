import Link from "next/link";
import type { TimerStatus } from "@/lib/types";
import { getTimers } from "@/lib/data/timers";
import { getAllEvents } from "@/lib/data/events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimerCreateForm, type TimerCreateEventOption } from "@/components/admin/TimerCreateForm";
import { CopyTimerUrlButton } from "@/components/admin/CopyTimerUrlButton";
import { TimerDeleteButton } from "@/components/admin/TimerDeleteButton";

const STATUS: Record<TimerStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  running: { label: "진행중", variant: "default" },
  paused: { label: "일시정지", variant: "secondary" },
  finished: { label: "종료", variant: "outline" },
};

function createdLabel(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

// "MM.DD 제목" — the picker label. Undated events fall back to the title alone.
function eventOptionLabel(date: string | null, title: string): string {
  if (!date) return title;
  const [, m, d] = date.split("-");
  return m && d ? `${m}.${d} ${title}` : title;
}

export default async function AdminTimersPage() {
  const [timers, events] = await Promise.all([getTimers(), getAllEvents()]);

  const eventOptions: TimerCreateEventOption[] = events
    .filter((e) => e.blind_structure_id)
    .map((e) => ({ id: e.id, label: eventOptionLabel(e.date, e.title) }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">타이머</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>일정에서 타이머 생성</CardTitle>
          <CardDescription>
            블라인드 스트럭처가 연결된 이벤트를 선택하면 해당 스트럭처로 타이머가 만들어집니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimerCreateForm events={eventOptions} />
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            <TableHead>연결 이벤트</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>엔트리 / 생존</TableHead>
            <TableHead>생성일</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timers.map((t) => {
            const s = STATUS[t.status];
            return (
              <TableRow key={t.id}>
                <TableCell className="text-foreground">
                  <Button asChild variant="link" size="sm" className="h-auto p-0 font-medium">
                    <Link href={`/admin/timers/${t.id}`}>{t.title}</Link>
                  </Button>
                </TableCell>
                <TableCell className="text-muted-foreground">{t.event_title ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {t.entries} / {t.players}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {createdLabel(t.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CopyTimerUrlButton id={t.id} />
                    <TimerDeleteButton id={t.id} title={t.title} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {timers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                타이머가 없습니다. 위에서 일정을 선택해 생성하세요.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
