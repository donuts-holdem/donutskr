import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OnlineLeagueForm } from "@/components/admin/OnlineLeagueForm";
import type { OnlineLeague } from "@/lib/types";

const league: OnlineLeague = {
  status: "operating",
  tab_visible: true,
  title: "여름 온라인 리그",
  description: "설명",
  join_guide: "가입 안내",
  steps: ["1단계"],
  links: { 카카오: "https://kakao.example" },
  today_leagues: [{ name: "나이트 리그", time: "20:00", reg_close: "19:30", link: "https://x.example" }],
  notice_text: "공지",
  cta_label: "참가",
  cta_url: "https://cta.example",
  sheet_url: "https://sheet.example",
};

describe("OnlineLeagueForm", () => {
  it("renders core fields", () => {
    render(<OnlineLeagueForm league={league} action={async () => {}} />);
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
    expect(screen.getByLabelText("설명")).toBeInTheDocument();
    expect(screen.getByLabelText("가입 안내")).toBeInTheDocument();
    expect(screen.getByLabelText("CTA URL")).toBeInTheDocument();
    expect(screen.getByLabelText("시트 URL")).toBeInTheDocument();
    // status Select renders its selected label in trigger + hidden option
    expect(screen.getAllByText("운영 중")[0]).toBeInTheDocument();
  });

  it("renders RepeatableFieldEditor rows and hidden inputs for repeatable fields", () => {
    const { container } = render(<OnlineLeagueForm league={league} action={async () => {}} />);
    // hidden inputs backing the three RepeatableFieldEditor instances
    expect(container.querySelector('input[name="steps"]')).not.toBeNull();
    expect(container.querySelector('input[name="links"]')).not.toBeNull();
    expect(container.querySelector('input[name="today_leagues"]')).not.toBeNull();
    // add buttons prove the editors mounted
    expect(screen.getByRole("button", { name: "스텝 추가" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "링크 추가" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "리그 추가" })).toBeInTheDocument();
  });
});
