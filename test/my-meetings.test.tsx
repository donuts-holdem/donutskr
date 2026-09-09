import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MyMeetings } from "@/components/meetings/MyMeetings";
const history = vi.hoisted(() => vi.fn());
vi.mock("@/app/meetings/history", () => ({ getMyMeetingHistory: history }));
afterEach(cleanup);
beforeEach(() => history.mockReset());

describe("MY meeting history", () => {
  it("keeps past meetings off by default and requests them in the same list", async () => {
    history.mockResolvedValue({ items: [], count: 0, page: 1, past: true });
    render(<MyMeetings initial={{ items: [], count: 0, page: 1, past: false }} />);
    expect(screen.getByRole("checkbox", { name: "지난 모임 보기" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "지난 모임 보기" }));
    await waitFor(() => expect(history).toHaveBeenCalledWith(true, 1));
    expect(await screen.findByText("신청한 모임 내역이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "지난 모임 보기" })).toBeChecked();
  });
  it("surfaces a load failure without inventing history", async () => {
    history.mockResolvedValue({ items: [], count: 0, page: 1, past: true, error: "모임 신청 내역을 불러오지 못했습니다." });
    render(<MyMeetings initial={{ items: [], count: 0, page: 1, past: false }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "지난 모임 보기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("모임 신청 내역을 불러오지 못했습니다.");
  });
});
