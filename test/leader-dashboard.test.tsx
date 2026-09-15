import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassRecord } from "@/lib/classes/types";
import type { ClubRecord } from "@/lib/clubs/types";

const mocks = vi.hoisted(() => ({ reviewer: vi.fn(), classes: vi.fn(), clubs: vi.fn(), queue: vi.fn() }));
vi.mock("@/lib/membership/server", () => ({ requireReviewer: mocks.reviewer, getReviewQueue: mocks.queue }));
vi.mock("@/lib/classes/server", () => ({ getClassIndex: mocks.classes }));
vi.mock("@/lib/clubs/server", () => ({ getClubIndex: mocks.clubs }));
import LeaderDashboardPage from "@/app/(member)/leader/page";

const course: ClassRecord = { id: "10000000-0000-4000-8000-000000000001", name: "담당 월요일 클래스", description: "", place: "사당", weekday: 1, start_time: "19:00:00", active: true, first_started_at: null, closed_at: null, first_closed_at: null, archived_at: null, revision: 1, created_at: "2026-09-01T00:00:00Z" };
const club: ClubRecord = { id: "20000000-0000-4000-8000-000000000001", name: "담당 클럽", school_id: "school", description: "", logo_url: null, default_atc: null, archived_at: null, revision: 1, created_at: "2026-09-01T00:00:00Z" };
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.reviewer.mockResolvedValue({});
  mocks.classes.mockResolvedValue({ classes: [course], isAdmin: false, user: { id: "leader" } });
  mocks.clubs.mockResolvedValue({ clubs: [], schools: [], isAdmin: false });
  mocks.queue.mockResolvedValue({ requests: [], count: 7 });
});

describe("leader dashboard permissions", () => {
  it("rejects a non-reviewer before querying the operating domains", async () => {
    mocks.reviewer.mockRejectedValue(new Error("Redirect to member home"));
    await expect(LeaderDashboardPage()).rejects.toThrow("Redirect to member home");
    expect(mocks.classes).not.toHaveBeenCalled();
    expect(mocks.queue).not.toHaveBeenCalled();
  });

  it("gives a class-only leader their course and approval count without club meeting management", async () => {
    render(await LeaderDashboardPage({ searchParams: Promise.resolve({ view: "club" }) }));
    expect(screen.getByRole("link", { name: /담당 월요일 클래스/ })).toHaveAttribute("href", `/leader/class/${course.id}`);
    expect(screen.getByRole("link", { name: /승인 대기.*7/ })).toHaveAttribute("href", "/leader/approvals");
    expect(screen.queryByRole("link", { name: "모임 운영" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "회원 홈" })).toHaveAttribute("href", "/home");
    expect(mocks.queue).toHaveBeenCalledWith(expect.anything(), 1, "PENDING", { classIds: [course.id], clubIds: [], excludeUserId: "leader" });
  });

  it("adds club management and meetings only for the assigned club scope", async () => {
    mocks.clubs.mockResolvedValue({ clubs: [club], schools: [{ id: "school", name: "학교", active: true }], isAdmin: false });
    render(await LeaderDashboardPage({ searchParams: Promise.resolve({ view: "club" }) }));
    expect(screen.getByRole("link", { name: /담당 클럽/ })).toHaveAttribute("href", `/leader/club/${club.id}`);
    expect(screen.getByRole("link", { name: "모임 운영" })).toHaveAttribute("href", "/leader/meetings");
    expect(mocks.queue).toHaveBeenCalledWith(expect.anything(), 1, "PENDING", { classIds: [course.id], clubIds: [club.id], excludeUserId: "leader" });
    expect(screen.getAllByRole("heading", { level: 2 }).map(heading => heading.textContent)).toEqual(["담당 클럽", "담당 클래스"]);
  });

  it("uses administrator routes and an unscoped review queue for a verified admin", async () => {
    mocks.classes.mockResolvedValue({ classes: [course], isAdmin: true });
    mocks.clubs.mockResolvedValue({ clubs: [], schools: [], isAdmin: true });
    render(await LeaderDashboardPage());
    expect(screen.getByRole("link", { name: /담당 월요일 클래스/ })).toHaveAttribute("href", `/admin/classes/${course.id}`);
    expect(screen.getByRole("link", { name: "모임 운영" })).toHaveAttribute("href", "/admin/meetings");
    expect(mocks.queue).toHaveBeenCalledWith(expect.anything(), 1, "PENDING", undefined);
  });
});
