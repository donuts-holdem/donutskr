import Link from "next/link";
import { getAllPrograms } from "@/lib/data/programs";
import { getProgramOptions } from "@/lib/data/programOptions";
import { programGroupLabel } from "@/lib/labels";
import { reorderPrograms } from "@/app/admin/actions/programs";
import { ProgramOrderEditor, type ProgramOrderItem } from "@/components/admin/ProgramOrderEditor";
import { Button } from "@/components/ui/button";

export default async function ProgramOrderPage() {
  const [programs, groupOptions] = await Promise.all([
    getAllPrograms(),
    getProgramOptions("group"),
  ]);
  // DB option labels take priority; fall back to the static map for legacy /
  // removed group values so a row never shows a raw English key it can avoid.
  const groupLabels = new Map(groupOptions.map((o) => [o.value, o.label]));
  const groupLabel = (g: string) => groupLabels.get(g) ?? programGroupLabel(g);

  const items: ProgramOrderItem[] = programs.map((p) => ({
    id: p.id,
    title: p.title,
    groupLabel: groupLabel(p.program_group),
    is_visible: p.is_visible,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-gold text-2xl font-bold">프로그램 순서 편집</h1>
        <Button asChild variant="outline">
          <Link href="/admin/programs">목록으로</Link>
        </Button>
      </div>
      <p className="text-muted-foreground mb-6 max-w-2xl text-sm">
        핸들을 드래그하거나 방향키(위/아래) 또는 이동 버튼으로 순서를 바꾼 뒤 순서 저장을 누르세요.
        상단에 있을수록 사이트에서 먼저 노출됩니다. 숨김 프로그램도 순서에 포함됩니다.
      </p>
      <ProgramOrderEditor initialItems={items} action={reorderPrograms} />
    </div>
  );
}
