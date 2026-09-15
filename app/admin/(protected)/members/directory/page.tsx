import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getMemberAdminCatalog, getMemberDirectory, memberStatusLabels } from "@/lib/membership/admin-directory";
import type { DirectoryFilters } from "@/lib/membership/admin-directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const metadata = { title: "회원 관리 | DO:NUTS Admin" };

export default async function MemberDirectoryPage({ searchParams }: { searchParams: Promise<DirectoryFilters> }) {
  const params = await searchParams;
  const [directory, catalog] = await Promise.all([getMemberDirectory(params), getMemberAdminCatalog()]);
  const { members, count, page, filters } = directory;
  const pageHref = (target: number) => {
    const query = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]));
    query.set("page", String(target));
    return `/admin/members/directory?${query}`;
  };
  return <div className="mx-auto max-w-5xl space-y-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-baseline gap-3"><h1 className="text-2xl font-semibold text-gold">회원 관리</h1><span className="text-sm text-muted-foreground">{count.toLocaleString("ko-KR")}명</span></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/admin/members">소속 신청 승인</Link></Button><Button asChild variant="outline"><Link href="/admin/members/settings">가입 설정</Link></Button></div>
    </header>
    <form action="/admin/members/directory" method="get" className="grid gap-4 rounded-card border border-border p-5 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2"><Label htmlFor="member-search">이름·이메일·전화번호</Label><Input id="member-search" name="q" defaultValue={String(filters.q ?? "")} maxLength={80} className="min-h-11" /></div>
      <div className="space-y-2"><Label htmlFor="member-status">회원 상태</Label><Select name="status" defaultValue={String(filters.status ?? "ALL")}><SelectTrigger id="member-status" className="min-h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">전체 상태</SelectItem>{Object.entries(memberStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      {([{ name: "school_id", label: "학교", options: catalog.schools }, { name: "class_id", label: "클래스", options: catalog.classes }, { name: "club_id", label: "클럽", options: catalog.clubs }] as const).map(field => <div key={field.name} className="space-y-2">
        <Label htmlFor={`filter-${field.name}`}>{field.label}</Label>
        <Select name={field.name} defaultValue={String(filters[field.name] ?? "ALL")}><SelectTrigger id={`filter-${field.name}`} className="min-h-11 w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">전체 {field.label}</SelectItem>{field.options.map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>)}
      <div className="flex items-end gap-2"><Button type="submit" className="min-h-11 flex-1">회원 검색</Button><Button asChild variant="outline" className="min-h-11"><Link href="/admin/members/directory">초기화</Link></Button></div>
    </form>
    {!members.length ? <p className="border-y border-border py-12 text-center text-sm text-muted-foreground">조건에 맞는 회원이 없습니다.</p> : <ul className="divide-y divide-border border-y border-border">
      {members.map(member => <li key={member.id}>
        <Link href={`/admin/members/directory/${member.id}`} className="group grid min-w-0 gap-5 rounded-lg px-2 py-6 transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-2 sm:gap-8 sm:px-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3"><span className="text-xs font-semibold text-gold">{memberStatusLabels[member.status]}</span>{member.withdrawal_status === "AUTH_PENDING" && <span className="text-xs text-coral-to">개인정보 정리 필요</span>}</div>
            <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold"><span className="min-w-0 break-words">{member.name}</span><ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-gold" /></h2>
            {member.status !== "WITHDRAWN" && <p className="mt-2 break-all text-sm leading-relaxed text-muted-foreground">{member.email}<br />{member.phone}</p>}
          </div>
          <dl className="grid min-w-0 gap-2 text-sm">
            <div className="grid grid-cols-4 gap-3"><dt className="text-muted-foreground">학교</dt><dd className="col-span-3 break-words">{member.school_name || "미지정"}</dd></div>
            <div className="grid grid-cols-4 gap-3"><dt className="text-muted-foreground">클래스</dt><dd className="col-span-3 break-words">{member.classes.filter(row => row.active).map(row => row.name).join(" · ") || "없음"}</dd></div>
            <div className="grid grid-cols-4 gap-3"><dt className="text-muted-foreground">클럽</dt><dd className="col-span-3 break-words">{member.clubs.filter(row => row.active).map(row => row.name).join(" · ") || "없음"}</dd></div>
          </dl>
        </Link>
      </li>)}
    </ul>}
    {(page > 1 || page * 50 < count) && <nav aria-label="회원 목록 페이지" className="flex items-center justify-between gap-3">
      {page > 1 ? <Button asChild variant="outline" className="min-h-11"><Link href={pageHref(page - 1)}>이전</Link></Button> : <span />}
      <span className="text-sm text-muted-foreground">{page}</span>
      {page * 50 < count ? <Button asChild variant="outline" className="min-h-11"><Link href={pageHref(page + 1)}>다음</Link></Button> : <span />}
    </nav>}
  </div>;
}
