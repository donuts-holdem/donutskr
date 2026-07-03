"use client";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDown, ChevronUp, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// useLayoutEffect on the server warns; fall back to useEffect there (SSR pass
// only — the FLIP animation it drives is client-only anyway).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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
  const [items, setItems] = useState<ProgramOrderItem[]>(initialItems);
  // The dragged row is moved through `items` live (surrounding rows shift to open
  // a slot); no separate drop-line needed.
  const [dragId, setDragId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Previous on-screen tops per row id, for FLIP animation of the shift.
  const prevTops = useRef<Map<string, number>>(new Map());

  // Dirty = current order differs from the order we were given.
  const dirty = items.length !== initialItems.length || items.some((it, i) => it.id !== initialItems[i]?.id);

  function moveBy(id: string, delta: number) {
    setItems((its) => {
      const from = its.findIndex((it) => it.id === id);
      if (from === -1) return its;
      const to = from + delta;
      if (to < 0 || to >= its.length) return its;
      const next = [...its];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function onHandleKeyDown(e: ReactKeyboardEvent, id: string) {
    // KeyboardEvent.code (not .key) — Korean IME turns .key into jamo.
    if (e.code === "ArrowUp") {
      e.preventDefault();
      moveBy(id, -1);
    } else if (e.code === "ArrowDown") {
      e.preventDefault();
      moveBy(id, 1);
    }
  }

  // Pointer-based drag reordering with live "make space" feedback. Native HTML5
  // drag wouldn't start from the icon handle, so we drive the gesture ourselves:
  // press the handle → as the pointer moves we splice the dragged row into its new
  // slot in real time so surrounding rows shift apart → release keeps the order.
  // Mouse, pen, and touch.
  function beginDrag(e: ReactPointerEvent, id: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    setDragId(id);

    const onMove = (ev: PointerEvent) => {
      const container = listRef.current;
      if (!container) return;
      // Insertion index = how many OTHER rows sit above the pointer. Measuring
      // only the non-dragged rows keeps the result monotonic in cursor-Y, so the
      // slot never oscillates as the dragged row is spliced around. Use offset
      // geometry (immune to the in-flight FLIP transforms below) so a fast drag
      // never reads interpolated mid-animation positions and thrashes.
      const cRect = container.getBoundingClientRect();
      const pointerY = ev.clientY - cRect.top;
      const els = Array.from(container.querySelectorAll<HTMLElement>("[data-row-id]"));
      let count = 0;
      for (const el of els) {
        if (el.dataset.rowId === id) continue;
        const mid = el.offsetTop - container.offsetTop + el.offsetHeight / 2;
        if (pointerY > mid) count++;
      }
      setItems((its) => {
        const item = its.find((it) => it.id === id);
        if (!item) return its;
        const others = its.filter((it) => it.id !== id);
        const next = [...others.slice(0, count), item, ...others.slice(count)];
        if (next.every((it, i) => it.id === its[i].id)) return its; // no change
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // FLIP: smoothly slide rows from their previous position to the new one when the
  // order changes mid-drag, so the "space opening up" reads as motion, not a snap.
  useIsoLayoutEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const els = Array.from(container.querySelectorAll<HTMLElement>("[data-row-id]"));
    const tops = new Map<string, number>();
    for (const el of els) tops.set(el.dataset.rowId ?? "", el.offsetTop);

    if (dragId) {
      const moved: HTMLElement[] = [];
      for (const el of els) {
        const k = el.dataset.rowId ?? "";
        if (k === dragId) continue;
        const prev = prevTops.current.get(k);
        const next = tops.get(k);
        if (prev !== undefined && next !== undefined && prev !== next) {
          el.style.transition = "none";
          el.style.transform = `translateY(${prev - next}px)`;
          moved.push(el);
        }
      }
      if (moved.length) {
        void container.offsetHeight; // one reflow, then release to animate home
        for (const el of moved) {
          el.style.transition = "transform 160ms ease";
          el.style.transform = "";
        }
      }
    } else {
      for (const el of els) {
        el.style.transform = "";
        el.style.transition = "";
      }
    }
    prevTops.current = tops;
  });

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
