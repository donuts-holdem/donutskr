import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionComposer } from "@/components/learning/QuestionComposer";
import type { LearningVersion } from "@/lib/learning/types";

vi.mock("@/app/learning/actions", () => ({ saveQuestion: vi.fn(async () => ({})) }));
afterEach(cleanup);

describe("original question authoring", () => {
  it("preserves the correct choice when a reviewed version used custom choice IDs", () => {
    const initial: LearningVersion = { id: "version", question_id: "question", version: 1, prompt: "판단을 선택하세요.",
      choices: [{ id: "call", text: "콜" }, { id: "fold", text: "폴드" }], answer_mode: "SINGLE", correct_ids: ["fold"],
      explanation: "폴드를 선택합니다.", difficulty: "BEGINNER", kind: "GENERAL", authorship_note: "자체 제작", ai_assisted: false,
      gto_evidence: null, spot: null, status: "PUBLISHED", authored_by: "author", reviewed_by: "reviewer", created_at: "2026-09-15T00:00:00Z", reviewed_at: "2026-09-15T01:00:00Z" };
    const { container } = render(<QuestionComposer initial={initial} />);
    const data = new FormData(container.querySelector("form")!);
    expect(data.getAll("correct_ids")).toEqual(["option-2"]);
    expect(JSON.parse(String(data.get("choices")))).toContainEqual({ id: "option-2", text: "폴드" });
  });
  it("submits the structured poker situation from the administrator's fields", async () => {
    const { container } = render(<QuestionComposer />);
    fireEvent.keyDown(screen.getByLabelText("상황 단계"), { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "플랍" }));
    fireEvent.change(screen.getByLabelText("유효 스택 · BB"), { target: { value: "30.5" } });
    fireEvent.change(screen.getByLabelText("내 핸드"), { target: { value: "As Kh" } });
    fireEvent.change(screen.getByLabelText("보드"), { target: { value: "Qs Td 2c" } });
    fireEvent.change(screen.getByLabelText("현재 팟 · BB"), { target: { value: "5.5" } });
    const data = new FormData(container.querySelector("form")!);
    expect(data.get("spot_category")).toBe("FLOP");
    expect(data.get("spot_stack_bb")).toBe("30.5");
    expect(data.get("spot_hero_hand")).toBe("As Kh");
    expect(data.get("spot_board")).toBe("Qs Td 2c");
    expect(data.get("spot_pot_bb")).toBe("5.5");
  });
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
