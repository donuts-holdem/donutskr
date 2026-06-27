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

  it("typing in the text area serializes each line to a paragraph block", () => {
    const { container } = render(<BlockEditor name="blocks" initial={[]} />);
    const textarea = screen.getByPlaceholderText(/설명을 입력/);
    fireEvent.change(textarea, { target: { value: "첫 줄\n둘째 줄" } });
    const parsed = coerceDescriptionBlocks(JSON.parse(getHidden(container).value));
    expect(parsed).toEqual([
      { type: "paragraph", runs: [{ text: "첫 줄" }] },
      { type: "paragraph", runs: [{ text: "둘째 줄" }] },
    ]);
  });

  it("formatted paragraph: adding 서식 문단 then 굵게 sets bold: true", () => {
    const { container } = render(<BlockEditor name="blocks" initial={[]} />);
    fireEvent.click(screen.getByText("서식 문단"));
    fireEvent.change(screen.getByPlaceholderText("텍스트"), { target: { value: "hello" } });
    fireEvent.click(screen.getByText("굵게"));
    const parsed = coerceDescriptionBlocks(JSON.parse(getHidden(container).value));
    const para = parsed.find((b) => b.type === "paragraph");
    expect(para).toMatchObject({ type: "paragraph", runs: [{ text: "hello", bold: true }] });
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
