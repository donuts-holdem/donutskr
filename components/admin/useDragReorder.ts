"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

// useLayoutEffect on the server warns; fall back to useEffect there (SSR pass
// only — the FLIP animation it drives is client-only anyway).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Pointer-based drag reordering with live "make space" feedback, shared by the
 * admin order editors (programs, tabs). Native HTML5 drag wouldn't start from
 * an icon handle, so the gesture is driven manually: press the handle → as the
 * pointer moves the dragged row is spliced into its new slot in real time so
 * surrounding rows shift apart (FLIP-animated) → release keeps the order.
 * Mouse, pen, and touch. Rows must carry `data-row-id={item.id}` and live
 * inside the element `listRef` is attached to.
 */
export function useDragReorder<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);
  // The dragged row is moved through `items` live (surrounding rows shift to
  // open a slot); no separate drop-line needed.
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

  // FLIP: smoothly slide rows from their previous position to the new one when
  // the order changes mid-drag, so the "space opening up" reads as motion, not
  // a snap.
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

  return { items, dragId, listRef, dirty, moveBy, onHandleKeyDown, beginDrag };
}
