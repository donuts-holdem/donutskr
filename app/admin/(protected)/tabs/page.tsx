import Link from "next/link";
import { getAllTabs, resolveTabHref } from "@/lib/data/tabs";
import { deleteTab, reorderTabs } from "@/app/admin/actions/tabs";
import { TabOrderList, type TabOrderItem } from "@/components/admin/TabOrderList";
import { TAB_TYPE_OPTIONS } from "@/lib/labels";
import { Button } from "@/components/ui/button";

export default async function TabsPage() {
  const tabs = await getAllTabs();
  const typeLabels = new Map(TAB_TYPE_OPTIONS.map((o) => [o.value, o.label]));

  const items: TabOrderItem[] = tabs.map((tab) => ({
    id: tab.id,
    name: tab.name,
    dest: resolveTabHref(tab) ?? "연결 안 됨",
    typeLabel: typeLabels.get(tab.type) ?? tab.type,
    is_visible: tab.is_visible,
    mobile_visible: tab.mobile_visible,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">탭 관리</h1>
        <Button asChild>
          <Link href="/admin/tabs/new">+ 새 탭</Link>
        </Button>
      </div>
      <p className="text-muted-foreground mb-6 max-w-2xl text-sm">
        여기 보이는 순서가 그대로 사이트 상단 메뉴의 순서입니다. 핸들을 드래그하거나
        방향키(위/아래)로 옮긴 뒤 순서 저장을 누르세요.
      </p>
      <TabOrderList initialItems={items} reorderAction={reorderTabs} deleteAction={deleteTab} />
    </div>
  );
}
