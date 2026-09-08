import type { Metadata } from "next";
import { getEvents } from "@/lib/legacy/data/events";
import { partitionEvents, todayKST } from "@/lib/legacy/schedule";
import { ScheduleView } from "@/components/schedule/ScheduleView";

export const metadata: Metadata = {
  title: "일정 | DO:NUTS",
  description: "DO:NUTS 포커 클럽 이벤트 일정",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; tab?: string; category?: string; month?: string }>;
}) {
  const [sp, events] = await Promise.all([searchParams, getEvents()]);
  // Status is DERIVED from the schedule times at read time (lib/event-status).
  // This page has no `revalidate` export and reads Supabase via request cookies,
  // so it renders dynamically — the derived status is always current on load.
  const now = new Date();
  const today = todayKST(now);
  const { upcoming, past } = partitionEvents(events, now);

  const initialMode = sp.view === "calendar" ? "calendar" : "list";
  // ?tab= is the list sub-tab; legacy ?category=completed maps to the past tab.
  const initialTab =
    sp.tab === "past" || (!sp.tab && sp.category === "completed") ? "past" : "upcoming";
  // Validate month range so a hand-edited ?month=2026-13 can't render a broken grid.
  const initialMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "")
    ? sp.month!
    : today.slice(0, 7);

  return (
    <ScheduleView
      events={events}
      upcoming={upcoming}
      past={past}
      today={today}
      initialMode={initialMode}
      initialTab={initialTab}
      initialMonth={initialMonth}
    />
  );
}
