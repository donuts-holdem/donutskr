import Link from "next/link";
import { getAllTabs } from "@/lib/data/tabs";
import { deleteTab } from "@/app/admin/actions/tabs";
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

export default async function TabsPage() {
  const tabs = await getAllTabs();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">탭 관리</h1>
        <Button asChild>
          <Link href="/admin/tabs/new">+ 새 탭</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>키</TableHead>
            <TableHead>순서</TableHead>
            <TableHead>노출</TableHead>
            <TableHead>기간 노출</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabs.map((tab) => (
            <TableRow key={tab.id}>
              <TableCell className="text-foreground">{tab.name}</TableCell>
              <TableCell className="text-muted-foreground">{tab.key}</TableCell>
              <TableCell className="text-muted-foreground">{tab.sort_order}</TableCell>
              <TableCell className={tab.is_visible ? "text-gold" : "text-muted-foreground/50"}>
                {tab.is_visible ? "●" : "○"}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {tab.start_show_date || tab.end_show_date
                  ? `${tab.start_show_date ?? "∞"} ~ ${tab.end_show_date ?? "∞"}`
                  : "-"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <Link href={`/admin/tabs/${tab.id}/edit`}>수정</Link>
                  </Button>
                  <DeleteButton onDelete={async () => { "use server"; await deleteTab(tab.id); }} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {tabs.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                탭이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
