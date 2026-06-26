import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
import { Input } from "@/components/ui/input";

function StringEditor({ initial }: { initial: string[] }) {
  return (
    <RepeatableFieldEditor<string>
      name="note_list"
      initial={initial}
      makeEmpty={() => ""}
      addLabel="항목 추가"
      renderRow={(value, onChange) => (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="안내 문구" />
      )}
    />
  );
}

describe("RepeatableFieldEditor", () => {
  it("serializes initial values into the hidden input", () => {
    const { container } = render(<StringEditor initial={["첫 줄", "둘째 줄"]} />);
    const hidden = container.querySelector('input[name="note_list"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual(["첫 줄", "둘째 줄"]);
  });

  it("adds a row and reflects edits in the hidden input", () => {
    const { container } = render(<StringEditor initial={[]} />);
    fireEvent.click(screen.getByText("항목 추가"));
    const input = screen.getByPlaceholderText("안내 문구");
    fireEvent.change(input, { target: { value: "새 항목" } });
    const hidden = container.querySelector('input[name="note_list"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual(["새 항목"]);
  });

  it("removes a row", () => {
    const { container } = render(<StringEditor initial={["지울 항목"]} />);
    fireEvent.click(screen.getByLabelText("행 삭제"));
    const hidden = container.querySelector('input[name="note_list"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual([]);
  });
});
