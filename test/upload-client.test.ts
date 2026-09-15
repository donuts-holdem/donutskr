import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ from: vi.fn(), uploadToSignedUrl: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ createBrowserSupabase: () => ({ storage }) }));
import { uploadAdminImage } from "@/lib/upload-client";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";

const signed = { bucket: "media", path: "site_media/test.png", token: "test-upload-token", url: "https://storage.example/test.png" };
beforeEach(() => {
  vi.resetAllMocks();
  storage.from.mockReturnValue(storage);
  storage.uploadToSignedUrl.mockResolvedValue({ data: { path: signed.path }, error: null });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(signed)));
});
afterEach(() => vi.unstubAllGlobals());

describe("direct admin image upload", () => {
  it("sends only metadata through the app and uploads the full 10MB directly to Storage", async () => {
    const file = new File([new Uint8Array(MAX_UPLOAD_BYTES)], "large.png", { type: "image/png" });
    expect(await uploadAdminImage(file)).toBe(signed.url);
    expect(fetch).toHaveBeenCalledWith("/api/admin/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, type: file.type, size: file.size }) });
    expect(storage.from).toHaveBeenCalledWith("media");
    expect(storage.uploadToSignedUrl).toHaveBeenCalledWith(signed.path, signed.token, file, { contentType: "image/png" });
  });
  it("rejects empty, oversized, and non-image files before requesting authorization", async () => {
    for (const file of [new File([], "empty.png", { type: "image/png" }), new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "large.png", { type: "image/png" }), new File(["text"], "file.txt", { type: "text/plain" })]) {
      await expect(uploadAdminImage(file)).rejects.toThrow();
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(storage.uploadToSignedUrl).not.toHaveBeenCalled();
  });
  it("does not upload when admin authorization or its response fails", async () => {
    const file = new File(["image"], "file.png", { type: "image/png" });
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: "이미지를 업로드할 권한이 없습니다." }, { status: 403 }));
    await expect(uploadAdminImage(file)).rejects.toThrow(/권한/);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ url: signed.url }));
    await expect(uploadAdminImage(file)).rejects.toThrow();
    expect(storage.uploadToSignedUrl).not.toHaveBeenCalled();
  });
  it("exposes a URL only after Storage confirms the file upload", async () => {
    storage.uploadToSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "storage failure" } });
    await expect(uploadAdminImage(new File(["image"], "file.png", { type: "image/png" }))).rejects.toThrow(/업로드/);
  });
});
