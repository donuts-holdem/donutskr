import Link from "next/link";
import { getAllSpecialPages } from "@/lib/data/specialPages";
import { deleteSpecialPage } from "@/app/admin/actions/specialPages";
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
import { EffectiveVisibilityBadge } from "@/components/admin/EffectiveVisibilityBadge";
import { effectiveSpecialPageVisibility } from "@/lib/visibility";
import { todayKST } from "@/lib/schedule";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";

export default async function SpecialPagesPage() {
  const pages = await getAllSpecialPages();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">특수 페이지</h1>
        <Button asChild>
          <Link href="/admin/special-pages/new">+ 새 페이지</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>슬러그</TableHead>
            <TableHead>제목</TableHead>
            <TableHead>노출</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-muted-foreground">{p.slug}</TableCell>
              <TableCell className="text-foreground">{p.title}</TableCell>
              <TableCell>
                <EffectiveVisibilityBadge state={effectiveSpecialPageVisibility(p, todayKST())} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <Link href={`/admin/special-pages/${p.id}/edit`}>수정</Link>
                  </Button>
                  <ViewOnSiteLink href={`/${p.slug}`} />
                  <DeleteButton itemName={p.title} onDelete={async () => { "use server"; await deleteSpecialPage(p.id); }} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {pages.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                특수 페이지가 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
