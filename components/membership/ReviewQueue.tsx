import { reviewMembership } from "@/app/admin/actions/members";
import { ActionForm } from "@/components/membership/ActionForm";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewApplication } from "@/lib/membership/types";

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export function ReviewQueue({ requests }: { requests: ReviewApplication[] }) {
  if (!requests.length) return <p className="border-y border-border py-12 text-center text-sm text-muted-foreground">이 상태의 소속 신청이 없습니다.</p>;
  return <ol className="divide-y divide-border border-y border-border">
    {requests.map(request => <li key={request.id} className="grid gap-6 py-7 lg:grid-cols-2 lg:gap-10">
      <div>
        <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(request.created_at))}</p>
        <h2 className="mt-2 text-lg font-semibold">{request.member?.name ?? "회원 정보 열람 제한"}<span className="ml-3 text-sm font-normal text-muted-foreground">{request.member?.username}</span></h2>
        {request.member && <p className="mt-2 text-sm text-muted-foreground">{request.member.phone}</p>}
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex gap-4"><dt className="w-12 shrink-0 text-muted-foreground">학교</dt><dd>{request.member?.school?.name ?? request.member?.other_school_name ?? "정보 확인 필요"}</dd></div>
          <div className="flex gap-4"><dt className="w-12 shrink-0 text-muted-foreground">신청</dt><dd>{request.kind === "CLASS" ? `클래스 / ${request.requested_class?.name ?? "정보 확인 필요"}` : `클럽 / ${request.requested_club?.name ?? "정보 확인 필요"}`}</dd></div>
        </dl>
      </div>
      {request.status === "PENDING" ? <div className="space-y-5">
        <ActionForm action={reviewMembership} label="이 소속 승인" pendingLabel="승인 처리 중..." disabled={request.member?.status !== "ACTIVE"}>
          <input type="hidden" name="request_id" value={request.id} /><input type="hidden" name="decision" value="APPROVED" />
          <p className="text-sm leading-relaxed text-muted-foreground">{request.member?.status === "ACTIVE" ? "선택한 소속만 승인합니다. 다른 클래스·클럽 소속과 정회원 자격은 변경하지 않습니다." : "이메일 인증을 완료한 정회원만 승인할 수 있습니다. 정지·탈퇴 회원은 승인할 수 없습니다."}</p>
        </ActionForm>
        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer py-1 text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">정보 보완이 필요한 경우 반려</summary>
          <div className="mt-4"><ActionForm action={reviewMembership} label="사유를 남기고 반려" disabled={!request.member || request.member.status === "SUSPENDED" || request.member.status === "WITHDRAWN"}>
            <input type="hidden" name="request_id" value={request.id} /><input type="hidden" name="decision" value="REJECTED" />
            <div className="space-y-2"><Label htmlFor={`reason-${request.id}`}>회원에게 표시할 반려 사유</Label><Textarea id={`reason-${request.id}`} name="reason" maxLength={500} required /></div>
          </ActionForm></div>
        </details>
      </div> : <div><p className="text-sm font-semibold text-gold">{request.status === "APPROVED" ? "승인 완료" : "반려"}</p>{request.decision_reason && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{request.decision_reason}</p>}</div>}
    </li>)}
  </ol>;
}
