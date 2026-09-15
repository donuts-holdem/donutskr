import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), member: vi.fn(), submit: vi.fn() }));
vi.mock("@/lib/domains/server", () => ({ domainRpc: mocks.rpc }));
vi.mock("@/lib/membership/server", () => ({ requireActiveMember: mocks.member }));
vi.mock("@/app/learning/actions", () => ({ submitLearning: mocks.submit }));
import LearnPage from "@/app/(member)/learn/page";
import type { DailyLearning } from "@/lib/learning/types";

const daily: DailyLearning = { day: "2026-09-15", available: true, result: null, questions: [1, 2, 3, 4, 5].map(number => ({
  id: "10000000-0000-4000-8000-00000000000" + number, prompt: number + "번 판단", answer_mode: number === 5 ? "MULTIPLE" : "SINGLE",
  choices: [{ id: "a", text: "체크" }, { id: "b", text: "베팅" }, { id: "c", text: "폴드" }], difficulty: "BEGINNER", kind: "GENERAL", assumptions: null,
})) };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.member.mockResolvedValue({ supabase: {}, profile: { id: "member", status: "ACTIVE" } });
  mocks.rpc.mockResolvedValue(daily);
  mocks.submit.mockResolvedValue({ result: { id: "attempt", day: daily.day, correct_count: 5, xp: 40, current_streak: 3, answers: [] } });
});
afterEach(cleanup);

async function start() {
  render(await LearnPage());
  fireEvent.click(screen.getByRole("button", { name: "학습 시작" }));
}
function firstFour() {
  for (let number = 1; number <= 4; number++) {
    fireEvent.click(screen.getByRole("radio", { name: number === 1 ? "베팅" : "체크" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 문항" }));
  }
}

describe("daily five progression", () => {
  it("shows all required GTO conditions before the learner selects an answer", async () => {
    mocks.rpc.mockResolvedValue({ ...daily, questions: daily.questions.map(question => ({ ...question, kind: "GTO", assumptions: "레이크 없음. 파이널 테이블의 ICM을 적용합니다." })) });
    await start();
    expect(screen.getByText("레이크 없음. 파이널 테이블의 ICM을 적용합니다.")).toBeVisible();
  });
  it("keeps selected answers when moving back and submits all five only at completion", async () => {
    await start();
    expect(screen.getByRole("button", { name: "다음 문항" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "답안 제출" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "베팅" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 문항" }));
    expect(screen.getByRole("heading", { name: "2번 판단" })).toHaveFocus();
    fireEvent.click(screen.getByRole("radio", { name: "체크" }));
    fireEvent.click(screen.getByRole("button", { name: "이전 문항" }));
    expect(screen.getByRole("radio", { name: "베팅" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "다음 문항" }));
    expect(screen.getByRole("radio", { name: "체크" })).toBeChecked();
    for (let number = 2; number <= 4; number++) {
      fireEvent.click(screen.getByRole("radio", { name: "체크" }));
      fireEvent.click(screen.getByRole("button", { name: "다음 문항" }));
    }
    expect(screen.getByRole("button", { name: "답안 제출" })).toBeDisabled();
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(screen.queryByText(/^정답:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "체크" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "베팅" }));
    fireEvent.click(screen.getByRole("button", { name: "이전 문항" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 문항" }));
    expect(screen.getByRole("checkbox", { name: "체크" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "베팅" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "답안 제출" }));
    await screen.findByRole("heading", { name: "오늘의 학습 완료" });
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    const form = mocks.submit.mock.calls[0][1] as FormData;
    expect(form.get("day")).toBe("2026-09-15");
    expect([1, 2, 3, 4, 5].map(number => form.getAll("answer:10000000-0000-4000-8000-00000000000" + number))).toEqual([["b"], ["a"], ["a"], ["a"], ["a", "b"]]);
    expect(screen.getByText("3일")).toBeInTheDocument();
    expect(screen.getByText("+40 XP")).toBeInTheDocument();
  });
  it("preserves the final selections after a server error and allows retry", async () => {
    mocks.submit.mockResolvedValueOnce({ error: "연결이 끊겼습니다. 다시 제출해 주세요." });
    await start(); firstFour();
    fireEvent.click(screen.getByRole("checkbox", { name: "체크" }));
    fireEvent.click(screen.getByRole("button", { name: "답안 제출" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("다시 제출");
    expect(screen.getByRole("checkbox", { name: "체크" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "답안 제출" }));
    await screen.findByRole("heading", { name: "오늘의 학습 완료" });
    expect(mocks.submit).toHaveBeenCalledTimes(2);
  });
  it("prevents a second submission while the first result is pending", async () => {
    let finish!: (state: object) => void;
    mocks.submit.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await start(); firstFour();
    fireEvent.click(screen.getByRole("checkbox", { name: "체크" }));
    fireEvent.click(screen.getByRole("button", { name: "답안 제출" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "제출 중..." })).toBeDisabled());
    expect(screen.getByRole("button", { name: "이전 문항" })).toBeDisabled();
    finish({ error: "재시도해 주세요." });
    await screen.findByRole("alert");
  });
  it.each([false, true])("does not start an unavailable or incomplete daily set (%s)", async available => {
    mocks.rpc.mockResolvedValue({ ...daily, available, questions: daily.questions.slice(0, 4) });
    render(await LearnPage());
    expect(screen.queryByRole("button", { name: "학습 시작" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "답안 제출" })).not.toBeInTheDocument();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
