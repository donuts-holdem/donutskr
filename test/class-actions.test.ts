import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), operator: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/membership/operations", () => ({ requireEntityOperator: mocks.operator, refreshOperations: mocks.refresh }));
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("server-only", () => ({}));
import { rescheduleClassSessions } from "@/app/classes/actions";

function submission() {
  const form = new FormData();
  form.set("class_id", "10000000-0000-4000-8000-000000000001");
  form.set("session_id", "20000000-0000-4000-8000-000000000001");
  form.set("scheduled_at", "2026-09-10T19:30");
  form.set("reason", "일정 정정");
  form.set("expected", JSON.stringify({ "20000000-0000-4000-8000-000000000001": 1 }));
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.operator.mockResolvedValue({ supabase: { rpc: mocks.rpc }, isAdmin: true });
  mocks.rpc.mockResolvedValue({ error: null });
});

describe("server-side schedule submission", () => {
  it("rejects a future shift without confirmation before writing", async () => {
    const form = submission(); form.set("move_future", "on");
    expect((await rescheduleClassSessions({}, form)).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects impossible dates before writing", async () => {
    const form = submission(); form.set("scheduled_at", "2026-02-30T19:30");
    expect((await rescheduleClassSessions({}, form)).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("checks operator permissions", async () => {
    mocks.operator.mockRejectedValue(new Error("Forbidden"));
    await expect(rescheduleClassSessions({}, submission())).rejects.toThrow("Forbidden");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("passes confirmed dates and exact revisions to the atomic RPC", async () => {
    const form = submission(); form.set("move_future", "on"); form.set("confirm_shift", "on");
    const result = await rescheduleClassSessions({}, form);
    expect(result.error).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith("reschedule_class_sessions", expect.objectContaining({
      p_scheduled_at: "2026-09-10T10:30:00.000Z", p_move_future: true,
      p_expected: { "20000000-0000-4000-8000-000000000001": 1 },
    }));
  });
});
