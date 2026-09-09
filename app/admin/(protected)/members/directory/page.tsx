import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { changeMemberSuspension, removeMembershipLeader } from "@/app/admin/actions/members";
import { ActionForm } from "@/components/membership/ActionForm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MemberStatus } from "@/lib/membership/types";

export const metadata = { title: "회원 관리 | DO:NUTS Admin" };

const statuses: Record<MemberStatus, string> = { PENDING: "이메일 인증 대기", ACTIVE: "정회원", SUSPENDED: "이용 정지", WITHDRAWN: "탈퇴" };
interface DirectoryMember {
  id: string;
  name: string;
  username: string;
  phone: string;
  status: MemberStatus;
  class_leaders: { class_id: string; classes: { name: string } | null }[];
  club_leaders: { club_id: string; clubs: { name: string } | null }[];
}

export default async function MemberDirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const supabase = await requireAdmin();
  const params = await searchParams;
  const search = (params.q ?? "").slice(0, 80).replace(/[^\p{L}\p{N}\s_+@-]/gu, "").trim();
  const status = Object.hasOwn(statuses, params.status ?? "") ? params.status as MemberStatus : "ALL";
  const parsed = Number(params.page ?? "1");
  const page = Number.isInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  let query = supabase.from("member_profiles").select("id,name,username,phone,status", { count: "exact" });
  if (status !== "ALL") query = query.eq("status", status);
  if (search) query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data: profiles, error, count } = await query.order("created_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1).returns<Omit<DirectoryMember, "class_leaders" | "club_leaders">[]>();
  if (error) throw new Error("회원 목록을 불러오지 못했습니다.");
  // Leadership now references Auth identities; do not infer a profile FK join.
  const memberIds = (profiles ?? []).map(member => member.id);
  const [classLeaders, clubLeaders] = memberIds.length ? await Promise.all([
    supabase.from("class_leaders").select("user_id,class_id,classes(name)").in("user_id", memberIds)
      .returns<(DirectoryMember["class_leaders"][number] & { user_id: string })[]>(),
    supabase.from("club_leaders").select("user_id,club_id,clubs(name)").in("user_id", memberIds)
      .returns<(DirectoryMember["club_leaders"][number] & { user_id: string })[]>(),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (classLeaders.error || clubLeaders.error) throw new Error("리더 배정을 불러오지 못했습니다.");
  const data: DirectoryMember[] = (profiles ?? []).map(member => ({ ...member,
    class_leaders: (classLeaders.data ?? []).filter(row => row.user_id === member.id),
    club_leaders: (clubLeaders.data ?? []).filter(row => row.user_id === member.id),
  }));
  const pageHref = (target: number) => `/admin/members/directory?${new URLSearchParams({ q: search, status, page: String(target) })}`;
  return <div className="mx-auto max-w-5xl space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">회원 관리</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">회원 상태와 담당 리더 권한을 관리합니다. 현재 필터 {count ?? 0}명.</p></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/admin/members">소속 신청 승인</Link></Button><Button asChild variant="outline"><Link href="/admin/members/settings">리더 지정 · 가입 설정</Link></Button></div>
    </header>
    <form action="/admin/members/directory" className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2"><Label htmlFor="member-search">이름·아이디·전화번호</Label><Input id="member-search" name="q" defaultValue={search} maxLength={80} /></div>
      <div className="space-y-2"><Label htmlFor="member-status">회원 상태</Label><Select name="status" defaultValue={status}><SelectTrigger id="member-status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">전체</SelectItem>{Object.entries(statuses).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <Button type="submit" variant="outline" className="self-end">회원 검색</Button>
    </form>
    {!data?.length ? <p className="border-y border-border py-12 text-center text-sm text-muted-foreground">조건에 맞는 회원이 없습니다.</p> : <ul className="divide-y divide-border border-y border-border">
      {data.map(member => {
        const suspended = member.status === "SUSPENDED";
        const leaders = [
          ...member.class_leaders.map(row => ({ kind: "CLASS", id: row.class_id, name: row.classes?.name ?? "클래스" })),
          ...member.club_leaders.map(row => ({ kind: "CLUB", id: row.club_id, name: row.clubs?.name ?? "클럽" })),
        ];
        return <li key={member.id} className="grid gap-6 py-8 lg:grid-cols-2">
          <div><p className="text-xs font-semibold text-gold">{statuses[member.status]}</p><h2 className="mt-3 text-lg font-semibold">{member.name} <span className="text-sm font-normal text-muted-foreground">{member.username}</span></h2><p className="mt-3 text-sm text-muted-foreground">{member.phone}</p>
            {!!leaders.length && <details className="mt-5 rounded-lg border border-border p-4"><summary className="cursor-pointer py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">담당 리더 권한 {leaders.length}개</summary><div className="mt-4 space-y-6">{leaders.map(leader => <ActionForm key={`${leader.kind}:${leader.id}`} action={removeMembershipLeader} label={`${leader.name} 리더 해제`}>
              <input type="hidden" name="kind" value={leader.kind} /><input type="hidden" name="entity_id" value={leader.id} /><input type="hidden" name="user_id" value={member.id} />
              <p className="text-sm leading-relaxed text-muted-foreground">{leader.kind === "CLASS" ? "클래스" : "클럽"} / {leader.name}. 마지막 리더라면 후임을 먼저 지정해야 합니다.</p>
            </ActionForm>)}</div></details>}
          </div>
          {member.status !== "WITHDRAWN" && <details className="self-start rounded-lg border border-border p-4"><summary className="cursor-pointer py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">{suspended ? "이용 정지 해제" : "회원 이용 정지"}</summary><div className="mt-4"><ActionForm action={changeMemberSuspension} label={suspended ? "정지 해제" : "이용 정지"}>
            <input type="hidden" name="user_id" value={member.id} /><input type="hidden" name="mode" value={suspended ? "RESTORE" : "SUSPEND"} />
            <p className="text-sm leading-relaxed text-muted-foreground">{suspended ? "이메일 인증 여부에 따라 회원 이용을 복구합니다. 기존 소속과 기록은 유지되지만 리더 권한은 자동으로 복구되지 않습니다." : "회원·리더 기능을 즉시 차단합니다. 마지막 리더여도 정지되므로 관리자가 운영을 이어가고 후임을 지정해야 합니다. 소속과 기록은 삭제하지 않습니다."}</p>
            <div className="space-y-2"><Label htmlFor={`status-reason-${member.id}`}>변경 사유</Label><Textarea id={`status-reason-${member.id}`} name="reason" maxLength={500} required /></div>
            <div className="flex items-start gap-3"><Checkbox id={`status-confirm-${member.id}`} name="confirm" required /><Label htmlFor={`status-confirm-${member.id}`} className="leading-relaxed">소속 보존과 리더 권한 처리 방식을 확인했습니다.</Label></div>
          </ActionForm></div></details>}
        </li>;
      })}
    </ul>}
    <nav aria-label="회원 목록 페이지" className="flex justify-between gap-3">
      {page > 1 && <Button asChild variant="outline"><Link href={pageHref(page - 1)}>이전</Link></Button>}
      {page * 50 < (count ?? 0) && <Button asChild variant="outline"><Link href={pageHref(page + 1)}>다음</Link></Button>}
    </nav>
  </div>;
}
