import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), sign: vi.fn(), publicUrl: vi.fn(), bucket: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));
import { POST } from "@/app/api/admin/images/route";

const image = { name: "../../logo.PNG", type: "image/png", size: 10 * 1024 * 1024, folder: "../../untrusted" };
function request(body: unknown = image, origin = "https://donuts.example") {
  return { url: "https://donuts.example/api/admin/images", headers: new Headers({ origin, "content-type": "application/json" }), json: async () => body } as Request;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.bucket.mockReturnValue({ createSignedUploadUrl: mocks.sign, getPublicUrl: mocks.publicUrl });
  mocks.admin.mockResolvedValue({ storage: { from: mocks.bucket } });
  mocks.sign.mockImplementation(async (path: string) => ({ data: { path, token: "test-upload-token" }, error: null }));
  mocks.publicUrl.mockReturnValue({ data: { publicUrl: "https://storage.example/object/public/media/site_media/saved.png" } });
});
describe("shared admin image uploads", () => {
  it("rejects non-admin and cross-origin requests before storage access", async () => {
    mocks.admin.mockRejectedValueOnce(new Error("Forbidden"));
    expect((await POST(request())).status).toBe(403);
    expect((await POST(request(undefined, "https://other.example"))).status).toBe(403);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("rejects missing, malformed, oversized, and non-image metadata", async () => {
    for (const body of [null, {}, { ...image, type: "text/plain" }, { ...image, size: 0 }, { ...image, size: -1 }, { ...image, size: "10" }, { ...image, size: image.size + 1 }, { ...image, name: null }]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("signs a 10MB image upload in the existing bucket without receiving file bytes", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ bucket: "media", path: expect.stringMatching(/^site_media\/\d+-[0-9a-f-]+\.png$/), token: "test-upload-token", url: "https://storage.example/object/public/media/site_media/saved.png" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.bucket).toHaveBeenCalledWith("media");
    expect(mocks.sign).toHaveBeenCalledWith(expect.stringMatching(/^site_media\/\d+-[0-9a-f-]+\.png$/), { upsert: false });
  });
  it("does not return a usable URL when storage fails", async () => {
    mocks.sign.mockResolvedValue({ data: null, error: { message: "storage failure" } });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect((await response.json()).url).toBeUndefined();
  });
  it("returns an unauthenticated response without signing", async () => {
    mocks.admin.mockRejectedValueOnce(new Error("Unauthorized"));
    expect((await POST(request())).status).toBe(401);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
