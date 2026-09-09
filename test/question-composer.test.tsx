import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionComposer } from "@/components/learning/QuestionComposer";

vi.mock("@/app/learning/actions", () => ({ saveQuestion: vi.fn(async () => ({})) }));
afterEach(cleanup);

describe("original question authoring", () => {
  it("offers a single-answer selector, and changing choices regenerates the submitted options", () => {
    const { container } = render(<QuestionComposer />);
    fireEvent.change(screen.getByLabelText("선택지 · 한 줄에 하나"), { target: { value: "콜\n폴드\n레이즈" } });
    expect(screen.getByRole("combobox", { name: "단일 정답" })).toBeEnabled();
    const data = new FormData(container.querySelector("form")!);
    expect(JSON.parse(String(data.get("choices")))).toHaveLength(3);
    expect(data.get("answer_mode")).toBe("SINGLE");
    expect(screen.getByText(/도너츠 자체 제작 문항이며/)).toBeInTheDocument();
  });
  it("supports multiple correct answers without disabling the authoring fields", async () => {
    const { container } = render(<QuestionComposer />);
    fireEvent.change(screen.getByLabelText("선택지 · 한 줄에 하나"), { target: { value: "콜\n폴드\n레이즈" } });
    fireEvent.keyDown(screen.getByLabelText("정답 선택 방식"), { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "복수 정답 · 모두 선택" }));
    await waitFor(() => expect(screen.getByText("정답을 2개 이상 지정하세요")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("checkbox", { name: "콜" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "레이즈" }));
    const data = new FormData(container.querySelector("form")!);
    expect(data.getAll("correct_ids")).toEqual(["option-1", "option-3"]);
    expect(data.get("answer_mode")).toBe("MULTIPLE");
    expect(screen.getByLabelText("선택지 · 한 줄에 하나")).toBeEnabled();
  });
});
