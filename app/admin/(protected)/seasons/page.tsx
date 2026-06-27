import Link from "next/link";
import { getAllSeasons } from "@/lib/data/seasons";
import { seasonCodeLabel } from "@/lib/labels";
import { activateSeason, deleteSeason } from "@/app/admin/actions/seasons";
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

export default async function AdminSeasonsPage() {
  const seasons = await getAllSeasons();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">시즌 관리</h1>
        <Button asChild>
          <Link href="/admin/seasons/new">+ 새 시즌</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>코드</TableHead>
            <TableHead>연도</TableHead>
            <TableHead>활성</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seasons.map((season) => (
            <TableRow key={season.id}>
              <TableCell className="text-foreground">{season.name}</TableCell>
              <TableCell className="text-muted-foreground">{seasonCodeLabel(season.code)}</TableCell>
              <TableCell className="text-muted-foreground">{season.year}</TableCell>
              <TableCell>
                {season.is_active ? (
                  <span className="text-gold font-semibold">● 활성</span>
                ) : (
                  <form action={activateSeason.bind(null, season.id)} className="inline">
                    <Button type="submit" variant="outline" size="sm">
                      활성화
                    </Button>
                  </form>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <Link href={`/admin/seasons/${season.id}/edit`}>수정</Link>
                  </Button>
                  <DeleteButton onDelete={deleteSeason.bind(null, season.id)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {seasons.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                등록된 시즌이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
