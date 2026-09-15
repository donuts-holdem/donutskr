import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSignupCatalog } from "@/lib/membership/server";
import { createMembershipCatalogEntry, saveMembershipSettings } from "@/app/admin/actions/members";
import { ActionForm } from "@/components/membership/ActionForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const metadata = { title: "초기 가입 설정 | DO:NUTS Admin" };

export default async function MembershipSettingsPage() {
  const supabase = await requireAdmin();
  const catalog = await getSignupCatalog(supabase);
  return <div className="mx-auto max-w-4xl space-y-8">
    <header><Button asChild variant="link" className="mb-3 px-0"><Link href="/admin/members">소속 신청</Link></Button><h1 className="text-2xl font-semibold">가입 설정 · 학교</h1></header>
    <Card><CardHeader><CardTitle>가입 접수와 개인정보 안내</CardTitle><CardDescription>인증 메일 발송 설정은 Supabase에서 별도로 완료해야 합니다.</CardDescription></CardHeader><CardContent>
      <ActionForm action={saveMembershipSettings} label="가입 설정 저장">
        <div className="flex items-center gap-3"><Checkbox id="signup-open" name="signup_open" defaultChecked={catalog.settings.signup_open} /><Label htmlFor="signup-open">현장 가입 신청 받기</Label></div>
        <div className="space-y-2"><Label htmlFor="privacy-url">실제 개인정보 수집·이용 안내 URL</Label><Input id="privacy-url" name="privacy_url" type="url" defaultValue={catalog.settings.privacy_url ?? ""} placeholder="https://..." /></div>
        <div className="space-y-2"><Label htmlFor="consent-version">동의 문서 버전</Label><Input id="consent-version" name="consent_version" defaultValue={catalog.settings.consent_version ?? ""} maxLength={80} placeholder="게시한 문서의 버전 식별자" /></div>
        <p className="text-xs leading-relaxed text-muted-foreground">동의 문서를 변경하면 버전도 변경해 주세요.</p>
      </ActionForm>
    </CardContent></Card>
    <section aria-labelledby="catalog-heading" className="space-y-6">
      <h2 id="catalog-heading" className="text-lg font-semibold">학교</h2>
      <Card><CardHeader><CardTitle>학교 등록</CardTitle><CardDescription>{catalog.schools.map(school => school.name).join(" / ") || "등록된 학교가 없습니다."}</CardDescription></CardHeader><CardContent>
        <ActionForm action={createMembershipCatalogEntry} label="학교 등록"><input type="hidden" name="kind" value="school" /><div className="space-y-2"><Label htmlFor="school-name">학교명</Label><Input id="school-name" name="name" maxLength={120} required /></div></ActionForm>
      </CardContent></Card>
      <div className="flex flex-wrap gap-3"><Button asChild variant="outline" className="h-11"><Link href="/admin/classes">클래스 · 회차 · 리더 관리</Link></Button><Button asChild variant="outline" className="h-11"><Link href="/admin/clubs">클럽 · 리더 관리</Link></Button></div>
    </section>
  </div>;
}
