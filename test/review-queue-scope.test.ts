import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ server: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: mocks.server }));
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { getReviewQueue, requireReviewer } from "@/lib/membership/server";

const classId = "10000000-0000-4000-8000-000000000001";
const clubId = "20000000-0000-4000-8000-000000000001";
const request = { id: "request-a", user_id: "member-a", kind: "CLASS", status: "PENDING", class_id: classId, club_id: null, decision_reason: null, created_at: "2026-09-01T00:00:00Z", member: null, requested_class: { name: "담당 클래스" }, requested_club: null };
const ownOutsideScope = { ...request, id: "request-b", user_id: "leader", class_id: "10000000-0000-4000-8000-000000000002", requested_class: { name: "미담당 클래스" } };
const ownInsideScope = { ...request, id: "request-c", user_id: "leader" };
let client: SupabaseClient;
let assigned = false;
let status = "ACTIVE";
let requestedQueue = false;
let clientNumber = 0;

beforeEach(() => {
  vi.resetAllMocks(); assigned = false; status = "ACTIVE"; requestedQueue = false;
  client = createClient("https://donuts-scope.test", "isolated-test-key", { auth: { persistSession: false, autoRefreshToken: false, storageKey: `review-test-${++clientNumber}` }, global: { fetch: async input => {
    const url = new URL(String(input));
    let data: unknown = [];
    const headers = { "content-type": "application/json", "content-range": "0-0/0" };
    if (url.pathname.endsWith("/rpc/is_admin")) data = false;
    if (url.pathname.endsWith("/member_profiles")) data = [{ id: "leader", username: null, name: "리더", phone: "01000000000", school_id: null, other_school_name: "학교", status, consented_at: "2026-09-01T00:00:00Z", consent_version: "v1", created_at: "2026-09-01T00:00:00Z" }];
    if (url.pathname.endsWith("/class_leaders")) data = assigned ? [{ class_id: classId }] : [];
    if (url.pathname.endsWith("/affiliation_requests")) {
      requestedQueue = true;
      const scoped = url.searchParams.get("or") === `(and(kind.eq.CLASS,class_id.in.(${classId})),and(kind.eq.CLUB,club_id.in.(${clubId})))`;
      let rows = scoped ? [request, ownInsideScope] : [request, ownOutsideScope, ownInsideScope];
      if (url.searchParams.get("user_id") === "neq.leader") rows = rows.filter(row => row.user_id !== "leader");
      data = rows;
      headers["content-range"] = `0-${rows.length - 1}/${rows.length}`;
    }
    return new Response(JSON.stringify(data), { status: 200, headers });
  } } });
  vi.spyOn(client.auth, "getUser").mockResolvedValue({ data: { user: { id: "leader", email: "leader@donuts.test", email_confirmed_at: "2026-09-01T00:00:00Z", aud: "authenticated", created_at: "2026-09-01T00:00:00Z", app_metadata: {}, user_metadata: {} } }, error: null });
  mocks.server.mockResolvedValue(client);
});

describe("actual reviewer gate", () => {
  it("redirects an active member without any assigned leadership", async () => {
    await expect(requireReviewer()).rejects.toThrow("REDIRECT:/home");
  });
  it("admits a verified active member with an actual class assignment", async () => {
    assigned = true;
    await expect(requireReviewer()).resolves.toBe(client);
  });
  it("rejects a suspended leader even when their assignment still exists", async () => {
    assigned = true; status = "SUSPENDED";
    await expect(requireReviewer()).rejects.toThrow("REDIRECT:/membership/status");
  });
});

describe("leader approval queue scope", () => {
  it("excludes the leader's own application to an unrelated class from the queue and count", async () => {
    expect(await getReviewQueue(client, 1, "PENDING", { classIds: [classId], clubIds: [clubId] })).toEqual({ requests: [request, ownInsideScope], count: 2 });
  });
  it("omits a leader's own in-scope application because they cannot process it", async () => {
    expect(await getReviewQueue(client, 1, "PENDING", { classIds: [classId], clubIds: [clubId], excludeUserId: "leader" })).toEqual({ requests: [request], count: 1 });
  });
  it("returns no applications when current assignments are empty", async () => {
    expect(await getReviewQueue(client, 1, "PENDING", { classIds: [], clubIds: [] })).toEqual({ requests: [], count: 0 });
    expect(requestedQueue).toBe(false);
  });
  it("preserves the full administrative query when no scope is supplied", async () => {
    expect((await getReviewQueue(client)).count).toBe(3);
  });
});
