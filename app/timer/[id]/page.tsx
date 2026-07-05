import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTimerById } from "@/lib/data/timers";
import { TimerDisplay } from "@/components/timer/TimerDisplay";

// The public clock is a live venue display, never a search result.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const timer = await getTimerById(id);
  return {
    title: timer ? `${timer.title} · 타이머` : "타이머",
    robots: { index: false, follow: false },
  };
}

export default async function TimerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const timer = await getTimerById(id);
  if (!timer) notFound();
  return <TimerDisplay initial={timer} id={id} />;
}
