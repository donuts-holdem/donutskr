import "server-only";
import { createClient } from "@supabase/supabase-js";

interface EmailJob { id: string; lease_id: string; payload: { from: string; to: string[]; subject: string; text: string } }

export function emailDeliveryConfigured() {
  return process.env.NOTIFICATION_EMAIL_ENABLED === "true" && Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATIONS_FROM_EMAIL && process.env.NEXT_PUBLIC_APP_URL);
}

export async function runDomainJobs() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("작업용 데이터베이스 연결이 설정되지 않았습니다.");
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const maintenance = await client.rpc("maintain_club_meetings");
  if (maintenance.error) throw new Error("모임 대기열과 보관 작업을 처리하지 못했습니다.");
  if (!emailDeliveryConfigured()) return { maintained: Number(maintenance.data ?? 0), emailEnabled: false, sent: 0, failed: 0 };
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
  const claim = await client.rpc("claim_notification_emails", { p_sender: process.env.NOTIFICATIONS_FROM_EMAIL!, p_origin: origin, p_limit: 3 });
  if (claim.error) throw new Error("이메일 발송 대기열을 가져오지 못했습니다.");
  let sent = 0, failed = 0;
  for (const job of (claim.data ?? []) as EmailJob[]) {
    let providerId: string | null = null, error: string | null = null, retryable = false;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY!, "Content-Type": "application/json", "Idempotency-Key": "donuts-notification/" + job.id },
        body: JSON.stringify(job.payload), signal: AbortSignal.timeout(8000),
      });
      const body = await response.json().catch(() => null) as { id?: string } | null;
      if (response.ok && typeof body?.id === "string") providerId = body.id;
      else { error = "resend_http_" + response.status; retryable = response.ok || response.status === 408 || response.status === 429 || response.status >= 500; }
    } catch { error = "resend_network_or_timeout"; retryable = true; }
    const finish = await client.rpc("finish_notification_email", { p_id: job.id, p_lease: job.lease_id, p_provider_id: providerId, p_error: error, p_retryable: retryable });
    if (finish.error) throw new Error("발송 결과 기록에 실패했습니다. 같은 멱등 키로 재시도하도록 임대를 유지합니다.");
    if (providerId) sent++; else failed++;
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return { maintained: Number(maintenance.data ?? 0), emailEnabled: true, sent, failed };
}
