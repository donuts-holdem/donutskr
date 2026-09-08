import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSignupCatalog } from "@/lib/membership/server";
import { assignMembershipLeader, createMembershipCatalogEntry, saveMembershipSettings } from "@/app/admin/actions/members";
import { ActionForm } from "@/components/membership/ActionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const metadata = { title: "초기 가입 설정 | DO:NUTS Admin" };
const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export default async function MembershipSettingsPage() {
  const supabase = await requireAdmin();
  const catalog = await getSignupCatalog(supabase);
  const members = await supabase.from("member_profiles").select("id,name,username").eq("status", "ACTIVE").order("name");
  if (members.error) throw new Error("리더 후보를 불러오지 못했습니다.");
  return <div className="mx-auto max-w-4xl space-y-8">
    <header><Button asChild variant="link" className="mb-3 px-0"><Link href="/admin/members">회원 승인으로</Link></Button><h1 className="text-2xl font-semibold">초기 가입 설정</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">실제 소속과 동의 문서를 등록한 뒤 가입을 열어 주세요. 첫 회원은 관리자가 승인한 후 담당 리더로 지정할 수 있습니다.</p></header>
    <Card><CardHeader><CardTitle>가입 접수와 개인정보 안내</CardTitle><CardDescription>인증 메일 발송 설정은 Supabase에서 별도로 완료해야 합니다.</CardDescription></CardHeader><CardContent>
      <ActionForm action={saveMembershipSettings} label="가입 설정 저장">
        <div className="flex items-center gap-3"><Checkbox id="signup-open" name="signup_open" defaultChecked={catalog.settings.signup_open} /><Label htmlFor="signup-open">현장 가입 신청 받기</Label></div>
        <div className="space-y-2"><Label htmlFor="privacy-url">실제 개인정보 수집·이용 안내 URL</Label><Input id="privacy-url" name="privacy_url" type="url" defaultValue={catalog.settings.privacy_url ?? ""} placeholder="https://..." /></div>
        <div className="space-y-2"><Label htmlFor="consent-version">동의 문서 버전</Label><Input id="consent-version" name="consent_version" defaultValue={catalog.settings.consent_version ?? ""} maxLength={80} placeholder="게시한 문서의 버전 식별자" /></div>
        <p className="text-xs leading-relaxed text-muted-foreground">동의한 시점의 문서 URL과 버전은 각 신청 이력에 보존됩니다. 문서를 변경하면 버전도 변경해 주세요.</p>
      </ActionForm>
    </CardContent></Card>
    <section aria-labelledby="catalog-heading" className="space-y-6">
      <div><h2 id="catalog-heading" className="text-lg font-semibold">가입 소속 선택지</h2><p className="mt-2 text-sm text-muted-foreground">가입에 필요한 기본정보를 등록합니다. 회차 운영과 CLASS·CLUB 전체 편집은 다음 구현 단계입니다.</p></div>
      <Card><CardHeader><CardTitle>학교</CardTitle><CardDescription>{catalog.schools.map(school => school.name).join(" / ") || "등록된 학교가 없습니다. 가입 화면의 기타 학교 입력은 항상 제공됩니다."}</CardDescription></CardHeader><CardContent>
        <ActionForm action={createMembershipCatalogEntry} label="학교 등록"><input type="hidden" name="kind" value="school" /><div className="space-y-2"><Label htmlFor="school-name">학교명</Label><Input id="school-name" name="name" maxLength={120} required /></div></ActionForm>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>클래스</CardTitle><CardDescription>{catalog.classes.map(item => item.name).join(" / ") || "등록된 클래스가 없습니다."}</CardDescription></CardHeader><CardContent>
        <ActionForm action={createMembershipCatalogEntry} label="클래스 선택지 등록">
          <input type="hidden" name="kind" value="class" />
          <div className="space-y-2"><Label htmlFor="class-name">클래스명</Label><Input id="class-name" name="name" maxLength={120} required /></div>
          <div className="space-y-2"><Label htmlFor="class-place">장소</Label><Input id="class-place" name="place" maxLength={200} required /></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="weekday">요일</Label><Select name="weekday" required><SelectTrigger id="weekday" className="w-full"><SelectValue placeholder="요일 선택" /></SelectTrigger><SelectContent>{weekdays.map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="start-time">시작 시간</Label><Input id="start-time" name="start_time" type="time" required /></div>
          </div>
        </ActionForm>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>동아리</CardTitle><CardDescription>{catalog.clubs.map(club => club.name).join(" / ") || "등록된 동아리가 없습니다. 동아리 없이도 가입 신청할 수 있습니다."}</CardDescription></CardHeader><CardContent>
        <ActionForm action={createMembershipCatalogEntry} label="동아리 선택지 등록" disabled={!catalog.schools.length}>
          <input type="hidden" name="kind" value="club" />
          <div className="space-y-2"><Label htmlFor="club-name">동아리명</Label><Input id="club-name" name="name" maxLength={120} required /></div>
          <div className="space-y-2"><Label htmlFor="club-school">소속 학교</Label><Select name="school_id" required><SelectTrigger id="club-school" className="w-full"><SelectValue placeholder="학교 선택" /></SelectTrigger><SelectContent>{catalog.schools.map(school => <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>)}</SelectContent></Select></div>
          {!catalog.schools.length && <p className="text-sm text-muted-foreground">동아리의 학교를 먼저 등록해 주세요.</p>}
        </ActionForm>
      </CardContent></Card>
    </section>
    <Card><CardHeader><CardTitle>담당 리더 지정</CardTitle><CardDescription>초기 운영진 설정용입니다. 한 회원에게 여러 클래스·동아리를 지정할 수 있습니다.</CardDescription></CardHeader><CardContent>
      <ActionForm action={assignMembershipLeader} label="담당 리더 추가" disabled={!members.data?.length || (!catalog.classes.length && !catalog.clubs.length)}>
        <div className="space-y-2"><Label htmlFor="leader-user">승인된 회원</Label><Select name="user_id" required><SelectTrigger id="leader-user" className="w-full"><SelectValue placeholder="회원 선택" /></SelectTrigger><SelectContent>{(members.data ?? []).map(member => <SelectItem key={member.id} value={member.id}>{member.name} ({member.username})</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="assignment">담당 소속</Label><Select name="assignment" required><SelectTrigger id="assignment" className="w-full"><SelectValue placeholder="클래스 또는 동아리 선택" /></SelectTrigger><SelectContent>{catalog.classes.map(item => <SelectItem key={item.id} value={`CLASS:${item.id}`}>클래스 / {item.name}</SelectItem>)}{catalog.clubs.map(club => <SelectItem key={club.id} value={`CLUB:${club.id}`}>동아리 / {club.name}</SelectItem>)}</SelectContent></Select></div>
        {!members.data?.length && <p className="text-sm text-muted-foreground">먼저 실제 운영진의 가입 신청을 승인해 주세요.</p>}
      </ActionForm>
    </CardContent></Card>
  </div>;
}
