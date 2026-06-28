import Link from "next/link";
import type { ReactNode } from "react";
import type { Event } from "@/lib/types";
import { getAllEvents } from "@/lib/data/events";
import { getAllSeasons } from "@/lib/data/seasons";
import { eventStatusLabel } from "@/lib/labels";
import { weekdayKO } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EffectiveVisibilityBadge } from "@/components/admin/EffectiveVisibilityBadge";
import { effectiveEventVisibility } from "@/lib/visibility";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";
import { SeasonFilterSelect } from "@/components/admin/SeasonFilterSelect";
import { ShowCompletedToggle } from "@/components/admin/ShowCompletedToggle";

function dateTimeLabel(event: Event): string {
  if (!event.date) return "—";
  const wd = weekdayKO(event.date);
  const base = `${event.date}${wd ? ` (${wd})` : ""}`;
  return event.start_time ? `${base} · ${event.start_time}` : base;
}

// Shared full-width fixed column layout so the active and completed tables stay
// aligned to each other while always filling the screen.
function EventsTable({ rows, emptyText }: { rows: ReactNode[]; emptyText: string }) {
  return (
    <Table className="w-full table-fixed">
      <colgroup>
        <col className="w-1/4" />
        <col className="w-1/6" />
        <col className="w-1/6" />
        <col className="w-1/6" />
        <col className="w-1/12" />
        <col className="w-1/6" />
      </colgroup>
      <TableHeader>
        <TableRow>
          <TableHead>제목</TableHead>
          <TableHead>날짜</TableHead>
          <TableHead>시즌</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>노출</TableHead>
          <TableHead>작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length > 0 ? (
          rows
        ) : (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-muted-foreground py-8 text-center"
            >
              {emptyText}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; completed?: string }>;
}) {
  const [events, seasons, sp] = await Promise.all([
    getAllEvents(),
    getAllSeasons(),
    searchParams,
  ]);

  const seasonName = new Map(seasons.map((s) => [s.id, s.name]));
  const filter = sp.season ?? "all";
  const showCompleted = sp.completed === "1";

  const scoped = events.filter((e) =>
    filter === "all"
      ? true
      : filter === "none"
        ? e.season_id == null
        : e.season_id === filter,
  );
  const active = scoped.filter((e) => e.status !== "completed");
  const completed = scoped.filter((e) => e.status === "completed");

  const renderRow = (event: Event) => (
    <TableRow key={event.id}>
      <TableCell className="text-foreground">{event.title}</TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {dateTimeLabel(event)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {event.season_id ? (seasonName.get(event.season_id) ?? "—") : "미배정"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {eventStatusLabel(event.status)}
      </TableCell>
      <TableCell>
        <EffectiveVisibilityBadge state={effectiveEventVisibility(event)} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href={`/admin/events/${event.id}/edit`}>수정</Link>
          </Button>
          <ViewOnSiteLink href={`/schedule/${event.id}`} />
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">이벤트 관리</h1>
        <Button asChild>
          <Link href="/admin/events/new">+ 새 이벤트</Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <SeasonFilterSelect seasons={seasons} value={filter} />
        <ShowCompletedToggle checked={showCompleted} />
      </div>

      <EventsTable rows={active.map(renderRow)} emptyText="등록된 이벤트가 없습니다." />

      {showCompleted && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              완료된 이벤트
            </h2>
            <span className="text-muted-foreground/70 text-xs">
              {completed.length}
            </span>
          </div>
          <div className="opacity-65 transition-opacity hover:opacity-100">
            <EventsTable
              rows={completed.map(renderRow)}
              emptyText="완료된 이벤트가 없습니다."
            />
          </div>
        </section>
      )}
    </div>
  );
}
