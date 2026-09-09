import { mkdirSync, writeFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), board: vi.fn(), member: vi.fn() }));
vi.mock("@/lib/domains/server", () => ({ domainRpc: mocks.rpc }));
vi.mock("@/lib/membership/server", () => ({ requireActiveMember: mocks.member }));
vi.mock("@/lib/meetings/server", () => ({ getMeetingBoard: mocks.board }));
vi.mock("@/app/learning/actions", () => ({ submitLearning: vi.fn(async () => ({})), saveQuestion: vi.fn(async () => ({})) }));
vi.mock("@/app/meetings/actions", () => ({ applyMeeting: vi.fn(async () => ({})), respondMeeting: vi.fn(async () => ({})), closeMeeting: vi.fn(async () => ({})), saveMeeting: vi.fn(async () => ({})) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/learn" }));
import MemberLayout from "@/app/(member)/layout";
import LearnPage from "@/app/(member)/learn/page";
import { MeetingDetail } from "@/components/meetings/MeetingDetail";
import { QuestionComposer } from "@/components/learning/QuestionComposer";
import type { DailyLearning } from "@/lib/learning/types";

function snapshot(name: string) {
  const directory = process.env.DONUTS_UI_FIXTURE_OUTPUT;
  if (!directory) return;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(directory + "/" + name + ".html", document.body.innerHTML);
}
const daily: DailyLearning = {
  day: "2026-09-09", available: true, result: null,
  questions: [1, 2, 3, 4, 5].map((number) => ({
    id: "10000000-0000-4000-8000-00000000000" + number, prompt: number + "번 테스트 문항: 주어진 조건을 확인하고 다음 판단을 선택하세요.",
    choices: [{ id: "a", text: "체크하여 다음 액션을 확인한다" }, { id: "b", text: "베팅한다" }, { id: "c", text: "폴드한다" }],
    answer_mode: number === 5 ? "MULTIPLE" : "SINGLE", difficulty: "BEGINNER", kind: "GENERAL", assumptions: null,
  })),
};
beforeEach(() => { mocks.rpc.mockReset(); mocks.board.mockReset(); mocks.member.mockResolvedValue({ supabase: {}, profile: { id: "member", status: "ACTIVE" } }); });
afterEach(cleanup);

describe("domain screens", () => {
  it("renders a five-question form without exposing answer keys", async () => {
    mocks.rpc.mockResolvedValue(daily);
    render(<MemberLayout>{await LearnPage()}</MemberLayout>);
    expect(screen.getAllByRole("radio")).toHaveLength(12);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "5문항 제출 · 서버 채점" })).toBeEnabled();
    expect(screen.queryByText(/^정답:/)).not.toBeInTheDocument();
    snapshot("learn");
  });
  it("shows an intentional content-unavailable state rather than generating fallback questions", async () => {
    mocks.rpc.mockResolvedValue({ ...daily, available: false, questions: [] });
    render(<MemberLayout>{await LearnPage()}</MemberLayout>);
    expect(screen.getByRole("heading", { name: "오늘의 문항을 준비 중입니다" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /서버 채점/ })).not.toBeInTheDocument();
    snapshot("learn-empty");
  });
  it("renders a reserved meeting offer with explicit confirm and decline controls", async () => {
    mocks.board.mockResolvedValue({ isAdmin: false, board: {
      meeting: { id: "meeting", club_id: "club", title: "전략을 나누는 저녁", description: "테스트용 클럽 모임. 실제 운영 데이터가 아닙니다.", place: "도너츠 클럽룸", scheduled_at: "2026-09-20T10:00:00Z", capacity: 12, status: "OPEN", signup_open: true },
      can_manage: false, eligible: true, club_name: "DO:NUTS CLUB", confirmed: 11, reserved: 1, waiting: 2, people: [],
      application: { id: "application", status: "OFFERED", offer_expires_at: "2026-09-19T10:00:00Z" },
    } });
    render(<MemberLayout>{await MeetingDetail({ id: "meeting" })}</MemberLayout>);
    expect(screen.getByRole("button", { name: "제안받은 자리 참여 확정" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "자리 제안 거절" })).toBeEnabled();
    expect(screen.queryByText("모임 정보 변경")).not.toBeInTheDocument();
    snapshot("meeting");
  });
  it("renders the real administrator authoring controls", () => {
    render(<main className="mx-auto max-w-3xl p-4 font-editorial md:p-8"><h1 className="mb-8 text-3xl font-bold">문항 제작</h1><QuestionComposer /></main>);
    expect(screen.getByRole("button", { name: "자체 제작 문항 초안 등록" })).toBeEnabled();
    snapshot("composer");
  });
});
