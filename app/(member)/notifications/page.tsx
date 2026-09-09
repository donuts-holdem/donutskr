import Link from "next/link";
import { requireActiveMember } from "@/lib/membership/server";
import { markNotification } from "@/app/notifications/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { formatSessionDate } from "@/lib/classes/format";

interface Notice { id: string; title: string; body: string; path: string; created_at: string; read_at: string | null; expires_at: string | null }

export const metadata = { title: "알림 | DO:NUTS CLASS" };
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { supabase, user } = await requireActiveMember(), params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const { data, error, count } = await supabase.from("member_notifications").select("id,title,body,path,created_at,read_at,expires_at", { count: "exact" })
    .eq("user_id", user.id).order("created_at", { ascending: false }).order("id").range((page - 1) * 50, page * 50 - 1).returns<Notice[]>();
  if (error) throw new Error("알림을 불러오지 못했습니다.");
  return <section><header className="border-b border-border pb-8"><p className="text-xs tracking-widest text-gold">MEMBERSHIP / INBOX</p><h1 className="mt-4 text-3xl font-bold">내 알림</h1><p className="mt-4 text-sm text-ink/60">후속 클래스와 모임의 자리 제안을 확인하세요. 앱 알림과 이메일 발송 상태는 별개입니다.</p></header>
    {!data?.length ? <p className="py-12 text-sm text-ink/60">새 알림이 없습니다.</p> : <ul className="divide-y divide-border">{data.map(n => <li key={n.id} className="grid gap-5 py-6 sm:grid-cols-3">
      <div className="sm:col-span-2"><p className="text-xs text-ink/50">{formatSessionDate(n.created_at)} / {n.read_at ? "읽음" : "읽지 않음"}</p><h2 className="mt-3 text-lg font-semibold">{n.title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{n.body}</p>
        {n.expires_at && <p className="mt-3 text-sm text-ink/50">알림 유효 시각: {formatSessionDate(n.expires_at)}. 모임 페이지에서 최신 신청 상태를 확인해 주세요.</p>}
        <Link href={n.path} className="mt-3 inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">내용 확인</Link>
      </div>
      {!n.read_at && <div className="self-center"><ActionForm action={markNotification} label="읽음으로 표시"><input type="hidden" name="id" value={n.id} /></ActionForm></div>}
    </li>)}</ul>}
    <nav aria-label="알림 페이지" className="mt-6 flex gap-6 text-sm text-gold">{page > 1 && <Link href={"/notifications?page=" + (page - 1)} className="py-3 underline">이전</Link>}{page * 50 < (count ?? 0) && <Link href={"/notifications?page=" + (page + 1)} className="py-3 underline">다음</Link>}</nav>
  </section>;
}
