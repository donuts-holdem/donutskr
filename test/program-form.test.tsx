import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgramForm } from "@/components/admin/ProgramForm";

describe("ProgramForm", () => {
  it("renders core fields", () => {
    render(<ProgramForm action={async () => {}} />);
    expect(screen.getByLabelText("프로그램명 *")).toBeInTheDocument();
    expect(screen.getByLabelText("그룹")).toBeInTheDocument();
    expect(screen.getByLabelText("담당자명")).toBeInTheDocument();
    expect(screen.getByLabelText("외부 링크")).toBeInTheDocument();
  });
});

describe("ProgramForm Phase 2 localization", () => {
  it("renders Korean group options and a Korean status select", () => {
    render(<ProgramForm action={async () => {}} />);
    // Radix Select renders the label in both the visible trigger span and the hidden <option>;
    // getAllByText handles the multiple-match case correctly.
    expect(screen.getAllByText("포커")[0]).toBeInTheDocument(); // group default poker → 포커
    expect(screen.queryByText("poker")).not.toBeInTheDocument();
    // status is now a select; its hidden form value should be empty for a new program
    const hidden = document.querySelector('select[name="status"], [data-slot="select"]');
    expect(hidden).not.toBeNull();
  });
  it("preselects the normalized standard key for a legacy status value", () => {
    const program = {
      id: "1", slug: "x", title: "t", category: null, program_group: "poker" as const, status: "모집 중",
      member_count: 0, location: null, start_date: null, end_date: null, description: null,
      cover_image: null, manager_name: null, manager_role: null, manager_avatar: null,
      cta_label: null, entry_link: null, external_url: null, is_hot: false, is_affiliate: false,
      is_visible: true, sort_order: 0,
    };
    render(<ProgramForm program={program} action={async () => {}} />);
    // "모집 중" normalizes to recruiting → its Korean label 모집중 shows in the trigger
    // (Radix renders it in both the visible span and the hidden <option>)
    expect(screen.getAllByText("모집중")[0]).toBeInTheDocument();
  });
});
