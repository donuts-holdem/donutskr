import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BlindStructureEditor } from "@/components/admin/BlindStructureEditor";

describe("BlindStructureEditor", () => {
  it("adds a level row when '레벨 추가' clicked", () => {
    render(<BlindStructureEditor structureId="s1" initialRows={[]} action={async () => {}} />);
    fireEvent.click(screen.getByText("레벨 추가"));
    expect(screen.getAllByPlaceholderText("Ante").length).toBe(1);
  });
});
