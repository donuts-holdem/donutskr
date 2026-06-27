import Link from "next/link";
import { getAllEvents } from "@/lib/data/events";
import { getAllSeasons } from "@/lib/data/seasons";
import { eventStatusLabel } from "@/lib/labels";
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

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const [events, seasons, sp] = await Promise.all([
    getAllEvents(),
    getAllSeasons(),
    searchParams,
  ]);

  const seasonName = new Map(seasons.map((s) => [s.id, s.name]));
  const filter = sp.season ?? "all";
  const rows = events.filter((e) =>
    filter === "all"
      ? true
      : filter === "none"
        ? e.season_id == null
        : e.season_id === filter,
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">이벤트 관리</h1>
        <Button asChild>
          <Link href="/admin/events/new">+ 새 이벤트</Link>
        </Button>
      </div>

      <div className="mb-4">
        <SeasonFilterSelect seasons={seasons} value={filter} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            <TableHead>시즌</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>노출</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="text-foreground">{event.title}</TableCell>
              <TableCell className="text-muted-foreground">
                {event.season_id
                  ? (seasonName.get(event.season_id) ?? "—")
                  : "미배정"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {eventStatusLabel(event.status)}
              </TableCell>
              <TableCell>
                <EffectiveVisibilityBadge
                  state={effectiveEventVisibility(event)}
                />
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
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground py-8 text-center"
              >
                등록된 이벤트가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
