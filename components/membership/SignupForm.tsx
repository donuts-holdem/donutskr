import { signupMember } from "@/app/auth/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MemberProfile, SignupCatalog } from "@/lib/membership/types";

export function SignupForm({ catalog, email, profile }: { catalog: SignupCatalog; email?: string; profile?: MemberProfile | null }) {
  return (
    <ActionForm action={signupMember} label="가입 신청" pendingLabel="신청 정보를 보내는 중...">
      <input type="hidden" name="consent_version" value={catalog.settings.consent_version ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="name">이름</Label><Input className="h-11" id="name" name="name" autoComplete="name" defaultValue={profile?.name} maxLength={80} required /></div>
        <div className="space-y-2"><Label htmlFor="phone">전화번호</Label><Input className="h-11" id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile?.phone} maxLength={24} required /></div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input className="h-11" id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} defaultValue={email} readOnly={Boolean(email)} maxLength={254} aria-describedby="email-help" required />
        <p id="email-help" className="text-xs leading-relaxed text-ink/60">로그인, 가입 인증과 비밀번호 재설정에 사용합니다. 별도 아이디는 만들지 않습니다.</p>
      </div>
      {!email && <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="password">비밀번호</Label><Input className="h-11" id="password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /><p className="text-xs text-ink/60">10자 이상, 72바이트 이하</p></div>
        <div className="space-y-2"><Label htmlFor="password-confirm">비밀번호 확인</Label><Input className="h-11" id="password-confirm" name="password_confirm" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></div>
      </div>}
      <div className="border-t border-border pt-5">
        <p className="mb-5 text-sm font-semibold text-gold">신청 소속</p>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="school">학교</Label>
            <Select name="school_id" defaultValue={profile?.school_id ?? (profile?.other_school_name ? "other" : undefined)} required>
              <SelectTrigger id="school" className="w-full data-[size=default]:h-11"><SelectValue placeholder="학교 선택" /></SelectTrigger>
              <SelectContent>{catalog.schools.map(school => <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>)}<SelectItem value="other">기타</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="other-school">기타 학교명</Label><Input className="h-11" id="other-school" name="other_school_name" defaultValue={profile?.other_school_name ?? ""} maxLength={120} placeholder="학교에서 '기타'를 선택한 경우 입력" /></div>
          <div className="space-y-2">
            <Label htmlFor="club">동아리</Label>
            <Select name="club_id" defaultValue="none">
              <SelectTrigger id="club" className="w-full data-[size=default]:h-11"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">없음</SelectItem>{catalog.clubs.map(club => <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="class">클래스</Label>
            <Select name="class_id" required>
              <SelectTrigger id="class" className="w-full data-[size=default]:h-11"><SelectValue placeholder="신청할 클래스 선택" /></SelectTrigger>
              <SelectContent>{catalog.classes.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-card border border-border p-4">
        <Checkbox id="consent" name="consent" required className="mt-1" />
        <div className="space-y-2">
          <Label htmlFor="consent" className="text-sm leading-relaxed">개인정보 수집·이용 안내를 확인하고 동의합니다.</Label>
          <a href={catalog.settings.privacy_url ?? undefined} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">개인정보 수집·이용 안내 열기</a>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-ink/60">이메일 인증을 완료하면 정회원으로 이용할 수 있습니다. 클래스와 동아리 소속은 각각 담당자의 승인 후 확정되며, 다른 학교의 동아리에도 신청할 수 있습니다.</p>
    </ActionForm>
  );
}
