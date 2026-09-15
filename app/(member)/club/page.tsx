import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AffiliationCatalog } from "@/components/membership/AffiliationCatalog";
import { ClubLogo } from "@/components/clubs/ClubLogo";
import { MeetingList } from "@/components/meetings/MeetingList";
import { getMemberAffiliations } from "@/lib/membership/server";
import { getClubOverview } from "@/lib/clubs/server";
import { getMeetingIndex } from "@/lib/meetings/server";

export const metadata = { title: "클럽 | DO:NUTS CLASS" };
export default async function ClubPage() {
  const [member, { meetings }] = await Promise.all([getMemberAffiliations(), getMeetingIndex()]);
  const clubs = await Promise.all(member.clubs.map(club => getClubOverview(club.id)));
  return <div className="space-y-12">
    <section aria-labelledby="club-heading"><header className="border-b border-border pb-8"><p className="text-xs font-semibold tracking-widest text-gold">CLUB</p><h1 id="club-heading" className="mt-4 text-3xl font-semibold sm:text-4xl">내 클럽</h1></header>
      {clubs.length ? <ul className="mt-6 divide-y divide-border">{clubs.map(({ club, school, memberCount }) => <li key={club.id}><Link href={`/club/${club.id}`} className="group flex items-center gap-5 py-6 focus-visible:outline-2 focus-visible:outline-gold"><ClubLogo name={club.name} logoUrl={club.logo_url}/><div className="min-w-0 flex-1"><p className="text-xs text-ink/60">{school} · {memberCount}명{club.archived_at ? " · 보관됨" : ""}</p><h2 className="mt-2 break-words text-xl font-semibold group-hover:text-gold">{club.name}</h2></div><ArrowUpRight className="size-5 shrink-0 text-gold" aria-hidden="true"/></Link></li>)}</ul> : <p className="mt-6 text-sm text-ink/70">소속된 클럽이 없습니다.</p>}
    </section>
    <section aria-labelledby="club-meetings-heading"><div className="mb-5 flex items-center justify-between gap-4"><h2 id="club-meetings-heading" className="text-xl font-semibold">다가오는 모임</h2><Link href="/meetings" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold focus-visible:outline-2 focus-visible:outline-gold">전체<ArrowUpRight className="size-4" aria-hidden="true"/></Link></div><MeetingList meetings={meetings}/></section>
    <AffiliationCatalog kind="CLUB" embedded/>
  </div>;
}
