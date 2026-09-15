import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassRecord, ClassSession } from "@/lib/classes/types";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), requireMember: vi.fn() }));
vi.mock("@/lib/membership/server", () => ({ requireActiveMember: mocks.requireMember, getLeaderAssignments: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("Not found"); } }));
import { getClassOverview, getSessionOverview } from "@/lib/classes/server";

const classId = "10000000-0000-4000-8000-000000000001";
const sessionId = "20000000-0000-4000-8000-000000000001";
const course: ClassRecord = { id: classId, name: "포지션 클래스", description: "", place: "사당", weekday: 1, start_time: "19:00:00", active: false, first_started_at: null, closed_at: "2026-09-01T12:00:00Z", first_closed_at: "2026-09-01T12:00:00Z", archived_at: null, revision: 1, created_at: "2026-08-01T00:00:00Z" };
const session: ClassSession = { id: sessionId, class_id: classId, session_number: 1, title: "Position Game", description: "포지션별 오픈 범위", scheduled_at: "2026-09-01T10:00:00Z", status: "COMPLETED", first_started_at: "2026-09-01T10:00:00Z", started_at: "2026-09-01T10:00:00Z", completed_at: "2026-09-01T12:00:00Z", cancelled_at: null, cancellation_reason: null, roster_run: 1, attendance_saved_at: "2026-09-01T11:00:00Z", attendance_locked: true, revision: 1 };

function query(data: unknown) {
  return {
    select() { return this; }, eq() { return this; }, order() { return this; }, range() { return this; },
    maybeSingle: async () => ({ data, error: null }), returns: async () => ({ data, error: null }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireMember.mockResolvedValue({ user: { id: "member" }, isAdmin: false, supabase: { from: mocks.from, rpc: mocks.rpc } });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  mocks.from.mockImplementation((table: string) => query(table === "classes" ? course : table === "class_sessions" ? [session] : table === "class_memberships" ? null : []));
});

describe("member session reads", () => {
  it("distinguishes historical session access from a full course affiliation", async () => {
    const overview = await getClassOverview(classId);
    expect(overview.sessions).toEqual([session]);
    expect(overview.hasAffiliation).toBe(false);
  });

  it("marks the full class visible for a current affiliated member", async () => {
    mocks.from.mockImplementation((table: string) => query(table === "classes" ? course : table === "class_sessions" ? [session] : table === "class_memberships" ? { class_id: classId } : []));
    expect((await getClassOverview(classId)).hasAffiliation).toBe(true);
  });

  it("does not resolve a session that is absent from the requested course's RLS result", async () => {
    await expect(getSessionOverview(classId, "20000000-0000-4000-8000-000000000002")).rejects.toThrow("Not found");
    expect((await getSessionOverview(classId, sessionId)).session.title).toBe("Position Game");
  });
});
