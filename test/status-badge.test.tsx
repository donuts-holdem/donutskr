import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "@/components/schedule/StatusBadge";

describe("StatusBadge", () => {
  it("scheduled → 예정", () => { render(<StatusBadge status="scheduled" />); expect(screen.getByText("예정")).toBeInTheDocument(); });
  it("running → 진행중", () => { render(<StatusBadge status="running" />); expect(screen.getByText("진행중")).toBeInTheDocument(); });
  it("reg_closed → 레지마감", () => { render(<StatusBadge status="reg_closed" />); expect(screen.getByText("레지마감")).toBeInTheDocument(); });
  it("completed → 완료", () => { render(<StatusBadge status="completed" />); expect(screen.getByText("완료")).toBeInTheDocument(); });
});
