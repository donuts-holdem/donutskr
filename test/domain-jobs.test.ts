import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const run = vi.hoisted(() => vi.fn());
vi.mock("@/lib/notifications/worker", () => ({ runDomainJobs: run }));
import { POST } from "@/app/api/jobs/domains/route";

beforeEach(() => { run.mockReset(); run.mockResolvedValue({ maintained: 1, emailEnabled: false, sent: 0, failed: 0 }); });
afterEach(() => vi.unstubAllEnvs());

describe("domain job authorization", () => {
  it("fails closed without a configured secret", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await POST(new Request("https://donuts.test/api/jobs/domains"))).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });
  it("rejects missing and incorrect bearer credentials", async () => {
    vi.stubEnv("CRON_SECRET", "fixture-secret");
    for (const value of ["", "Bearer wrong", "Bearer fixture-secrex"]) {
      expect((await POST(new Request("https://donuts.test/api/jobs/domains", { headers: { authorization: value } }))).status).toBe(401);
    }
    expect(run).not.toHaveBeenCalled();
  });
  it("runs maintenance only with the exact secret", async () => {
    vi.stubEnv("CRON_SECRET", "fixture-secret");
    const response = await POST(new Request("https://donuts.test/api/jobs/domains", { headers: { authorization: "Bearer fixture-secret" } }));
    expect(response.status).toBe(200); expect(run).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ maintained: 1, emailEnabled: false, sent: 0, failed: 0 });
  });
});
