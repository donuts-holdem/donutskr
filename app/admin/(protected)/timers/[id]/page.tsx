import { notFound } from "next/navigation";
import { getTimerById } from "@/lib/data/timers";
import { TimerControl } from "@/components/admin/TimerControl";

export default async function TimerControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const timer = await getTimerById(id);
  if (!timer) notFound();

  return <TimerControl initial={timer} />;
}
