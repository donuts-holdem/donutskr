import Link from "next/link";
import { getAllPrograms } from "@/lib/data/programs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
              <TableCell className="text-muted-foreground">{program.program_group}</TableCell>
              <TableCell className={program.is_hot ? "text-gold" : "text-muted-foreground/50"}>
                {program.is_hot ? "●" : "○"}
              </TableCell>
              <TableCell className={program.is_affiliate ? "text-gold" : "text-muted-foreground/50"}>
                {program.is_affiliate ? "●" : "○"}
              </TableCell>
              <TableCell className={program.is_visible ? "text-gold" : "text-muted-foreground/50"}>
                {program.is_visible ? "●" : "○"}
              </TableCell>
              <TableCell>
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link href={`/admin/programs/${program.id}/edit`}>수정</Link>
                </Button>
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
