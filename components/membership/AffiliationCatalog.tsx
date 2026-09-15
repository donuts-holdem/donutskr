import Link from "next/link";
import { applyForAffiliation } from "@/app/membership/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { getAffiliationDirectory } from "@/lib/membership/server";
import type { AffiliationKind } from "@/lib/membership/types";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export async function AffiliationCatalog({ kind, embedded = false }: { kind: AffiliationKind; embedded?: boolean }) {
  const directory = await getAffiliationDirectory(kind);
  const isClass = kind === "CLASS";
  const title = isClass ? "클래스" : "클럽";
  const catalogItems = isClass
    ? directory.catalog.classes.map(item => ({ id: item.id, name: item.name, detail: `${weekdays[item.weekday]}요일 ${item.start_time.slice(0, 5)} / ${item.place}` }))
    : directory.catalog.clubs.map(item => ({ id: item.id, name: item.name, detail: directory.catalog.schools.find(school => school.id === item.school_id)?.name ?? "대학 동아리" }));
  const items = embedded ? catalogItems.filter(item => !directory.joinedIds.includes(item.id)) : catalogItems;
  const headingId = `${kind.toLowerCase()}-affiliation-heading`;
  return <section aria-labelledby={headingId}>
    <header className="border-b border-border pb-8">
      {!embedded && <p className="text-xs font-semibold tracking-widest text-gold">{kind} / MEMBERSHIP</p>}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        {embedded ? <h2 id={headingId} className="text-xl font-semibold">{title} 소속 신청</h2> : <h1 id={headingId} className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>}
        {!embedded && <p className="text-sm text-ink/70">내 소속 {directory.joinedIds.length}개</p>}
      </div>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/70">{isClass
        ? "여러 클래스에 함께 소속될 수 있습니다."
        : "다른 학교의 클럽에도 신청할 수 있습니다."}</p>
      {directory.isAdmin && <div className="mt-4 flex flex-wrap gap-5"><Link href="/admin/members" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">전체 소속 신청 관리</Link><Link href={isClass ? "/admin/classes" : "/admin/clubs"} className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">{title} 운영 관리</Link></div>}
    </header>
    {!items.length ? <p className="py-8 text-sm leading-relaxed text-ink/70">현재 신청 가능한 {title}이 없습니다.</p> : <ul className="divide-y divide-border">
      {items.map(item => {
        const joined = directory.joinedIds.includes(item.id);
        const request = directory.requests.find(row => (row.class_id ?? row.club_id) === item.id);
        const pending = request?.status === "PENDING";
        return <li key={item.id} className="grid gap-6 py-8 sm:grid-cols-3 sm:gap-8">
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-gold">{joined ? "내 소속" : pending ? "승인 대기" : request?.status === "REJECTED" ? "신청 반려" : "소속 신청 가능"}</p>
            {embedded ? <h3 className="mt-3 break-words text-lg font-semibold"><Link href={`/${isClass ? "class" : "club"}/${item.id}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{item.name}</Link></h3> : <h2 className="mt-3 break-words text-xl font-semibold"><Link href={`/${isClass ? "class" : "club"}/${item.id}`} className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{item.name}</Link></h2>}
            <p className="mt-3 text-sm leading-relaxed text-ink/70">{item.detail}</p>
            {!joined && request?.status === "REJECTED" && request.decision_reason && <p className="mt-4 text-sm leading-relaxed text-ink/70">반려 사유: {request.decision_reason}</p>}
          </div>
          <div className="self-center">
            {joined ? <p className="text-sm text-gold">소속 중</p> : pending ? <p role="status" className="text-sm leading-relaxed text-ink/70">승인 대기</p> : directory.canApply ? <ActionForm action={applyForAffiliation} label={request?.status === "REJECTED" ? "소속 다시 신청" : "소속 신청"}>
              <input type="hidden" name="kind" value={kind} /><input type="hidden" name="entity_id" value={item.id} />
            </ActionForm> : <p className="text-sm text-ink/70">관리자 조회 화면입니다.</p>}
          </div>
        </li>;
      })}
    </ul>}
  </section>;
}
