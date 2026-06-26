import Link from "next/link";
import { getAllStructures } from "@/lib/data/blindStructures";
import { deleteStructure } from "@/app/admin/actions/blindStructures";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function BlindStructuresPage() {
  const structures = await getAllStructures();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">블라인드 스트럭처</h1>
        <Button asChild>
          <Link href="/admin/blind-structures/new">+ 새 스트럭처</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {structures.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="text-foreground">{s.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <Link href={`/admin/blind-structures/${s.id}/edit`}>수정</Link>
                  </Button>
                  <DeleteButton onDelete={async () => { "use server"; await deleteStructure(s.id); }} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {structures.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-muted-foreground py-8 text-center">
                스트럭처가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
