import Link from "next/link";
import { requireActiveMember } from "@/lib/membership/server";
import { domainRpc } from "@/lib/domains/server";
import type { DailyLearning } from "@/lib/learning/types";
import { DailyLearningFlow } from "@/components/learning/DailyLearningFlow";
import { LearningCompletion } from "@/components/learning/LearningCompletion";

export const metadata = { title: "오늘의 학습 | DO:NUTS CLASS" };
export default async function LearnPage() {
  const { supabase, profile } = await requireActiveMember();
  const daily = await domainRpc<DailyLearning>(supabase, "get_daily_learning");
  return <div className="max-w-3xl">
    <header className="border-b border-border pb-7"><p className="text-xs font-semibold tracking-widest text-gold">DAILY FIVE / {daily.day}</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">오늘의 다섯 번의 판단</h1>
      <Link href="/learn/review" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">내 오답 복습</Link>
    </header>
    {daily.result ? <LearningCompletion result={daily.result} /> : !daily.available || daily.questions.length !== 5
      ? <section className="py-12"><h2 className="text-xl font-semibold">오늘의 문항을 준비 중입니다</h2><p className="mt-4 text-sm text-ink/60">잠시 후 다시 확인해 주세요.</p></section>
      : <DailyLearningFlow key={daily.day} daily={daily} canParticipate={!!profile} />}
  </div>;
}
