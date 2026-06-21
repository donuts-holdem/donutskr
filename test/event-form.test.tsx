import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EventForm } from "@/components/admin/EventForm";

describe("EventForm", () => {
  it("renders core fields", () => {
    render(<EventForm structures={[]} action={async () => {}} />);
    expect(screen.getByLabelText("이벤트명")).toBeInTheDocument();
    expect(screen.getByLabelText("카테고리")).toBeInTheDocument();
    expect(screen.getByLabelText("상태")).toBeInTheDocument();
    expect(screen.getByLabelText("타이머 이벤트 ID")).toBeInTheDocument();
  });
});
