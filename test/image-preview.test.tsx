import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ImagePreview } from "@/components/admin/ImagePreview";

describe("ImagePreview", () => {
  it("renders a thumbnail and the url when src is provided", () => {
    render(<ImagePreview src="https://example.com/a.png" />);
    const img = screen.getByAltText("현재 이미지 미리보기") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://example.com/a.png");
    expect(screen.getByText("https://example.com/a.png")).toBeInTheDocument();
  });
  it("renders nothing when src is empty/null", () => {
    const { container } = render(<ImagePreview src={null} />);
    expect(container.firstChild).toBeNull();
  });
});
