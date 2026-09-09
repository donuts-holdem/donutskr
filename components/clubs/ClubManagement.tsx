import Link from "next/link";
import { getClubIndex, getManagedClub } from "@/lib/clubs/server";
import { getEntityHistory } from "@/lib/membership/operations";
import { ClubEditor, EntityRetirement } from "@/components/membership/EntityForms";
import { EntityPeoplePanel } from "@/components/membership/EntityPeoplePanel";
import { OperationHistory } from "@/components/membership/OperationHistory";
import { Button } from "@/components/ui/button";

export async function ClubManagementIndex({ basePath }: { basePath: string }) {
  const data = await getClubIndex();
  return <div className="mx-auto max-w-5xl space-y-10"><header className="border-b border-border pb-8"><p className="text-xs font-semibold tracking-widest text-gold">CLUB OPERATIONS</p><h1 className="mt-4 text-3xl font-semibold">{data.isAdmin ? "클럽 관리" : "담당 클럽"}</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">클럽 소개와 학교, 담당 리더와 소속 회원을 관리합니다. 클래스의 회차와 클럽 모임은 별개이며, 모임 운영은 다음 구현 범위입니다.</p><div className="mt-4 flex flex-wrap gap-5"><Link href={data.isAdmin ? "/admin/members" : "/leader/approvals"} className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">소속 신청 승인</Link>{data.isAdmin && <Link href="/admin/members/settings" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">학교 등록</Link>}</div></header>
    {!data.clubs.length ? <p className="py-6 text-sm text-muted-foreground">{data.isAdmin ? "아직 클럽이 없습니다. 학교와 담당 리더를 선택해 등록해 주세요." : "현재 담당하는 클럽이 없습니다."}</p> : <ul className="divide-y divide-border">{data.clubs.map(club => <li key={club.id} className="flex flex-wrap items-start justify-between gap-4 py-6"><div><p className="text-xs font-semibold text-gold">{club.archived_at ? "보관됨" : "운영 중"}</p><h2 className="mt-2 text-xl font-semibold"><Link href={`${basePath}/${club.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-ring">{club.name}</Link></h2><p className="mt-3 text-sm text-muted-foreground">{data.schools.find(school => school.id === club.school_id)?.name ?? "학교 미등록"}</p></div><Button asChild variant="outline" className="h-11"><Link href={`${basePath}/${club.id}`}>{club.archived_at ? "보관 기록 보기" : "클럽 운영"}</Link></Button></li>)}</ul>}
    {data.isAdmin && <details className="rounded-card border border-border bg-card p-5 sm:p-8"><summary className="cursor-pointer py-2 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-ring">새 클럽 생성</summary><div className="mt-6 max-w-2xl"><ClubEditor schools={data.schools} candidates={data.candidates} currentUserId={data.user.id} /></div></details>}
  </div>;
}

export async function ClubManagement({ id, basePath }: { id: string; basePath: string }) {
  const data = await getManagedClub(id);
  const events = await getEntityHistory(data.supabase, "CLUB", id);
  const { club } = data;
  return <div className="mx-auto max-w-5xl space-y-10"><header className="border-b border-border pb-8"><Button asChild variant="link" className="mb-4 h-11 px-0"><Link href={basePath}>클럽 운영 목록</Link></Button><p className="text-xs font-semibold tracking-widest text-gold">{club.archived_at ? "보관됨" : "운영 중"} / CLUB</p><h1 className="mt-4 break-words text-3xl font-semibold">{club.name}</h1><p className="mt-4 text-sm text-muted-foreground">{data.school}{club.default_atc !== null ? ` / 기본 ATC ${club.default_atc.toLocaleString("ko-KR")}` : ""}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{club.description || "등록된 클럽 소개가 없습니다."}</p>{club.logo_url && <a href={club.logo_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">등록된 로고 보기 (새 탭)</a>}{club.archived_at && <p className="mt-4 text-sm text-gold">보관된 클럽입니다. 소속과 운영 이력은 읽기 전용으로 유지됩니다.</p>}</header>
    <div className="grid items-start gap-10 lg:grid-cols-2"><EntityPeoplePanel kind="CLUB" id={id} people={data.people} candidates={data.candidates} isAdmin={data.isAdmin} archived={Boolean(club.archived_at)} /><div className="min-w-0 space-y-6">{data.isAdmin && !club.archived_at && <><details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">클럽 기본 정보 편집</summary><div className="mt-5"><ClubEditor club={club} schools={data.schools} candidates={data.candidates} currentUserId={data.user.id} /></div></details><EntityRetirement kind="CLUB" id={id} revision={club.revision} /></>}<p className="rounded-lg border border-border p-5 text-sm leading-relaxed text-muted-foreground">클럽 모임의 신청·정원·대기열·지난 모임 보기는 별도 구현 예정입니다. 이 화면의 소속 승인은 모임 참가 신청을 대신하지 않습니다.</p></div></div>
    <OperationHistory events={events} />
  </div>;
}
