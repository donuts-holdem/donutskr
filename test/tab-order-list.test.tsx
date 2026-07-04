import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TabOrderList, type TabOrderItem } from "@/components/admin/TabOrderList";

const items: TabOrderItem[] = [
  { id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", name: "프로그램", dest: "/programs", typeLabel: "내부 링크", is_visible: true, mobile_visible: true },
  { id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb", name: "일정", dest: "/schedule", typeLabel: "내부 링크", is_visible: false, mobile_visible: true },
  { id: "cccccccc-cccc-4ccc-cccc-cccccccccccc", name: "리더보드", dest: "/leaderboard", typeLabel: "내부 링크", is_visible: true, mobile_visible: false },
];

function orderedIdsValue(container: HTMLElement): string[] {
  const input = container.querySelector<HTMLInputElement>('input[name="ordered_ids"]');
  return JSON.parse(input?.value ?? "[]");
}

describe("TabOrderList", () => {
  it("renders each tab with its destination and visibility badges", () => {
    render(
      <TabOrderList initialItems={items} reorderAction={async () => {}} deleteAction={async () => {}} />
    );
    expect(screen.getByText("프로그램")).toBeTruthy();
    expect(screen.getByText("/programs")).toBeTruthy();
    expect(screen.getByText("숨김")).toBeTruthy(); // 일정 (is_visible=false)
    expect(screen.getByText("모바일 숨김")).toBeTruthy(); // 리더보드
  });

  it("starts clean: given order, save disabled", () => {
    const { container } = render(
      <TabOrderList initialItems={items} reorderAction={async () => {}} deleteAction={async () => {}} />
    );
    expect(orderedIdsValue(container)).toEqual(items.map((i) => i.id));
    const save = screen.getByRole("button", { name: "순서 저장" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("keyboard reorder on the handle updates the order and enables save", () => {
    const { container } = render(
      <TabOrderList initialItems={items} reorderAction={async () => {}} deleteAction={async () => {}} />
    );
    const handle = screen.getByLabelText("프로그램 순서 변경 (방향키 위/아래)");
    // KeyboardEvent.code (not .key) — the handle listens on code for IME safety.
    fireEvent.keyDown(handle, { code: "ArrowDown" });
    expect(orderedIdsValue(container)).toEqual([items[1].id, items[0].id, items[2].id]);
    const save = screen.getByRole("button", { name: "순서 저장" }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it("links each row to its edit page", () => {
    render(
      <TabOrderList initialItems={items} reorderAction={async () => {}} deleteAction={async () => {}} />
    );
    const edit = screen.getAllByRole("link", { name: "수정" })[0];
    expect(edit.getAttribute("href")).toBe(`/admin/tabs/${items[0].id}/edit`);
  });
});
