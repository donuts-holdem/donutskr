import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BlockEditor } from "@/components/admin/BlockEditor";
import { coerceDescriptionBlocks } from "@/lib/admin/structured-fields";
import type { Block } from "@/lib/program-blocks";

const imageBlock: Block = { type: "image", src: "https://example.com/img.jpg", alt: "test image" };
const paragraphBlock: Block = { type: "paragraph", runs: [{ text: "hello world" }] };
const listBlock: Block = {
  type: "list",
  items: [
    [{ runs: [{ text: "item 1" }] }],
    [{ runs: [{ text: "item 2" }] }],
  ],
};
const rawBlock: Block = { type: "raw", html: "<strong>bold</strong>" };

function getHidden(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[name="blocks"]') as HTMLInputElement;
}

describe("BlockEditor", () => {
  it("round-trip: initial blocks serialize and deserialize identically", () => {
    const initial: Block[] = [imageBlock, paragraphBlock, listBlock, rawBlock];
    const { container } = render(<BlockEditor name="blocks" initial={initial} />);
    const hidden = getHidden(container);
    const parsed = coerceDescriptionBlocks(JSON.parse(hidden.value));
    expect(parsed).toEqual(initial);
  });

  it("add + type: clicking 문단 then typing updates hidden input JSON", () => {
    const { container } = render(<BlockEditor name="blocks" initial={[]} />);
    fireEvent.click(screen.getByText("문단"));
    const input = screen.getByPlaceholderText(/문단/i);
    fireEvent.change(input, { target: { value: "새 텍스트" } });
    const parsed = coerceDescriptionBlocks(JSON.parse(getHidden(container).value));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({ type: "paragraph", runs: [{ text: "새 텍스트" }] });
  });

  it("bold toggle: expanding 서식 then clicking 굵게 sets bold: true", () => {
    const initial: Block[] = [{ type: "paragraph", runs: [{ text: "hello", bold: false }] }];
    const { container } = render(<BlockEditor name="blocks" initial={initial} />);
    fireEvent.click(screen.getByText("서식"));
    fireEvent.click(screen.getByText("굵게"));
    const parsed = coerceDescriptionBlocks(JSON.parse(getHidden(container).value));
    expect(parsed[0]).toMatchObject({ type: "paragraph", runs: [{ text: "hello", bold: true }] });
  });

  it("raw no-delete: the raw block card has no 삭제 button", () => {
    render(<BlockEditor name="blocks" initial={[rawBlock, paragraphBlock]} />);
    const badge = screen.getByText("개발자 확인 필요");
    const rawCard = badge.closest('[data-slot="card"]') as HTMLElement;
    expect(rawCard).not.toBeNull();
    const deleteBtn = Array.from(rawCard.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("삭제"),
    );
    expect(deleteBtn).toBeUndefined();
  });
});
