import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AdminError from "@/app/admin/error";

describe("AdminError boundary", () => {
  it("shows a Korean message and retry button, calls reset on click", () => {
    const reset = vi.fn();
    render(<AdminError error={new Error("boom")} reset={reset} />);
    expect(screen.getByText("문제가 발생했어요")).toBeInTheDocument();
    fireEvent.click(screen.getByText("다시 시도"));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
