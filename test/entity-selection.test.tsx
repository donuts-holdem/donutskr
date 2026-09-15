import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClassNameFields } from "@/components/classes/ClassNameFields";
import { LeaderPicker } from "@/components/membership/LeaderPicker";

afterEach(cleanup);

function pickWeekday(label: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "기본 요일" }));
  fireEvent.click(screen.getByRole("option", { name: label }));
}

describe("class name suggestions in the creation form", () => {
  it("updates a suggested name when the weekday changes without overwriting a custom name", () => {
    render(<ClassNameFields prefix="new" existingNames={["DO:NUTS CLASS·월요일 A"]} />);
    pickWeekday("월요일");
    expect(screen.getByLabelText("클래스명")).toHaveValue("DO:NUTS CLASS·월요일 B");
    pickWeekday("수요일");
    expect(screen.getByLabelText("클래스명")).toHaveValue("DO:NUTS CLASS·수요일 A");
    fireEvent.change(screen.getByLabelText("클래스명"), { target: { value: "주말 집중반" } });
    pickWeekday("토요일");
    expect(screen.getByLabelText("클래스명")).toHaveValue("주말 집중반");
    fireEvent.click(screen.getByRole("button", { name: "기본명 사용" }));
    expect(screen.getByLabelText("클래스명")).toHaveValue("DO:NUTS CLASS·토요일 A");
  });

  it("preserves an existing course name when its weekday is edited", () => {
    render(<ClassNameFields prefix="edit" course={{ name: "기존 집중반", weekday: 1, start_time: "19:00:00" }} />);
    pickWeekday("금요일");
    expect(screen.getByLabelText("클래스명")).toHaveValue("기존 집중반");
  });
});

const candidates = [
  { id: "admin", label: "운영 관리자", is_admin: true },
  { id: "member", label: "김도넛", is_admin: false },
  { id: "leader", label: "박클래스", is_admin: false },
];

describe("searchable leader selection", () => {
  it("keeps selected leaders in the submitted data when the search hides them", () => {
    const { container } = render(<form><LeaderPicker candidates={candidates} name="leader_ids" prefix="create" multiple defaultSelected={["admin"]} /></form>);
    fireEvent.change(screen.getByRole("searchbox", { name: "리더 검색" }), { target: { value: "도넛" } });
    expect(screen.queryByRole("checkbox", { name: /운영 관리자/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /김도넛/ }));
    expect(new FormData(container.querySelector("form")!).getAll("leader_ids")).toEqual(["admin", "member"]);
    fireEvent.change(screen.getByRole("searchbox", { name: "리더 검색" }), { target: { value: "" } });
    expect(screen.getByRole("checkbox", { name: /운영 관리자/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /김도넛/ })).toBeChecked();
  });

  it("replaces the prior choice when adding one leader", () => {
    const { container } = render(<form><LeaderPicker candidates={candidates} name="user_id" prefix="add" /></form>);
    fireEvent.click(screen.getByRole("checkbox", { name: /김도넛/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "리더 검색" }), { target: { value: "박클래스" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /박클래스/ }));
    expect(new FormData(container.querySelector("form")!).getAll("user_id")).toEqual(["leader"]);
  });
});
