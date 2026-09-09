import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: {
    auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn() },
    rpc: vi.fn(), from: vi.fn(),
  },
  service: { rpc: vi.fn() }, profile: vi.fn(), session: vi.fn(), admin: vi.fn(),
  redirect: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: async () => mocks.client }));
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleSupabase: () => mocks.service }));
vi.mock("@/lib/membership/server", () => ({ getMembershipSession: mocks.session }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));

import { loginMember, requestPasswordReset, signupMember } from "@/app/auth/actions";
import { parseApplication, parseEmail } from "@/lib/membership/validation";

const password = "isolated-unit-password-123";
const user = { id: "10000000-0000-4000-8000-000000000001", email: "member@example.com", email_confirmed_at: "2026-09-09T00:00:00Z" };
function form(email = user.email) {
  const data = new FormData(); data.set("email", email); data.set("password", password); return data;
}
function application() {
  const data = form();
  for (const [key, value] of Object.entries({ name: "Unit member", phone: "01012345678",
    school_id: "20000000-0000-4000-8000-000000000001", class_id: "30000000-0000-4000-8000-000000000001",
    club_id: "none", consent: "on", consent_version: "unit-v1", password_confirm: password })) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SITE_URL", "https://donutskr.vercel.app");
  mocks.redirect.mockImplementation((path: string) => { throw new Error("REDIRECT:" + path); });
  mocks.service.rpc.mockResolvedValue({ data: true, error: null });
  mocks.client.rpc.mockResolvedValue({ data: false, error: null });
  mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
  mocks.client.auth.signOut.mockResolvedValue({ error: null });
  mocks.client.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mocks.client.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.profile.mockResolvedValue({ data: { status: "ACTIVE" }, error: null });
  mocks.client.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) });
  mocks.session.mockResolvedValue({ supabase: mocks.client, user: null, profile: null });
  mocks.admin.mockResolvedValue(mocks.client);
});
afterEach(() => vi.unstubAllEnvs());

describe("email-only login", () => {
  it("normalizes email, authenticates directly and refreshes the shared session", async () => {
    await expect(loginMember({}, form("  MEMBER@EXAMPLE.COM  "))).rejects.toThrow("REDIRECT:/home");
    expect(mocks.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: user.email, password });
    expect(mocks.service.rpc).toHaveBeenCalledOnce();
    expect(mocks.service.rpc).toHaveBeenCalledWith("consume_member_auth_attempt", {
      p_key: createHash("sha256").update("login:" + user.email).digest("hex"),
    });
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });
  it.each(["old field", "plain username", "malformed email"])("rejects %s before authentication", async mode => {
    const data = form(mode === "plain username" ? "demo_member" : "not an email");
    if (mode === "old field") { data.delete("email"); data.set("username", user.email); }
    expect((await loginMember({}, data)).error).toBeTruthy();
    expect(mocks.client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.service.rpc).not.toHaveBeenCalled();
  });
  it.each(["", "x".repeat(257)])("rejects an invalid password length", async value => {
    const data = form(); data.set("password", value);
    expect((await loginMember({}, data)).error).toBeTruthy();
    expect(mocks.client.auth.signInWithPassword).not.toHaveBeenCalled();
  });
  it("returns a generic error for invalid credentials without redirecting", async () => {
    mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: "invalid_credentials" } });
    expect((await loginMember({}, form())).error).toContain("이메일 또는 비밀번호");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it.each(["PENDING", "SUSPENDED", "WITHDRAWN"])("keeps %s members behind the status gate", async status => {
    mocks.profile.mockResolvedValue({ data: { status }, error: null });
    await expect(loginMember({}, form())).rejects.toThrow("REDIRECT:/membership/status");
  });
  it("does not give an unverified ACTIVE identity member access", async () => {
    mocks.client.auth.signInWithPassword.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    await expect(loginMember({}, form())).rejects.toThrow("REDIRECT:/membership/status");
  });
  it("sends an authenticated identity without a profile to enrollment", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: null });
    await expect(loginMember({}, form())).rejects.toThrow("REDIRECT:/signup");
  });
  it("keeps the admin DB and environment authorization path without requiring a member profile", async () => {
    mocks.client.rpc.mockResolvedValue({ data: true, error: null });
    await expect(loginMember({}, form())).rejects.toThrow("REDIRECT:/admin");
    expect(mocks.admin).toHaveBeenCalledOnce();
    expect(mocks.client.from).not.toHaveBeenCalled();
  });
  it.each(["permission error", "non-boolean permission", "profile error", "admin allowlist"])("clears the new session on %s", async failure => {
    if (failure === "permission error") mocks.client.rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    if (failure === "non-boolean permission") mocks.client.rpc.mockResolvedValue({ data: "true", error: null });
    if (failure === "profile error") mocks.profile.mockResolvedValue({ data: null, error: { message: "offline" } });
    if (failure === "admin allowlist") {
      mocks.client.rpc.mockResolvedValue({ data: true, error: null });
      mocks.admin.mockRejectedValue(new Error("Forbidden"));
    }
    expect((await loginMember({}, form())).error).toBeTruthy();
    expect(mocks.client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it.each(["limited", "unavailable"])("fails closed when login throttling is %s", async mode => {
    mocks.service.rpc.mockResolvedValue({ data: false, error: mode === "unavailable" ? { message: "offline" } : null });
    expect((await loginMember({}, form())).error).toBeTruthy();
    expect(mocks.client.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("email-only enrollment and recovery", () => {
  it("parses enrollment without inventing or accepting a login username", () => {
    const data = application();
    expect(parseApplication(data)).toMatchObject({ name: "Unit member", consent: true });
    data.set("username", "forged_username");
    expect(parseApplication(data)).not.toHaveProperty("username");
    expect(parseApplication(data)).not.toHaveProperty("email");
  });
  it("retains consent and required class validation", () => {
    const data = application(); data.delete("consent");
    expect(() => parseApplication(data)).toThrow();
    data.set("consent", "on"); data.delete("class_id");
    expect(() => parseApplication(data)).toThrow();
  });
  it("uses the existing Auth signup trigger with a username-free payload", async () => {
    await expect(signupMember({}, application())).rejects.toThrow("REDIRECT:/signup/complete");
    const [payload] = mocks.client.auth.signUp.mock.calls[0];
    expect(payload).toMatchObject({ email: user.email, password });
    expect(payload.options.data.donuts_membership).not.toHaveProperty("username");
    expect(payload.options.emailRedirectTo).toBe("https://donutskr.vercel.app/auth/callback?next=%2Fmembership%2Fstatus");
  });
  it("enrolls an existing identity without creating another Auth account", async () => {
    mocks.session.mockResolvedValue({ supabase: mocks.client, user, profile: null });
    await expect(signupMember({}, application())).rejects.toThrow("REDIRECT:/membership/status");
    expect(mocks.client.auth.signUp).not.toHaveBeenCalled();
    const [name, args] = mocks.client.rpc.mock.calls[0];
    expect(name).toBe("submit_membership_application");
    expect(args.p_payload).not.toHaveProperty("username");
  });
  it("uses the same normalized email for recovery", async () => {
    expect(parseEmail(form(" MEMBER@EXAMPLE.COM "))).toBe(user.email);
    expect((await requestPasswordReset({}, form(" MEMBER@EXAMPLE.COM "))).success).toBeTruthy();
    expect(mocks.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(user.email, {
      redirectTo: "https://donutskr.vercel.app/auth/callback?next=%2Freset-password",
    });
  });
  it("does not disclose account existence when recovery is throttled", async () => {
    const success = await requestPasswordReset({}, form());
    mocks.service.rpc.mockResolvedValue({ data: false, error: null });
    mocks.client.auth.resetPasswordForEmail.mockClear();
    expect(await requestPasswordReset({}, form())).toEqual(success);
    expect(mocks.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
