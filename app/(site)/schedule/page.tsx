import type { Metadata } from "next";
import { getEvents } from "@/lib/data/events";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";

export const metadata: Metadata = {
  title: "일정 | DO:NUTS",
  description: "DO:NUTS 포커 클럽 이벤트 일정",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, events] = await Promise.all([searchParams, getEvents()]);

  return <ScheduleBoard events={events} initialFilter={category} />;
}
