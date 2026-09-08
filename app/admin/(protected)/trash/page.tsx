import {
  getTrashedItems,
  TRASH_ENTITIES,
  TRASH_ENTITY_KEYS,
  type TrashItem,
} from "@/lib/legacy/data/trash";
import { restoreItem, purgeItem } from "@/app/admin/actions/trash";
import { PurgeButton } from "@/components/admin/PurgeButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function EntityGroup({ entityKey, items }: { entityKey: (typeof TRASH_ENTITY_KEYS)[number]; items: TrashItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {TRASH_ENTITIES[entityKey].title}
          <span className="text-muted-foreground ml-2 text-sm font-normal">{items.length}개</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead className="w-40">삭제일</TableHead>
              <TableHead className="w-48 text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.entity}-${item.id}`}>
                <TableCell className="text-foreground">{item.label}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.deletedAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <form action={restoreItem}>
                      <input type="hidden" name="entity" value={item.entity} />
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="outline" size="sm">
                        복구
                      </Button>
                    </form>
                    <PurgeButton action={purgeItem} entity={item.entity} id={item.id} itemName={item.label} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default async function AdminTrashPage() {
  const items = await getTrashedItems();

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-gold text-2xl font-bold">휴지통</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        삭제된 일정·시즌·블라인드 구조를 복구할 수 있습니다. 자동 영구 삭제는 실행하지 않습니다.
      </p>

      {items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center">휴지통이 비어 있습니다.</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {TRASH_ENTITY_KEYS.map((entityKey) => {
            const groupItems = items.filter((item) => item.entity === entityKey);
            if (groupItems.length === 0) return null;
            return <EntityGroup key={entityKey} entityKey={entityKey} items={groupItems} />;
          })}
        </div>
      )}
    </div>
  );
}
