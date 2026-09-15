import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ activity: vi.fn() }));
vi.mock("@/lib/xp/server", () => ({ getMyClassActivity: mocks.activity }));
import { MyClassActivity } from "@/components/classes/MyClassActivity";

afterEach(cleanup);
describe("unified member XP history", () => {
  it("labels learning completion and perfect bonus alongside class attendance", async () => {
    mocks.activity.mockResolvedValue({ total_xp: 140, weekly_xp: 40, level: 2, level_start_xp: 100, next_level_xp: 300, attendance: [], ledger: [
      { id: "completion", delta: 30, reason: "Daily five-question completion", created_at: "2026-09-15T10:00:00Z", source_kind: "DAILY_LEARNING", learning_day: "2026-09-15", class_name: null, session_number: null },
      { id: "bonus", delta: 10, reason: "All correct on first graded submission", created_at: "2026-09-15T10:00:00Z", source_kind: "DAILY_LEARNING", learning_day: "2026-09-15", class_name: null, session_number: null },
      { id: "class", delta: 100, reason: "COMPLETE", created_at: "2026-09-10T10:00:00Z", source_kind: "CLASS_ATTENDANCE", learning_day: null, class_name: "목요 클래스", session_number: 3 },
    ] });
    render(await MyClassActivity());
    expect(screen.getByText("이번 주 XP")).toBeInTheDocument();
    expect(screen.getByText("40 XP")).toBeInTheDocument();
    expect(screen.getByText("오늘의 학습 · 2026-09-15")).toBeInTheDocument();
    expect(screen.getByText("전 문항 정답 보너스 · 2026-09-15")).toBeInTheDocument();
    expect(screen.getByText("목요 클래스 / 3회차")).toBeInTheDocument();
    expect(screen.queryByText(/Daily five-question/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\s*\/\s*회차/)).not.toBeInTheDocument();
  });
});
