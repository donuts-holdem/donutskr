import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SessionList } from "@/components/classes/SessionList";
import { courseProgress, suggestClassName } from "@/lib/classes/format";
import type { ClassSession } from "@/lib/classes/types";

afterEach(cleanup);

function session(overrides: Partial<ClassSession> = {}): ClassSession {
  return {
    id: "session-1", class_id: "class-1", session_number: 1,
    title: "Position Game", description: "포지션에 따른 오픈 범위를 비교합니다.",
    scheduled_at: "2026-09-16T10:00:00.000Z", status: "SCHEDULED",
    first_started_at: null, started_at: null, completed_at: null, cancelled_at: null,
    cancellation_reason: null, roster_run: 0, attendance_saved_at: null,
    attendance_locked: false, revision: 1, ...overrides,
  };
}

describe("member class sessions", () => {
  it("opens the course-scoped detail from a session title", () => {
    render(<SessionList sessions={[session()]} memberPath="/class/class-1" />);
    expect(screen.getByRole("link", { name: "Position Game" })).toHaveAttribute("href", "/class/class-1/sessions/session-1");
    expect(screen.getByText("포지션에 따른 오픈 범위를 비교합니다.")).toBeVisible();
  });

  it("keeps cancelled sessions in the timeline with their actual date and attendance", () => {
    render(<SessionList sessions={[session({ status: "COMPLETED", completed_at: "2026-09-16T12:00:00.000Z", cancelled_at: "2026-09-17T00:00:00.000Z", cancellation_reason: "운영 취소", roster_run: 1, attendance_locked: true })]} memberPath="/class/class-1" ownAttendance={[{
      session_id: "session-1", roster_run: 1, user_id: "member-1", snapshot_name: "회원", snapshot_username: null, mark: "PRESENT", checked_at: "2026-09-16T10:00:00.000Z",
    }]} />);
    expect(screen.getByRole("link", { name: "Position Game" })).toBeVisible();
    expect(screen.getByText(/내 출석: 출석/)).toBeVisible();
    expect(document.querySelector("time")).toHaveAttribute("dateTime", "2026-09-16T10:00:00.000Z");
    expect(screen.getByText(/취소 사유: 운영 취소/)).toBeVisible();
  });
});

describe("class progress", () => {
  it("separates cancellation from completed teaching and chooses actual next dates", () => {
    const next = session({ id: "next", session_number: 4, scheduled_at: "2026-09-15T10:00:00Z" });
    expect(courseProgress([
      session({ status: "COMPLETED", completed_at: "2026-09-01T12:00:00Z" }),
      session({ id: "cancelled", status: "COMPLETED", completed_at: "2026-09-02T12:00:00Z", cancelled_at: "2026-09-03T00:00:00Z" }),
      session({ id: "later", session_number: 3 }), next,
    ])).toEqual({ total: 4, completed: 1, cancelled: 1, remaining: 2, current: next });
  });

  it("prioritizes a running session even when a planned session has an earlier date", () => {
    const running = session({ id: "running", status: "IN_PROGRESS", session_number: 2 });
    expect(courseProgress([session({ scheduled_at: "2026-09-01T10:00:00Z" }), running]).current).toEqual(running);
  });

  it("has no current session when all sessions are completed or cancelled", () => {
    expect(courseProgress([session({ status: "COMPLETED" }), session({ id: "cancelled", cancelled_at: "2026-09-01T00:00:00Z" })])).toEqual({ total: 2, completed: 1, cancelled: 1, remaining: 0, current: null });
    expect(courseProgress([])).toEqual({ total: 0, completed: 0, cancelled: 0, remaining: 0, current: null });
  });
});

describe("suggested class names", () => {
  it("picks the first unused weekday suffix while leaving other weekdays independent", () => {
    expect(suggestClassName(1, ["DO:NUTS CLASS·월요일 A", "DO:NUTS CLASS·월요일 C", "DO:NUTS CLASS·수요일 B"])).toBe("DO:NUTS CLASS·월요일 B");
    expect(suggestClassName(3, [])).toBe("DO:NUTS CLASS·수요일 A");
  });

  it("continues beyond Z without imposing a class count limit", () => {
    const names = Array.from({ length: 26 }, (_, index) => `DO:NUTS CLASS·금요일 ${String.fromCharCode(65 + index)}`);
    expect(suggestClassName(5, names)).toBe("DO:NUTS CLASS·금요일 AA");
  });
});
