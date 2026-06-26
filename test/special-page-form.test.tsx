import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SpecialPageForm } from "@/components/admin/SpecialPageForm";

describe("SpecialPageForm structured fields", () => {
  it("renders add buttons instead of raw JSON textareas", () => {
    render(<SpecialPageForm action={async () => {}} />);
    expect(screen.getByText("이미지 추가")).toBeInTheDocument();
    expect(screen.getByText("카드 추가")).toBeInTheDocument();
    expect(screen.getByText("노트 추가")).toBeInTheDocument();
    // raw-JSON label gone
    expect(screen.queryByText(/JSON 배열/)).not.toBeInTheDocument();
  });

  it("seeds info_cards hidden input from existing page data", () => {
    const page = {
      id: "1", slug: "x", label: null, title: "t", description: null, date: null, venue: null,
      address: null, start_time: null, entry_link: null, cta_label: null, sponsor_name: null,
      sponsor_logo: null, poster: null, gallery: [], info_cards: [{ label: "날짜", value: "6/9" }],
      note_list: [], blind_structure_id: null, start_show_date: null, end_show_date: null, is_visible: true,
    };
    const { container } = render(<SpecialPageForm page={page} action={async () => {}} />);
    const hidden = container.querySelector('input[name="info_cards"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual([{ label: "날짜", value: "6/9" }]);
  });
});
