import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), softDelete: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleSupabase: () => ({ auth: { admin: { deleteUser: mocks.softDelete } } }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/auth/actions", () => ({ requestPasswordReset: vi.fn() }));
vi.mock("@/lib/membership/operations", () => ({ refreshOperations: vi.fn() }));
vi.mock("@/lib/domains/server", () => ({ refreshDomains: vi.fn(), actionError: (error: Error) => ({ error: error.message }) }));
import { withdrawMember } from "@/app/admin/actions/member-profile";

function request() {
  const form = new FormData();
  form.set("user_id", "a138bd8d-6a64-4b30-9e12-75e964c9bc74");form.set("reason", "본인 요청");form.set("confirm", "on");
  return form;
}
describe("member withdrawal", () => {
  beforeEach(() => { vi.clearAllMocks();mocks.requireAdmin.mockResolvedValue({ rpc: mocks.rpc });mocks.rpc.mockResolvedValue({ error: null });mocks.softDelete.mockResolvedValue({ error: null }); });
  it("keeps cleanup pending when Auth is unavailable and completes on retry", async () => {
    mocks.softDelete.mockResolvedValueOnce({ error: new Error("Provider offline") });
    expect((await withdrawMember({}, request())).error).toContain("다시");
    expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(["begin_member_withdrawal"]);
    expect((await withdrawMember({}, request())).success).toBeTruthy();
    expect(mocks.softDelete).toHaveBeenCalledWith("a138bd8d-6a64-4b30-9e12-75e964c9bc74", true);
    expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(["begin_member_withdrawal", "begin_member_withdrawal", "finish_member_withdrawal"]);
  });
  it("does not touch Auth after the authoritative database refuses withdrawal", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { message: "forbidden" } });
    expect((await withdrawMember({}, request())).error).toBeTruthy();expect(mocks.softDelete).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation before beginning withdrawal", async () => {
    const form=request();form.delete("confirm");expect((await withdrawMember({},form)).error).toBeTruthy();expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
