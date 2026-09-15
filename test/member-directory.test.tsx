import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ directory: vi.fn(), catalog: vi.fn(), save: vi.fn(), affiliate: vi.fn(), recovery: vi.fn(), withdraw: vi.fn(), suspension: vi.fn(), removeLeader: vi.fn() }));
vi.mock("@/lib/membership/admin-directory", async importOriginal => ({ ...await importOriginal<object>(), getMemberDirectory: mocks.directory, getMemberAdminCatalog: mocks.catalog }));
vi.mock("@/app/admin/actions/member-profile", () => ({ saveMemberProfile: mocks.save, setMemberAffiliation: mocks.affiliate, sendMemberRecovery: mocks.recovery, withdrawMember: mocks.withdraw }));
vi.mock("@/app/admin/actions/members", () => ({ changeMemberSuspension: mocks.suspension, removeMembershipLeader: mocks.removeLeader }));
import MemberDirectoryPage from "@/app/admin/(protected)/members/directory/page";
import MemberDetailPage from "@/app/admin/(protected)/members/directory/[id]/page";
import { MemberProfileFields } from "@/app/admin/(protected)/members/directory/[id]/MemberProfileFields";
import type { DirectoryMember } from "@/lib/membership/admin-directory";

const memberId = "10000000-0000-4000-8000-000000000001";
const schoolId = "20000000-0000-4000-8000-000000000002";
const classId = "30000000-0000-4000-8000-000000000003";
const clubId = "40000000-0000-4000-8000-000000000004";
const pastId = "50000000-0000-4000-8000-000000000005";
const member: DirectoryMember = {
  id: memberId, name: "테스트 회원", email: "member@donuts.test", phone: "01012345678", school_id: schoolId,
  school_name: "테스트 대학교", other_school_name: null, status: "ACTIVE", revision: 4, withdrawal_status: null,
  classes: [{ id: classId, name: "현재 클래스", active: true }, { id: pastId, name: "이전 클래스", active: false }],
  clubs: [{ id: clubId, name: "현재 클럽", active: true }], leaders: [{ id: classId, name: "현재 클래스", kind: "CLASS" }],
};
const catalog = {
  schools: [{ id: schoolId, name: "테스트 대학교", active: true }],
  classes: [{ id: classId, name: "현재 클래스", active: true, closed_at: null, archived_at: null }, { id: pastId, name: "이전 클래스", active: true, closed_at: null, archived_at: null }],
  clubs: [{ id: clubId, name: "현재 클럽", archived_at: null }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.catalog.mockResolvedValue(catalog);
  mocks.directory.mockResolvedValue({ members: [member], count: 1, page: 1, filters: { status: "ALL", q: "", page: 1 } });
  for (const action of [mocks.save, mocks.affiliate, mocks.recovery, mocks.withdraw, mocks.suspension, mocks.removeLeader]) action.mockResolvedValue({});
});
afterEach(cleanup);

describe("member directory", () => {
  it("keeps all filters during pagination and lists current affiliations", async () => {
    const filters = { q: "테스트", status: "ACTIVE", school_id: schoolId, class_id: classId, club_id: clubId, page: 2 };
    mocks.directory.mockResolvedValue({ members: [member], count: 101, page: 2, filters });
    render(await MemberDirectoryPage({ searchParams: Promise.resolve({ ...filters, page: "2" }) }));
    const next = new URL(screen.getByRole("link", { name: "다음" }).getAttribute("href")!, "https://donuts.test");
    expect(Object.fromEntries(next.searchParams)).toEqual({ ...filters, page: "3" });
    const detailLink = screen.getByRole("link", { name: /테스트 회원/ });
    expect(detailLink).toHaveAttribute("href", `/admin/members/directory/${memberId}`);
    expect(within(detailLink).getByText("현재 클래스")).toBeInTheDocument();
    expect(within(detailLink).queryByText("이전 클래스")).not.toBeInTheDocument();
  });
  it("preserves entered profile fields after a stale-save response", async () => {
    mocks.save.mockResolvedValue({ error: "정보가 변경되었습니다. 새로고침해 주세요." });
    render(await MemberDetailPage({ params: Promise.resolve({ id: memberId }) }));
    const name = screen.getByRole("textbox", { name: "이름" });
    fireEvent.change(name, { target: { value: "변경한 이름" } });
    const button = screen.getByRole("button", { name: "회원 정보 저장" });
    const form = button.closest("form")!;
    fireEvent.change(within(form).getByRole("textbox", { name: "변경 사유" }), { target: { value: "회원 요청" } });
    fireEvent.submit(form);
    await waitFor(() => expect(within(form).getByRole("alert")).toBeInTheDocument());
    expect(name).toHaveValue("변경한 이름");
    const submitted = mocks.save.mock.calls[0][1] as FormData;
    expect(submitted.get("revision")).toBe("4");
    expect(submitted.get("user_id")).toBe(memberId);
    expect(submitted.get("name")).toBe("변경한 이름");
  });
  it("keeps an entered other-school name when the school selection changes", () => {
    const { container } = render(<form><MemberProfileFields member={member} schools={catalog.schools} /></form>);
    const choose = (name: string) => {
      fireEvent.click(screen.getByRole("combobox", { name: "학교" }));
      fireEvent.click(screen.getByRole("option", { name }));
    };
    choose("기타");
    fireEvent.change(screen.getByRole("textbox", { name: "학교명" }), { target: { value: "직접 입력한 대학교" } });
    choose("테스트 대학교");
    choose("기타");
    expect(screen.getByRole("textbox", { name: "학교명" })).toHaveValue("직접 입력한 대학교");
    const data = new FormData(container.querySelector("form")!);
    expect(data.get("school_id")).toBe("other");
    expect(data.get("other_school_name")).toBe("직접 입력한 대학교");
  });
  it("excludes inactive schools and closed classes from new assignments", async () => {
    mocks.catalog.mockResolvedValue({ ...catalog,
      schools: [...catalog.schools, { id: pastId, name: "종료된 학교", active: false }],
      classes: [...catalog.classes, { id: schoolId, name: "종료된 클래스", active: true, closed_at: "2026-09-01", archived_at: null }],
    });
    render(await MemberDetailPage({ params: Promise.resolve({ id: memberId }) }));
    fireEvent.click(screen.getByRole("combobox", { name: "학교" }));
    expect(screen.queryByRole("option", { name: "종료된 학교" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "테스트 대학교" }));
    fireEvent.click(screen.getByText("클래스 추가", { selector: "summary" }));
    fireEvent.click(screen.getByRole("combobox", { name: "클래스 선택" }));
    expect(screen.queryByRole("option", { name: "종료된 클래스" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "이전 클래스" })).toBeInTheDocument();
  });
  it("keeps withdrawal cleanup retryable after member access was already blocked", async () => {
    mocks.directory.mockResolvedValue({ members: [{ ...member, status: "WITHDRAWN", withdrawal_status: "AUTH_PENDING", leaders: [] }], count: 1, page: 1, filters: {} });
    mocks.withdraw.mockResolvedValue({ error: "정리를 다시 시도해 주세요." });
    const { container } = render(await MemberDetailPage({ params: Promise.resolve({ id: memberId }) }));
    expect(screen.queryByRole("textbox", { name: "이름" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /재설정 메일/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "개인정보 정리 재시도" }));
    const dialog = screen.getByRole("alertdialog");
    expect(container.contains(dialog)).toBe(false);
    fireEvent.change(within(dialog).getByRole("textbox", { name: "처리 사유" }), { target: { value: "중단된 정리 재시도" } });
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.submit(within(dialog).getByRole("button", { name: "정리 재시도" }).closest("form")!);
    await waitFor(() => expect(within(dialog).getByRole("alert")).toBeInTheDocument());
    const submitted = mocks.withdraw.mock.calls[0][1] as FormData;
    expect(submitted.get("user_id")).toBe(memberId);
    expect(submitted.get("confirm")).toBe("on");
    expect(submitted.get("reason")).toBe("중단된 정리 재시도");
    expect(mocks.recovery).not.toHaveBeenCalled();
  });
  it("keeps historical affiliations read-only after completed withdrawal", async () => {
    mocks.directory.mockResolvedValue({ members: [{ ...member, status: "WITHDRAWN", withdrawal_status: "COMPLETE", leaders: [],
      classes: member.classes.map(row => ({ ...row, active: false })), clubs: member.clubs.map(row => ({ ...row, active: false })),
    }], count: 1, page: 1, filters: {} });
    const { container } = render(await MemberDetailPage({ params: Promise.resolve({ id: memberId }) }));
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: /재시도|탈퇴|저장/ })).not.toBeInTheDocument();
    const history = [...container.querySelectorAll("details")].find(details => details.textContent?.includes("이전 소속 2개"))!;
    history.open = true;
    expect(within(history).getByRole("link", { name: "현재 클래스" })).toHaveAttribute("href", `/admin/classes/${classId}`);
  });
});
