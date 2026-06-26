import Link from "next/link";
import { getAllEvents } from "@/lib/data/events";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminEventsPage() {
  const events = await getAllEvents();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">이벤트 관리</h1>
        <Button asChild>
          <Link href="/admin/events/new">+ 새 이벤트</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            <TableHead>카테고리</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>노출</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="text-foreground">{event.title}</TableCell>
              <TableCell className="text-muted-foreground">{event.category}</TableCell>
              <TableCell className="text-muted-foreground">{event.status}</TableCell>
              <TableCell className={event.is_visible ? "text-gold" : "text-muted-foreground/50"}>
                {event.is_visible ? "●" : "○"}
              </TableCell>
              <TableCell>
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link href={`/admin/events/${event.id}/edit`}>수정</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {events.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                등록된 이벤트가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
