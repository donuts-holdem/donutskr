import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
import { runDomainJobs, emailDeliveryConfigured } from "@/lib/notifications/worker";

beforeEach(() => {
  rpc.mockReset(); rpc.mockResolvedValue({ data: 2, error: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-key");
  vi.stubEnv("NOTIFICATION_EMAIL_ENABLED", "false");
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("deferred Resend delivery", () => {
  it("maintains meetings without claiming or sending email when delivery is disabled", async () => {
    expect(emailDeliveryConfigured()).toBe(false);
    expect(await runDomainJobs()).toEqual({ maintained: 2, emailEnabled: false, sent: 0, failed: 0 });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("maintain_club_meetings");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not activate delivery solely because a provider key exists", async () => {
    vi.stubEnv("RESEND_API_KEY", "fixture-provider-key");
    vi.stubEnv("NOTIFICATIONS_FROM_EMAIL", "fixture@donuts.test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://donuts.test");
    await runDomainJobs();
    expect(fetch).not.toHaveBeenCalled();
  });
});
