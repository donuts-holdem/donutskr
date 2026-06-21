import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgramForm } from "@/components/admin/ProgramForm";

describe("ProgramForm", () => {
  it("renders core fields", () => {
    render(<ProgramForm action={async () => {}} />);
    expect(screen.getByLabelText("프로그램명")).toBeInTheDocument();
    expect(screen.getByLabelText("그룹")).toBeInTheDocument();
    expect(screen.getByLabelText("담당자명")).toBeInTheDocument();
    expect(screen.getByLabelText("외부 링크")).toBeInTheDocument();
  });
});
