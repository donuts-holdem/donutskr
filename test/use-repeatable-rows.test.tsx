import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useRepeatableRows } from "@/lib/admin/useRepeatableRows";

describe("useRepeatableRows", () => {
  it("seeds rows from initial values", () => {
    const { result } = renderHook(() => useRepeatableRows<string>(["a", "b"], () => ""));
    expect(result.current.values).toEqual(["a", "b"]);
    expect(result.current.rows.map((r) => r.key)).toHaveLength(2);
  });

  it("adds, updates, removes and reorders rows", () => {
    const { result } = renderHook(() => useRepeatableRows<string>(["a"], () => ""));
    act(() => result.current.add());
    expect(result.current.values).toEqual(["a", ""]);

    const secondKey = result.current.rows[1].key;
    act(() => result.current.update(secondKey, "b"));
    expect(result.current.values).toEqual(["a", "b"]);

    act(() => result.current.moveUp(1));
    expect(result.current.values).toEqual(["b", "a"]);

    act(() => result.current.moveDown(0));
    expect(result.current.values).toEqual(["a", "b"]);

    const firstKey = result.current.rows[0].key;
    act(() => result.current.remove(firstKey));
    expect(result.current.values).toEqual(["b"]);
  });

  it("assigns stable unique keys across rows", () => {
    const { result } = renderHook(() => useRepeatableRows<string>([], () => ""));
    act(() => result.current.add());
    act(() => result.current.add());
    const keys = result.current.rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(2);
  });
});
