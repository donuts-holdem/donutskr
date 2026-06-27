import Link from "next/link";
import { getAllPrograms } from "@/lib/data/programs";
import { programGroupLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StateBadge } from "@/components/admin/StateBadge";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";

export default async function AdminProgramsPage() {
  const programs = await getAllPrograms();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">프로그램 관리</h1>
        <Button asChild>
          <Link href="/admin/programs/new">+ 새 프로그램</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제목</TableHead>
            <TableHead>그룹</TableHead>
            <TableHead>HOT</TableHead>
            <TableHead>제휴</TableHead>
            <TableHead>노출</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((program) => (
            <TableRow key={program.id}>
              <TableCell className="text-foreground">{program.title}</TableCell>
              <TableCell className="text-muted-foreground">{programGroupLabel(program.program_group)}</TableCell>
              <TableCell><StateBadge on={program.is_hot} kind="hot" /></TableCell>
              <TableCell><StateBadge on={program.is_affiliate} kind="affiliate" /></TableCell>
              <TableCell><StateBadge on={program.is_visible} kind="visible" /></TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <Link href={`/admin/programs/${program.id}/edit`}>수정</Link>
                  </Button>
                  <ViewOnSiteLink href={`/programs/${program.slug}`} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {programs.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                등록된 프로그램이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
