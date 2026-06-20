import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "@/components/schedule/StatusBadge";

describe("StatusBadge", () => {
  it("confirmed → 확정", () => { render(<StatusBadge status="confirmed" />); expect(screen.getByText("확정")).toBeInTheDocument(); });
  it("running → 진행중", () => { render(<StatusBadge status="running" />); expect(screen.getByText("진행중")).toBeInTheDocument(); });
  it("completed → 완료", () => { render(<StatusBadge status="completed" />); expect(screen.getByText("완료")).toBeInTheDocument(); });
});
