"use client";
import Link from "next/link";
import { EyeOff, GripVertical, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { useDragReorder } from "@/components/admin/useDragReorder";

export interface TabOrderItem {
  id: string;
  name: string;
  dest: string;
  typeLabel: string;
  is_visible: boolean;
  mobile_visible: boolean;
}

interface Props {
  initialItems: TabOrderItem[];
  reorderAction: (fd: FormData) => void | Promise<void>;
  deleteAction: (id: string) => void | Promise<void>;
}

/**
 * The tab admin list IS the order: rows are dragged into place (the row's
 * position in this list is its position in the public header menu) and edited
 * or deleted inline. The reorder submit lives in its own small form because
 * DeleteButton renders a per-row form — nesting them would be invalid HTML.
 */
export function TabOrderList({ initialItems, reorderAction, deleteAction }: Props) {
  const { items, dragId, listRef, dirty, onHandleKeyDown, beginDrag } =
    useDragReorder(initialItems);

  return (
    <div className="flex flex-col gap-5">
      {items.length > 0 ? (
        <div ref={listRef} className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              data-row-id={item.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3.5 py-2.5",
                dragId === item.id && "relative z-10 border-white/25 opacity-90 shadow-lg ring-1 ring-white/20",
              )}
            >
              <span
                role="button"
                tabIndex={0}
                onPointerDown={(e) => beginDrag(e, item.id)}
                onKeyDown={(e) => onHandleKeyDown(e, item.id)}
                title="드래그하거나 방향키로 순서 변경"
                aria-label={`${item.name} 순서 변경 (방향키 위/아래)`}
                className="text-muted-foreground shrink-0 cursor-grab touch-none select-none rounded outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
              >
                <GripVertical className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate text-sm font-medium">{item.name}</div>
                <div className="text-muted-foreground truncate text-xs">{item.dest}</div>
              </div>

              {!item.is_visible && (
                <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-pill border border-border px-2 py-0.5 text-xs">
                  <EyeOff className="size-3" />
                  숨김
                </span>
              )}
              {item.is_visible && !item.mobile_visible && (
                <span
                  className="text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-pill border border-border px-2 py-0.5 text-xs"
                  title="모바일 메뉴에서는 숨겨집니다"
                >
                  <Smartphone className="size-3" />
                  모바일 숨김
                </span>
              )}

              <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                {item.typeLabel}
              </span>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link href={`/admin/tabs/${item.id}/edit`}>수정</Link>
                </Button>
                <DeleteButton itemName={item.name} onDelete={() => deleteAction(item.id)} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center">탭이 없습니다.</p>
      )}

      <form action={reorderAction} className="flex items-center gap-3">
        <input type="hidden" name="ordered_ids" value={JSON.stringify(items.map((it) => it.id))} />
        <Button type="submit" disabled={!dirty || items.length === 0}>
          순서 저장
        </Button>
        {dirty && <span className="text-muted-foreground text-sm">저장하지 않은 변경사항이 있습니다.</span>}
      </form>
    </div>
  );
}
