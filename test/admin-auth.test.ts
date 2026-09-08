import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(async () => client),
}));

import { requireAdmin } from "@/lib/auth";

beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "");
  client.auth.getUser.mockResolvedValue({
    data: { user: { id: "admin-id", email: "operator@example.com" } },
    error: null,
  });
  client.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("admin authorization", () => {
  it("rejects unauthenticated requests", async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireAdmin()).rejects.toThrow("Unauthorized");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("does not grant privileges to a member when the env allowlist is absent", async () => {
    client.rpc.mockResolvedValue({ data: false, error: null });
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });

  it("fails closed when the DB permission check fails", async () => {
    client.rpc.mockResolvedValue({ data: null, error: new Error("unavailable") });
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });

  it("accepts an administrator explicitly authorized by the DB", async () => {
    await expect(requireAdmin()).resolves.toBe(client);
    expect(client.rpc).toHaveBeenCalledWith("is_admin");
  });

  it("honors the optional additional environment restriction", async () => {
    vi.stubEnv("ADMIN_EMAILS", "someone-else@example.com");
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });

  it("still requires DB permission when the email matches the environment", async () => {
    vi.stubEnv("ADMIN_EMAILS", "operator@example.com");
    client.rpc.mockResolvedValue({ data: false, error: null });
    await expect(requireAdmin()).rejects.toThrow("Forbidden");
  });
});
