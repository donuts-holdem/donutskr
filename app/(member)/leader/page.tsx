import Link from "next/link";
import { getClassIndex } from "@/lib/classes/server";
import { getClubIndex } from "@/lib/clubs/server";
import { classStatus, weekdays } from "@/lib/classes/format";
import { getReviewQueue, requireReviewer } from "@/lib/membership/server";
import { ClubLogo } from "@/components/clubs/ClubLogo";

export const metadata = { title: "리더 홈 | DO:NUTS CLASS" };

export default async function LeaderDashboardPage({ searchParams }: { searchParams?: Promise<{ view?: string }> } = {}) {
  const supabase = await requireReviewer();
  const [classes, clubs, search] = await Promise.all([getClassIndex(), getClubIndex(), searchParams]);
  const isAdmin = classes.isAdmin;
  const scope = isAdmin ? undefined : { classIds: classes.classes.map(course => course.id), clubIds: clubs.clubs.map(club => club.id), excludeUserId: classes.user.id };
  const { count } = await getReviewQueue(supabase, 1, "PENDING", scope);
  const classPath = isAdmin ? "/admin/classes" : "/leader/class";
  const clubPath = isAdmin ? "/admin/clubs" : "/leader/club";
  const classSection = classes.classes.length > 0 && <section aria-labelledby="leader-classes-heading">
    <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="leader-classes-heading" className="text-xl font-semibold">담당 클래스</h2><span className="text-sm text-ink/60">{classes.classes.length}개</span></div>
    <ul className="mt-4 divide-y divide-border border-y border-border">{classes.classes.map(course => <li key={course.id} className="py-5"><p className="text-xs font-semibold text-gold">{classStatus(course)}{!course.closed_at && !course.archived_at ? ` · ${course.active ? "소속 신청 중" : "소속 신청 중지"}` : ""}</p><Link href={`${classPath}/${course.id}`} className="mt-1 inline-flex min-h-11 items-center break-words text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{course.name}</Link><p className="mt-1 text-sm text-ink/70">{course.place} · {weekdays[course.weekday]} {course.start_time.slice(0, 5)}</p></li>)}</ul>
  </section>;
  const clubSection = clubs.clubs.length > 0 && <section aria-labelledby="leader-clubs-heading">
    <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="leader-clubs-heading" className="text-xl font-semibold">담당 클럽</h2><span className="text-sm text-ink/60">{clubs.clubs.length}개</span></div>
    <ul className="mt-4 divide-y divide-border border-y border-border">{clubs.clubs.map(club => <li key={club.id} className="flex items-start gap-4 py-5"><ClubLogo name={club.name} logoUrl={club.logo_url} /><div className="min-w-0"><p className="text-xs font-semibold text-gold">{club.archived_at ? "보관됨" : "운영 중"}</p><Link href={`${clubPath}/${club.id}`} className="mt-1 inline-flex min-h-11 items-center break-words text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{club.name}</Link><p className="mt-1 text-sm text-ink/70">{clubs.schools.find(school => school.id === club.school_id)?.name ?? "학교 미등록"}</p></div></li>)}</ul>
  </section>;
  return <div className="space-y-10">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8"><div><p className="text-xs font-semibold tracking-widest text-gold">LEADER</p><h1 className="mt-4 text-3xl font-semibold sm:text-4xl">리더 홈</h1></div><Link href="/home" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">회원 홈</Link></header>
    <Link href="/leader/approvals" className="flex items-center justify-between gap-4 rounded-card border border-gold/30 bg-glass p-6 focus-visible:outline-2 focus-visible:outline-gold"><span className="text-base font-semibold">승인 대기</span><span className="font-mono text-3xl text-gold">{count}<span className="ml-2 font-sans text-sm text-ink/70">건</span></span></Link>
    {search?.view === "club" ? <>{clubSection}{classSection}</> : <>{classSection}{clubSection}</>}
    {!classes.classes.length && !clubs.clubs.length && <p className="text-sm text-ink/70">현재 담당하는 클래스와 클럽이 없습니다.</p>}
    {(isAdmin || clubs.clubs.length > 0) && <Link href={isAdmin ? "/admin/meetings" : "/leader/meetings"} className="inline-flex min-h-11 items-center rounded-pill border border-gold px-5 text-sm font-semibold text-gold hover:bg-glass focus-visible:outline-2 focus-visible:outline-gold">모임 운영</Link>}
  </div>;
}
