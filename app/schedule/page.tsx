import type { Metadata } from "next";
import { getEvents } from "@/lib/data/events";
import { CategoryFilter } from "@/components/schedule/CategoryFilter";
import { SeriesNav } from "@/components/series/SeriesNav";

export const metadata: Metadata = {
  title: "일정 | DO:NUTS",
  description: "DO:NUTS 포커 클럽 이벤트 일정",
};

export default async function SchedulePage() {
  const events = await getEvents();

  return (
    <div className="py-8 flex flex-col gap-8">
      <SeriesNav />

      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">일정</h1>
        <p className="text-ink/50 text-sm">DO:NUTS 포커 시리즈 이벤트 일정입니다.</p>
      </div>

      <CategoryFilter events={events} />
    </div>
  );
}
