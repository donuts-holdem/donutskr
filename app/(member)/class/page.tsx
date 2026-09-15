import Link from "next/link";
import { AffiliationCatalog } from "@/components/membership/AffiliationCatalog";
import { ClassProgress } from "@/components/classes/ClassProgress";
import { getMemberAffiliations } from "@/lib/membership/server";
import { getClassOverview } from "@/lib/classes/server";
import { classStatus, weekdays } from "@/lib/classes/format";

export const metadata = { title: "클래스 | DO:NUTS CLASS" };

export default async function ClassPage() {
  const affiliations = await getMemberAffiliations();
  const courses = await Promise.all(affiliations.classes.map(course => getClassOverview(course.id)));
  const current = courses.filter(({ course }) => !course.closed_at && !course.archived_at);
  const past = courses.filter(({ course }) => course.closed_at || course.archived_at);
  return <div className="space-y-12">
    <section aria-labelledby="my-class-heading" className="space-y-8">
      <header className="border-b border-border pb-8"><p className="text-xs font-semibold tracking-widest text-gold">CLASS</p><h1 id="my-class-heading" className="mt-4 text-3xl font-semibold sm:text-4xl">내 클래스</h1></header>
      {!current.length ? <p className="text-sm text-ink/70">현재 참여 중인 클래스가 없습니다.</p> : <ul className="space-y-8">{current.map(({ course, sessions }) => <li key={course.id} className="space-y-5">
        <div><h2 className="break-words text-xl font-semibold"><Link href={`/class/${course.id}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{course.name}</Link></h2><p className="mt-2 text-sm text-ink/70">{course.place} · {weekdays[course.weekday]} {course.start_time.slice(0, 5)}</p></div>
        <ClassProgress sessions={sessions} classId={course.id} />
      </li>)}</ul>}
      {past.length > 0 && <details className="border-y border-border py-4"><summary className="cursor-pointer py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-gold">지난 클래스 · {past.length}</summary><ul className="divide-y divide-border">{past.map(({ course, sessions }) => <li key={course.id} className="py-4"><p className="text-xs text-gold">{classStatus(course)} · {sessions.length}회차</p><Link href={`/class/${course.id}`} className="mt-1 inline-flex min-h-11 items-center break-words text-base font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{course.name}</Link></li>)}</ul></details>}
    </section>
    <AffiliationCatalog kind="CLASS" embedded />
  </div>;
}
