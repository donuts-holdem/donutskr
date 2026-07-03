import { describe, it, expect } from "vitest";
import {
  assertImageUpload,
  buildUploadKey,
  pickImageExtension,
  MAX_UPLOAD_BYTES,
} from "@/lib/upload";

/** Lightweight File stand-in — assert/build only read name, type, size. */
function fakeFile(opts: { name?: string; type?: string; size?: number }): File {
  return {
    name: opts.name ?? "photo.png",
    type: opts.type ?? "image/png",
    size: opts.size ?? 1024,
  } as unknown as File;
}

describe("assertImageUpload", () => {
  it("rejects non-image MIME types", () => {
    expect(() => assertImageUpload(fakeFile({ type: "application/pdf" }))).toThrow(
      /이미지 파일만/,
    );
    expect(() => assertImageUpload(fakeFile({ type: "text/html" }))).toThrow();
    expect(() => assertImageUpload(fakeFile({ type: "" }))).toThrow();
  });

  it("rejects files over the size limit", () => {
    expect(() =>
      assertImageUpload(fakeFile({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 })),
    ).toThrow(/10MB/);
  });

  it("accepts an image within the size limit", () => {
    expect(() =>
      assertImageUpload(fakeFile({ type: "image/jpeg", size: MAX_UPLOAD_BYTES })),
    ).not.toThrow();
  });
});

describe("pickImageExtension", () => {
  it("normalizes jpeg → jpg and lowercases", () => {
    expect(pickImageExtension(fakeFile({ name: "A.JPEG", type: "image/jpeg" }))).toBe("jpg");
  });
  it("falls back to the MIME subtype when the name has no valid extension", () => {
    expect(pickImageExtension(fakeFile({ name: "noext", type: "image/webp" }))).toBe("webp");
    expect(pickImageExtension(fakeFile({ name: "x.exe", type: "image/svg+xml" }))).toBe("svg");
  });
  it("falls back to bin when neither name nor MIME is a known image ext", () => {
    expect(pickImageExtension(fakeFile({ name: "noext", type: "image/x-weird" }))).toBe("bin");
  });
});

describe("buildUploadKey", () => {
  it("uses a randomized, extension-preserving key and never the raw filename", () => {
    const key = buildUploadKey("cover_image", fakeFile({ name: "../etc/passwd.png", type: "image/png" }));
    expect(key).toMatch(/^cover_image\/\d+-[0-9a-f-]{36}\.png$/);
    expect(key).not.toContain("passwd");
    expect(key).not.toContain("..");
  });

  it("produces unique keys for repeated calls", () => {
    const file = fakeFile({ name: "a.png", type: "image/png" });
    expect(buildUploadKey("f", file)).not.toBe(buildUploadKey("f", file));
  });
});
