import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionScheduleForm } from "@/components/classes/SessionScheduleForm";
import type { ClassSession } from "@/lib/classes/types";

vi.mock("@/app/classes/actions", () => ({ rescheduleClassSessions: vi.fn(async () => ({})) }));
afterEach(cleanup);

const classId = "10000000-0000-4000-8000-000000000001";
const session: ClassSession = {
  id: "20000000-0000-4000-8000-000000000001", class_id: classId,
  session_number: 1, scheduled_at: "2026-09-10T10:00:00.000Z", status: "SCHEDULED",
  first_started_at: null, started_at: null, completed_at: null, cancelled_at: null,
  cancellation_reason: null, roster_run: 0, attendance_saved_at: null,
  attendance_locked: false, revision: 1, created_at: "2026-09-01T00:00:00.000Z",
};

describe("session schedule confirmation", () => {
  it("keeps the date and confirmation controls usable before confirmation", () => {
    const { container } = render(<SessionScheduleForm classId={classId} session={session} sessions={[session]} />);
    const date = container.querySelector<HTMLInputElement>('input[name="scheduled_at"]')!;
    const shift = screen.getByRole("checkbox");
    expect(date).toBeEnabled();
    fireEvent.click(shift);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    expect(date).toBeEnabled();
    expect(checkboxes[1]).toBeEnabled();
    fireEvent.click(checkboxes[1]);
    expect(checkboxes[1]).toBeChecked();
    fireEvent.change(date, { target: { value: "2026-09-11T19:00" } });
    expect(date).toHaveValue("2026-09-11T19:00");
    expect(checkboxes[1]).not.toBeChecked();
    expect(date).toBeEnabled();
    expect(checkboxes[0]).toBeEnabled();
    expect(checkboxes[1]).toBeEnabled();
  });
});
