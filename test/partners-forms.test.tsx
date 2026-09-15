import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ from: vi.fn(), uploadToSignedUrl: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ createBrowserSupabase: () => ({ storage }) }));
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { FooterSponsorsEditor } from "@/components/admin/FooterSponsorsEditor";
import { PartnerList } from "@/components/partners/PartnerList";
import type { Partner } from "@/lib/partners/types";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => { vi.resetAllMocks(); storage.from.mockReturnValue(storage); });
const signed = { bucket: "media", path: "site_media/test.png", token: "test-upload-token", url: "https://storage.example/logo.png" };

describe("partner logo uploads", () => {
  it("blocks form submission until the persisted logo URL is available", async () => {
    let complete!: (value: { error: null }) => void;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(signed)));
    storage.uploadToSignedUrl.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = render(<form onSubmit={onSubmit}><ImageUploadField name="logo_url" label="로고" /><button>저장</button></form>);
    fireEvent.change(screen.getByLabelText("로고"), { target: { files: [new File(["image"], "logo.png", { type: "image/png" })] } });
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(new FormData(container.querySelector("form")!).get("logo_url")).toBe("");
    await waitFor(() => expect(storage.uploadToSignedUrl).toHaveBeenCalledOnce());
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    complete({ error: null });
    await waitFor(() => expect(screen.getByAltText("로고 미리보기")).toHaveAttribute("src", "https://storage.example/logo.png"));
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(new FormData(container.querySelector("form")!).get("logo_url")).toBe("https://storage.example/logo.png");
    fireEvent.click(screen.getByRole("button", { name: "로고 제거" }));
    expect(new FormData(container.querySelector("form")!).get("logo_url")).toBe("");
  });
  it("keeps footer sponsor values intact and blocks saving during direct upload", async () => {
    let complete!: (value: { error: null }) => void;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(signed)));
    storage.uploadToSignedUrl.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = render(<form onSubmit={onSubmit}><FooterSponsorsEditor initial={[{ name: "기존 스폰서", logo: "https://storage.example/old.png", url: "https://partner.example" }]} /><button>저장</button></form>);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["image"], "new.png", { type: "image/png" })] } });
    await waitFor(() => expect(storage.uploadToSignedUrl).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByPlaceholderText("스폰서명"), { target: { value: "새 스폰서명" } });
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByAltText("로고 미리보기")).toHaveAttribute("src", "https://storage.example/old.png");
    complete({ error: null });
    await waitFor(() => expect(screen.getByAltText("로고 미리보기")).toHaveAttribute("src", signed.url));
    expect(JSON.parse(new FormData(container.querySelector("form")!).get("footer_sponsors") as string)).toEqual([{ name: "새 스폰서명", logo: signed.url, url: "https://partner.example" }]);
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
  it("preserves the saved logo and exposes retryable upload errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { container } = render(<form><ImageUploadField name="logo_url" label="로고" initialUrl="https://storage.example/old.png" /></form>);
    fireEvent.change(screen.getByLabelText("로고"), { target: { files: [new File(["image"], "new.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(new FormData(container.querySelector("form")!).get("logo_url")).toBe("https://storage.example/old.png");
    expect(screen.getByLabelText("로고")).toBeEnabled();
  });
});

describe("member partner cards", () => {
  it("renders persisted ordering and safe external navigation", () => {
    const partners: Partner[] = [
      { id: "second", name: "두 번째 파트너", description: "두 번째 소개", logo_url: null, url: "https://second.example", sort_order: 2, revision: 1 },
      { id: "first", name: "첫 번째 파트너", description: "첫 번째 소개", logo_url: null, url: "https://first.example", sort_order: 1, revision: 1 },
    ];
    render(<PartnerList partners={partners} />);
    const links = screen.getAllByRole("link");
    expect(links.map(link => link.getAttribute("href"))).toEqual(["https://first.example", "https://second.example"]);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
