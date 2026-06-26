import { useState } from "react";

// Monotonic counter for row keys. Module-level (client only) avoids
// Date.now()/Math.random() in keys and guarantees uniqueness across instances.
let seq = 0;
function newKey(): string {
  seq += 1;
  return `rfe-${seq}`;
}

export interface Keyed<T> {
  key: string;
  value: T;
}

export interface RepeatableRows<T> {
  rows: Keyed<T>[];
  values: T[];
  add: () => void;
  remove: (key: string) => void;
  update: (key: string, value: T) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
}

export function useRepeatableRows<T>(initial: T[], makeEmpty: () => T): RepeatableRows<T> {
  const [rows, setRows] = useState<Keyed<T>[]>(() => initial.map((value) => ({ key: newKey(), value })));
  return {
    rows,
    values: rows.map((r) => r.value),
    add: () => setRows((rs) => [...rs, { key: newKey(), value: makeEmpty() }]),
    remove: (key) => setRows((rs) => rs.filter((r) => r.key !== key)),
    update: (key, value) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, value } : r))),
    moveUp: (index) =>
      setRows((rs) => {
        if (index <= 0) return rs;
        const a = [...rs];
        [a[index - 1], a[index]] = [a[index], a[index - 1]];
        return a;
      }),
    moveDown: (index) =>
      setRows((rs) => {
        if (index >= rs.length - 1) return rs;
        const a = [...rs];
        [a[index], a[index + 1]] = [a[index + 1], a[index]];
        return a;
      }),
  };
}
