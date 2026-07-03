import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgramOrderEditor, type ProgramOrderItem } from "@/components/admin/ProgramOrderEditor";

const items: ProgramOrderItem[] = [
  { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", title: "First", groupLabel: "포커", is_visible: true },
  { id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb", title: "Second", groupLabel: "포커", is_visible: false },
  { id: "cccccccc-cccc-4ccc-cccc-cccccccccccc", title: "Third", groupLabel: "커뮤니티", is_visible: true },
];

function orderedIdsValue(container: HTMLElement): string[] {
  const input = container.querySelector<HTMLInputElement>('input[name="ordered_ids"]');
  return JSON.parse(input?.value ?? "[]");
}

describe("ProgramOrderEditor", () => {
  it("renders every program row with a hidden badge for hidden ones", () => {
    render(<ProgramOrderEditor initialItems={items} action={async () => {}} />);
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
    expect(screen.getByText("Third")).toBeTruthy();
    expect(screen.getByText("숨김")).toBeTruthy();
  });

  it("starts with the save button disabled (not dirty) and the given order", () => {
    const { container } = render(<ProgramOrderEditor initialItems={items} action={async () => {}} />);
    expect(orderedIdsValue(container)).toEqual(items.map((i) => i.id));
    const save = screen.getByRole("button", { name: "순서 저장" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("moving a row down updates the hidden input and enables save", () => {
    const { container } = render(<ProgramOrderEditor initialItems={items} action={async () => {}} />);
    fireEvent.click(screen.getByLabelText("First 아래로 이동"));
    expect(orderedIdsValue(container)).toEqual([items[1].id, items[0].id, items[2].id]);
    const save = screen.getByRole("button", { name: "순서 저장" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it("moving a row up mirrors the change", () => {
    const { container } = render(<ProgramOrderEditor initialItems={items} action={async () => {}} />);
    fireEvent.click(screen.getByLabelText("Third 위로 이동"));
    expect(orderedIdsValue(container)).toEqual([items[0].id, items[2].id, items[1].id]);
  });

  it("disables the up button on the first row and down on the last", () => {
    render(<ProgramOrderEditor initialItems={items} action={async () => {}} />);
    expect((screen.getByLabelText("First 위로 이동") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Third 아래로 이동") as HTMLButtonElement).disabled).toBe(true);
  });

  it("arrow keys on the handle reorder rows (KeyboardEvent.code)", () => {
    const { container } = render(<ProgramOrderEditor initialItems={items} action={async () => {}} />);
    const handle = screen.getByLabelText("First 순서 변경 (방향키 위/아래)");
    fireEvent.keyDown(handle, { code: "ArrowDown" });
    expect(orderedIdsValue(container)).toEqual([items[1].id, items[0].id, items[2].id]);
  });
});
