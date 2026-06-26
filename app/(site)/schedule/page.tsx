import type { Metadata } from "next";
import { getEvents } from "@/lib/data/events";
import { partitionEvents, todayKST } from "@/lib/schedule";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";

export const metadata: Metadata = {
  title: "일정 | DO:NUTS",
  description: "DO:NUTS 포커 클럽 이벤트 일정",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; category?: string }>;
}) {
  const [sp, events] = await Promise.all([searchParams, getEvents()]);
  const { upcoming, past } = partitionEvents(events, todayKST());

  // Primary axis is ?view=upcoming|past. Map the legacy ?category=completed
  // link to the past view so old links still land somewhere sensible.
  const initialView =
    sp.view === "past" || (!sp.view && sp.category === "completed") ? "past" : "upcoming";

  return <ScheduleBoard upcoming={upcoming} past={past} initialView={initialView} />;
}
