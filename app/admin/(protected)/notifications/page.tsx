import { requireAdmin } from "@/lib/auth";
import { processDomainJobs } from "@/app/notifications/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { emailDeliveryConfigured } from "@/lib/notifications/worker";
import { formatSessionDate } from "@/lib/classes/format";

interface EmailRow { id: string; recipient: string; status: string; attempts: number; last_error: string | null; created_at: string; sent_at: string | null }

export default async function NotificationOperationsPage() {
  const client = await requireAdmin();
  const { data, error } = await client.from("notification_emails").select("id,recipient,status,attempts,last_error,created_at,sent_at").order("created_at", { ascending: false }).limit(100).returns<EmailRow[]>();
  if (error) throw new Error("발송 기록을 불러오지 못했습니다.");
  const labels: Record<string, string> = { PENDING: "발송 대기", PROCESSING: "처리 중", SENT: "Resend 접수 완료", FAILED: "발송 실패 · 확인 필요", CANCELLED: "자격 변경·기한 만료로 발송 취소" };
  return <div className="max-w-5xl space-y-8"><header><p className="text-xs tracking-widest text-gold">OPERATIONS / NOTIFICATIONS</p><h1 className="mt-4 text-3xl font-bold">알림 발송 운영</h1>
    <p className="mt-4 text-sm text-muted-foreground">{emailDeliveryConfigured() ? "Resend 발송이 활성화되어 있습니다." : "이메일 발송은 아직 비활성 상태입니다. 앱 알림은 정상 기록되며 이메일은 대기열에 남습니다."}</p>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">접수 완료는 수신함 도착 보장이 아닙니다. 실패는 기록하며, 같은 멱등 키로 제한된 시간 안에서만 자동 재시도합니다.</p></header>
    <div className="max-w-xl"><ActionForm action={processDomainJobs} label="모임 대기열·보관 및 활성 이메일 작업 처리"><p className="text-sm text-muted-foreground">반복 호출해도 같은 자리나 학습 XP가 중복 생성되지 않습니다. 이메일은 설정이 활성화된 경우에만 최대 3건 처리합니다.</p></ActionForm></div>
    <section><h2 className="text-xl font-semibold">최근 이메일 작업 100건</h2><ul className="mt-5 divide-y divide-border">{(data ?? []).map(row => <li key={row.id} className="py-4">
      <p className="break-all text-sm font-semibold">{row.recipient} / {labels[row.status]}</p><p className="mt-2 text-xs text-muted-foreground">{formatSessionDate(row.created_at)} / 시도 {row.attempts}회</p>
      {row.last_error && <p className="mt-2 break-all text-xs text-coral-300">{row.last_error}</p>}
    </li>)}</ul>{!data?.length && <p className="mt-5 text-sm text-muted-foreground">아직 이메일 작업이 없습니다.</p>}</section>
  </div>;
}
