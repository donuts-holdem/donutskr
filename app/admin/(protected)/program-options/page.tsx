import { getAllProgramOptions } from "@/lib/data/programOptions";
import {
  createProgramOption,
  updateProgramOption,
  deleteProgramOption,
} from "@/app/admin/actions/programOptions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ProgramOption, ProgramOptionKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const SECTIONS: { kind: ProgramOptionKind; title: string; help: string }[] = [
  {
    kind: "group",
    title: "그룹",
    help: "프로그램 목록의 카테고리 탭·섹션 이름으로 쓰입니다.",
  },
  {
    kind: "status",
    title: "상태",
    help: "프로그램 카드의 모집 상태 뱃지로 쓰입니다.",
  },
];

function OptionRow({ option }: { option: ProgramOption }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <form action={updateProgramOption.bind(null, option.id)} className="flex flex-1 flex-wrap items-end gap-2">
        <div className="flex min-w-32 flex-1 flex-col gap-1.5">
          <Label htmlFor={`label-${option.id}`} className="text-2xs">라벨</Label>
          <Input id={`label-${option.id}`} name="label" defaultValue={option.label} required />
        </div>
        <div className="flex min-w-32 flex-1 flex-col gap-1.5">
          <Label htmlFor={`value-${option.id}`} className="text-2xs">값</Label>
          <Input id={`value-${option.id}`} name="value" defaultValue={option.value} required />
        </div>
        <div className="flex w-20 flex-col gap-1.5">
          <Label htmlFor={`sort-${option.id}`} className="text-2xs">순서</Label>
          <Input id={`sort-${option.id}`} name="sort_order" type="number" defaultValue={option.sort_order} />
        </div>
        <Button type="submit" variant="secondary" size="sm">저장</Button>
      </form>
      <DeleteButton onDelete={deleteProgramOption.bind(null, option.id)} itemName={option.label} />
    </div>
  );
}

function AddRow({ kind }: { kind: ProgramOptionKind }) {
  return (
    <form action={createProgramOption} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex min-w-32 flex-1 flex-col gap-1.5">
        <Label htmlFor={`new-label-${kind}`} className="text-2xs">라벨</Label>
        <Input id={`new-label-${kind}`} name="label" placeholder="예: 포커" required />
      </div>
      <div className="flex min-w-32 flex-1 flex-col gap-1.5">
        <Label htmlFor={`new-value-${kind}`} className="text-2xs">값</Label>
        <Input id={`new-value-${kind}`} name="value" placeholder="예: poker" required />
      </div>
      <div className="flex w-20 flex-col gap-1.5">
        <Label htmlFor={`new-sort-${kind}`} className="text-2xs">순서</Label>
        <Input id={`new-sort-${kind}`} name="sort_order" type="number" defaultValue={0} />
      </div>
      <Button type="submit" size="sm">추가</Button>
    </form>
  );
}

export default async function ProgramOptionsPage() {
  const options = await getAllProgramOptions();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-gold text-2xl font-bold">프로그램 옵션</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          프로그램의 그룹·상태 선택지를 직접 추가·수정·삭제합니다.
        </p>
      </div>

      <div className="flex max-w-3xl flex-col gap-6">
        {SECTIONS.map(({ kind, title, help }) => {
          const rows = options.filter((o) => o.kind === kind);
          return (
            <Card key={kind}>
              <CardHeader>
                <CardTitle asChild>
                  <h2>{title}</h2>
                </CardTitle>
                <p className="text-muted-foreground text-xs">{help}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {rows.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {rows.map((option) => (
                      <OptionRow key={option.id} option={option} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">아직 옵션이 없습니다.</p>
                )}

                <Separator />

                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-2xs">
                    새 옵션 추가 — “값”은 영문 소문자 슬러그를 권장합니다.
                  </p>
                  <AddRow kind={kind} />
                </div>

                <p className="text-muted-foreground text-2xs">
                  “값”을 바꿔도 이미 저장된 프로그램의 값은 그대로 유지됩니다. 기존 프로그램까지
                  옮기려면 각 프로그램에서 새 값을 다시 선택하세요.
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
