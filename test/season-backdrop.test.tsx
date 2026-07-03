import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SeasonBackdrop } from "@/components/site/SeasonBackdrop";

describe("SeasonBackdrop", () => {
  it("renders nothing when there is no image", () => {
    const { container } = render(<SeasonBackdrop image={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a decorative, non-interactive layer behind content", () => {
    const { container } = render(
      <SeasonBackdrop image="https://example.supabase.co/bg.webp" />,
    );

    const layer = container.firstElementChild as HTMLElement;
    expect(layer).not.toBeNull();
    // Decorative: hidden from AT and never intercepting pointer events.
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.className).toContain("pointer-events-none");
    // Sits behind page content (negative z-index) as a fixed full-bleed layer.
    expect(layer.className).toContain("-z-10");
    expect(layer.className).toContain("fixed");

    // The image is present but marked decorative (empty alt → not exposed).
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("alt", "");
    expect(img).not.toHaveAttribute("fetchpriority", "high");
  });
});
