import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeleteButton } from "@/components/admin/DeleteButton";

describe("DeleteButton", () => {
  it("does not call onDelete until the confirm dialog is acknowledged", () => {
    const onDelete = vi.fn();
    render(<DeleteButton onDelete={onDelete} itemName="슈퍼컵" />);
    // Clicking the row '삭제' opens the dialog, does NOT delete.
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onDelete).not.toHaveBeenCalled();
    // Dialog shows the irreversible warning + item name.
    expect(screen.getByText(/되돌릴 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/슈퍼컵/)).toBeInTheDocument();
  });
});
