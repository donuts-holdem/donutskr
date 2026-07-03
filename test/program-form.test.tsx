import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgramForm } from "@/components/admin/ProgramForm";

describe("ProgramForm", () => {
  it("renders core fields", () => {
    render(<ProgramForm action={async () => {}} />);
    expect(screen.getByLabelText("프로그램명 *")).toBeInTheDocument();
    expect(screen.getByLabelText("그룹")).toBeInTheDocument();
    expect(screen.getByLabelText("담당자명")).toBeInTheDocument();
    // The link field's label "링크" is shared by the rich editor's insert-link
    // button, so target the URL input specifically by its textbox role.
    expect(screen.getByRole("textbox", { name: "링크" })).toBeInTheDocument();
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
      cta_label: null, entry_link: null, is_hot: false, is_affiliate: false,
      is_visible: true, sort_order: 0, description_blocks: null, description_verified: false,
    };
    render(<ProgramForm program={program} action={async () => {}} />);
    // "모집 중" normalizes to recruiting → its Korean label 모집중 shows in the trigger
    // (Radix renders it in both the visible span and the hidden <option>)
    expect(screen.getAllByText("모집중")[0]).toBeInTheDocument();
  });
  it("preserves and preselects an unknown legacy status via the fallback item", () => {
    const program = {
      id: "1", slug: "x", title: "t", category: null, program_group: "poker" as const, status: "old_custom",
      member_count: 0, location: null, start_date: null, end_date: null, description: null,
      cover_image: null, manager_name: null, manager_role: null, manager_avatar: null,
      cta_label: null, entry_link: null, is_hot: false, is_affiliate: false,
      is_visible: true, sort_order: 0, description_blocks: null, description_verified: false,
    };
    render(<ProgramForm program={program} action={async () => {}} />);
    // unknown value normalizes to "" → falls through to itself; fallback item is rendered AND
    // selected, so the "(원본값)" label appears in both the visible trigger and the hidden option.
    expect(screen.getAllByText("old_custom (원본값)")[0]).toBeInTheDocument();
  });
});

describe("ProgramForm DB-managed options (P1-3)", () => {
  it("renders the group/status options passed from the DB", () => {
    render(
      <ProgramForm
        action={async () => {}}
        groupOptions={[{ value: "vip", label: "VIP 라운지" }]}
        statusOptions={[{ value: "waitlist", label: "대기중" }]}
      />
    );
    // Group default preselects the first passed option → its label shows in the trigger.
    expect(screen.getAllByText("VIP 라운지")[0]).toBeInTheDocument();
    expect(screen.getByText("대기중")).toBeInTheDocument();
    // The static defaults are no longer present.
    expect(screen.queryByText("포커")).not.toBeInTheDocument();
  });
  it("keeps a stored group value missing from the option list via a fallback item", () => {
    const program = {
      id: "1", slug: "x", title: "t", category: null, program_group: "legacy_group", status: null,
      member_count: 0, location: null, start_date: null, end_date: null, description: null,
      cover_image: null, manager_name: null, manager_role: null, manager_avatar: null,
      cta_label: null, entry_link: null, is_hot: false, is_affiliate: false,
      is_visible: true, sort_order: 0, description_blocks: null, description_verified: false,
    };
    render(
      <ProgramForm
        program={program}
        action={async () => {}}
        groupOptions={[{ value: "poker", label: "포커" }]}
        statusOptions={[]}
      />
    );
    // Removed/legacy value is preserved and preselected via the "(원본값)" fallback item.
    expect(screen.getAllByText("legacy_group (원본값)")[0]).toBeInTheDocument();
  });
});
