import { saveMeeting } from "@/app/meetings/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { Area, Check, Field, Pick } from "@/components/domains/Fields";
import { toSeoulInput } from "@/lib/classes/format";
import type { ClubMeeting } from "@/lib/meetings/types";

export function MeetingEditor({ clubs, meeting, isAdmin }: {
  clubs: { id: string; name: string }[]; meeting?: ClubMeeting; isAdmin: boolean;
}) {
  return <ActionForm action={saveMeeting} label={meeting ? "모임 변경 저장" : "모임 만들기"}>
    {meeting && <><input type="hidden" name="id" value={meeting.id} /><input type="hidden" name="revision" value={meeting.revision} /><input type="hidden" name="club_id" value={meeting.club_id ?? "DONUTS"} /></>}
    {!meeting && <Pick name="club_id" label="주최" defaultValue={isAdmin ? "DONUTS" : undefined} options={[...(isAdmin ? [{value:"DONUTS",label:"DO:NUTS"}] : []), ...clubs.map(c => ({ value: c.id, label: c.name }))]} />}
    <Field name="title" label="모임 이름" defaultValue={meeting?.title} maxLength={160} />
    <Area name="description" label="모임 소개" defaultValue={meeting?.description} required={false} />
    <Field name="place" label="장소" defaultValue={meeting?.place} maxLength={300} />
    <Field name="scheduled_at" label="모임 일시 · 서울 기준" type="datetime-local" defaultValue={meeting ? toSeoulInput(meeting.scheduled_at) : undefined} />
    <div className="grid gap-5 sm:grid-cols-2"><Field name="capacity" label="정원 · 0 또는 빈칸은 제한 없음" type="number" min={0} defaultValue={meeting?.capacity ?? ""} required={false} />
      <Field name="hold_hours" label="대기자 자리 확정 시간" type="number" min={1} defaultValue={meeting?.hold_hours ?? 12} /></div>
    <Check name="guest_allowed" defaultChecked={meeting?.guest_allowed}>클럽 외 회원 허용</Check>
    <Check name="signup_open" defaultChecked={meeting?.signup_open ?? true}>참가 신청 받기</Check>
    {isAdmin ? <Check name="hot" defaultChecked={meeting?.hot}>HOT</Check> : meeting?.hot && <input type="hidden" name="hot" value="on" />}
    {meeting && <Area name="reason" label="변경 사유" maxLength={500} />}
  </ActionForm>;
}
