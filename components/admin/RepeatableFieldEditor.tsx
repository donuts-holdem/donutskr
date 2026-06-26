"use client";
import type { ReactNode } from "react";
import { useRepeatableRows } from "@/lib/admin/useRepeatableRows";
import { Button } from "@/components/ui/button";

interface RepeatableFieldEditorProps<T> {
  name: string;
  initial: T[];
  makeEmpty: () => T;
  addLabel: string;
  emptyHint?: string;
  serialize?: (values: T[]) => string;
  renderRow: (value: T, onChange: (next: T) => void) => ReactNode;
}

export function RepeatableFieldEditor<T>({
  name,
  initial,
  makeEmpty,
  addLabel,
  emptyHint,
  serialize = (values) => JSON.stringify(values),
  renderRow,
}: RepeatableFieldEditorProps<T>) {
  const { rows, values, add, remove, update, moveUp, moveDown } = useRepeatableRows<T>(initial, makeEmpty);
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialize(values)} />
      {rows.length === 0 && emptyHint && <p className="text-muted-foreground text-xs">{emptyHint}</p>}
      {rows.map((row, idx) => (
        <div
          key={row.key}
          className="border-border bg-card/60 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {renderRow(row.value, (next) => update(row.key, next))}
          </div>
          <div className="ml-auto flex gap-1">
            <Button type="button" variant="outline" size="icon" onClick={() => moveUp(idx)} aria-label="위로 이동">
              ↑
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => moveDown(idx)} aria-label="아래로 이동">
              ↓
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => remove(row.key)} aria-label="행 삭제">
              삭제
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
