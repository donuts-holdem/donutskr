import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), admin: vi.fn(), refresh: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { deletePartner, reorderPartners, savePartner } from "@/app/admin/actions/partners";

const id = "10000000-0000-4000-8000-000000000001";
function form() {
  const value = new FormData();
  for (const [key, content] of Object.entries({ id, revision: "7", name: "파트너", description: "회원 소개", url: "https://partner.example", logo_url: "https://storage.example/logo.png" })) value.set(key, content);
  return value;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: id, error: null });
});

describe("partner server mutations", () => {
  it("checks admin permission before accepting a write", async () => {
    mocks.admin.mockRejectedValue(new Error("Forbidden"));
    await expect(savePartner({}, form())).rejects.toThrow("Forbidden");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects malicious URLs before they reach persistence", async () => {
    const value = form(); value.set("url", "javascript:alert(1)");
    expect((await savePartner({}, value)).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("submits the saved logo URL and exact revision for an atomic edit", async () => {
    expect((await savePartner({}, form())).error).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith("save_partner", {
      p_id: id, p_expected_revision: 7,
      p_payload: { name: "파트너", description: "회원 소개", url: "https://partner.example/", logo_url: "https://storage.example/logo.png" },
    });
    expect(mocks.refresh.mock.calls.map(call => call[0])).toContain("/home");
  });
  it("reports a stale edit without claiming it was saved", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "stale_partner" } });
    const result = await savePartner({}, form());
    expect(result.error).toMatch(/새로고침/);
    expect(result.success).toBeUndefined();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("requires deletion confirmation and the current revision", async () => {
    expect((await deletePartner({}, form())).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
    const value = form(); value.set("confirm", "on");
    await deletePartner({}, value);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_partner", { p_id: id, p_expected_revision: 7 });
  });
  it("sends the whole reorder snapshot without dropping revisions", async () => {
    const value = new FormData(); value.set("order", JSON.stringify([{ id, revision: 7 }]));
    await reorderPartners({}, value);
    expect(mocks.rpc).toHaveBeenCalledWith("reorder_partners", { p_order: [{ id, revision: 7 }] });
  });
});
