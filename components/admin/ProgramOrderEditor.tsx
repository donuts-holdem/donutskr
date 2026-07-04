"use client";
import { Fragment } from "react";
import { ChevronDown, ChevronUp, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDragReorder } from "@/components/admin/useDragReorder";

export interface ProgramOrderItem {
  id: string;
  title: string;
  groupLabel: string;
  is_visible: boolean;
}

interface Props {
  initialItems: ProgramOrderItem[];
  action: (fd: FormData) => void | Promise<void>;
}

export function ProgramOrderEditor({ initialItems, action }: Props) {
  const { items, dragId, listRef, dirty, moveBy, onHandleKeyDown, beginDrag } =
    useDragReorder(initialItems);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="ordered_ids" value={JSON.stringify(items.map((it) => it.id))} />

      {items.length > 0 ? (
        <div ref={listRef} className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <Fragment key={item.id}>
              <div
                data-row-id={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3.5 py-3",
                  dragId === item.id && "relative z-10 border-white/25 opacity-90 shadow-lg ring-1 ring-white/20",
                )}
              >
                <span
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => beginDrag(e, item.id)}
                  onKeyDown={(e) => onHandleKeyDown(e, item.id)}
                  title="드래그하거나 방향키로 순서 변경"
                  aria-label={`${item.title} 순서 변경 (방향키 위/아래)`}
                  className="text-muted-foreground shrink-0 cursor-grab touch-none select-none rounded outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                >
                  <GripVertical className="size-4" />
                </span>

                <span className="text-muted-foreground w-8 shrink-0 text-center text-sm tabular-nums">
                  {idx + 1}
                </span>

                <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                  {item.title}
                </span>

                {!item.is_visible && (
                  <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-pill border border-border px-2 py-0.5 text-xs">
                    <EyeOff className="size-3" />
                    숨김
                  </span>
                )}

                <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                  {item.groupLabel}
                </span>

                <div className="ml-auto flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`${item.title} 위로 이동`}
                    disabled={idx === 0}
                    onClick={() => moveBy(item.id, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`${item.title} 아래로 이동`}
                    disabled={idx === items.length - 1}
                    onClick={() => moveBy(item.id, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center">정렬할 프로그램이 없습니다.</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty || items.length === 0}>
          순서 저장
        </Button>
        {dirty && <span className="text-muted-foreground text-sm">저장하지 않은 변경사항이 있습니다.</span>}
      </div>
    </form>
  );
}
