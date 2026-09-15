import Link from "next/link";
import { ArrowUpRight, Flame } from "lucide-react";
import { getMemberAffiliations, requireActiveMember } from "@/lib/membership/server";
import { getClassOverview } from "@/lib/classes/server";
import { getMyClassActivity } from "@/lib/xp/server";
import { getMeetingIndex } from "@/lib/meetings/server";
import { getPartners } from "@/lib/partners/server";
import { domainRpc } from "@/lib/domains/server";
import type { DailyLearning, LearningSummary } from "@/lib/learning/types";
import { ClassProgress } from "@/components/classes/ClassProgress";
import { MeetingList } from "@/components/meetings/MeetingList";
import { PartnerList } from "@/components/partners/PartnerList";

export const metadata = { title: "회원 홈 | DO:NUTS CLASS" };
const moreLink = "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold focus-visible:outline-2 focus-visible:outline-gold";

export default async function MemberHomePage() {
  const { supabase, profile } = await requireActiveMember();
  const [member, activity, summary, daily, { meetings }, partners] = await Promise.all([
    getMemberAffiliations(), profile ? getMyClassActivity() : null,
    profile ? domainRpc<LearningSummary>(supabase, "get_my_learning_summary") : null,
    domainRpc<DailyLearning>(supabase, "get_daily_learning"), getMeetingIndex(), getPartners(),
  ]);
  const courses = (await Promise.all(member.classes.map(item => getClassOverview(item.id))))
    .filter(({ course }) => !course.closed_at && !course.archived_at);
  return <div className="space-y-12 sm:space-y-16">
    <section aria-labelledby="home-heading" className="border-b border-border pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold tracking-widest text-gold">DO:NUTS CLASS</p><Link href="/my" className={moreLink}>MY<ArrowUpRight className="size-4" aria-hidden="true"/></Link></div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-5"><div><h1 id="home-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">{member.profile?.name ?? "관리자"}</h1><p className="mt-3 text-sm text-ink/70">{member.school}</p></div>
        <div className="flex flex-wrap items-center gap-3"><span className="rounded-pill border border-gold/30 px-3 py-1 text-xs text-gold">{member.isAdmin ? "관리자" : "정회원"}</span>{activity && <span className="text-sm font-semibold text-gold">LV. {activity.level}</span>}{member.isLeader && <Link href={member.isAdmin ? "/admin" : "/leader"} className={moreLink}>운영 홈<ArrowUpRight className="size-4" aria-hidden="true"/></Link>}</div>
      </div>
      {member.clubs.length > 0 && <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1">{member.clubs.map(club => <li key={club.id}><Link href={`/club/${club.id}`} className="inline-flex min-h-11 items-center text-sm text-ink/70 underline-offset-4 hover:text-gold hover:underline focus-visible:outline-2 focus-visible:outline-gold">{club.name}</Link></li>)}</ul>}
      {activity && <dl className="mt-7 grid grid-cols-3 divide-x divide-border border-t border-border pt-6">
        <div className="pr-3"><dt className="text-xs text-ink/60">이번 주 XP</dt><dd className="mt-2 text-xl font-semibold text-gold sm:text-2xl">{activity.weekly_xp.toLocaleString()}</dd></div>
        <div className="px-4"><dt className="text-xs text-ink/60">누적 XP</dt><dd className="mt-2 text-xl font-semibold sm:text-2xl">{activity.total_xp.toLocaleString()}</dd></div>
        <div className="pl-4"><dt className="text-xs text-ink/60">연속 학습</dt><dd className="mt-2 text-xl font-semibold sm:text-2xl">{summary?.current_streak ?? 0}<span className="ml-1 text-sm font-normal text-ink/60">일</span></dd></div>
      </dl>}
    </section>
    <div className="grid items-start gap-10 lg:grid-cols-5 lg:gap-8">
      <section aria-labelledby="my-class-heading" className="min-w-0 lg:col-span-3">
        <div className="flex items-center justify-between gap-4"><h2 id="my-class-heading" className="text-xl font-semibold">내 클래스</h2><Link href="/class" className={moreLink}>전체<ArrowUpRight className="size-4" aria-hidden="true"/></Link></div>
        {courses.length ? <ul className="mt-4 space-y-6">{courses.map(({ course, sessions }) => <li key={course.id}><h3 className="mb-3 text-lg font-semibold"><Link href={`/class/${course.id}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{course.name}</Link></h3><ClassProgress sessions={sessions} classId={course.id}/></li>)}</ul> : <div className="mt-4 rounded-card border border-border p-6"><p className="text-sm text-ink/70">참여 중인 클래스가 없습니다.</p><Link href="/class" className={`${moreLink} mt-3`}>클래스 찾기<ArrowUpRight className="size-4" aria-hidden="true"/></Link></div>}
      </section>
      <section aria-labelledby="daily-heading" className="rounded-card border border-gold/25 bg-surface p-6 lg:col-span-2">
        <div className="flex items-center justify-between gap-4"><p className="text-xs font-semibold tracking-widest text-gold">DAILY FIVE</p><Flame className="size-5 text-gold" aria-hidden="true"/></div>
        <h2 id="daily-heading" className="mt-5 text-2xl font-semibold tracking-tight">오늘의 학습</h2>
        <p className="mt-3 text-sm text-ink/70">{daily.result ? `5문항 완료 · ${daily.result.correct_count}개 정답` : daily.available ? "5문항" : "문항 준비 중"}</p>
        {daily.result && <p className="mt-4 text-3xl font-semibold text-gold">+{daily.result.xp}<span className="ml-2 text-sm font-normal">XP</span></p>}
        <Link href="/learn" className="mt-6 flex min-h-12 items-center justify-between gap-4 rounded-pill bg-gold px-5 py-3 text-sm font-semibold text-bg transition-colors hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">{daily.result ? "학습 결과" : daily.available ? "학습 시작" : "오늘의 학습"}<ArrowUpRight className="size-4" aria-hidden="true"/></Link>
        {Boolean(summary?.wrong_count) && <Link href="/learn/review" className={`${moreLink} mt-3`}>오답 복습 · {summary?.wrong_count}</Link>}
      </section>
    </div>
    <section aria-labelledby="home-meetings-heading"><div className="mb-5 flex items-center justify-between gap-4"><h2 id="home-meetings-heading" className="text-xl font-semibold">다가오는 모임</h2><Link href="/meetings" className={moreLink}>전체<ArrowUpRight className="size-4" aria-hidden="true"/></Link></div><MeetingList meetings={meetings.slice(0, 4)}/></section>
    <section aria-labelledby="home-partners-heading"><div className="mb-5 flex items-center justify-between gap-4"><h2 id="home-partners-heading" className="text-xl font-semibold">파트너</h2><Link href="/partners" className={moreLink}>전체<ArrowUpRight className="size-4" aria-hidden="true"/></Link></div><PartnerList partners={partners.slice(0, 3)} headingLevel={3}/></section>
  </div>;
}
