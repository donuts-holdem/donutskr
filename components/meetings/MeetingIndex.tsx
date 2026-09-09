import Link from "next/link";
import { getMeetingIndex } from "@/lib/meetings/server";
import { formatSessionDate } from "@/lib/classes/format";
import { MeetingEditor } from "@/components/meetings/MeetingEditor";

export async function MeetingIndex({ manage = false }: { manage?: boolean }) {
  const data = await getMeetingIndex(manage);
  return <div className="space-y-10">
    <header className="border-b border-border pb-8"><p className="text-xs font-semibold tracking-widest text-gold">CLUB / GATHERINGS</p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{manage ? "클럽 모임 운영" : "테이블에서 만나요"}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/70">클래스 회차와 별개로 열리는 클럽 모임입니다. 기본적으로 주최 클럽 소속만 신청할 수 있고, 게스트 허용 모임은 모든 정회원에게 열려 있습니다.</p>
      {!manage && (data.isAdmin || data.clubs.length > 0) && <Link href={data.isAdmin ? "/admin/meetings" : "/leader/meetings"} className="mt-4 inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">내가 운영하는 모임</Link>}
    </header>
    {!data.meetings.length ? <p className="py-8 text-sm text-ink/60">등록된 모임이 없습니다.</p> :
      <ul className="divide-y divide-border">{data.meetings.map(m => <li key={m.id}>
        <Link href={"/meetings/" + m.id} className="group grid gap-3 py-6 focus-visible:outline-2 focus-visible:outline-gold sm:grid-cols-3">
          <p className="text-sm text-ink/60">{formatSessionDate(m.scheduled_at)}</p>
          <div className="sm:col-span-2"><div className="flex flex-wrap items-center gap-3">{m.hot && <span className="text-xs font-semibold tracking-widest text-gold">HOT</span>}<h2 className="text-xl font-semibold group-hover:text-gold">{m.title}</h2></div>
            <p className="mt-2 text-sm text-ink/70">{m.place} / {m.guest_allowed ? "모든 정회원" : "주최 클럽 소속"} / {m.capacity ? m.capacity + "명" : "정원 제한 없음"}</p>
            <p className="mt-2 text-xs text-ink/50">{m.status === "OPEN" ? m.signup_open ? "신청 가능 · 만석 시 대기" : "새 신청 마감" : m.status === "COMPLETED" ? "완료 · 기록 보존" : "취소 · 기록 보존"}</p>
          </div>
        </Link>
      </li>)}</ul>}
    {manage && (data.isAdmin || data.clubs.length > 0) && <section className="max-w-2xl border-t border-border pt-8"><h2 className="mb-6 text-xl font-semibold">새 모임</h2>
      {data.clubs.length ? <MeetingEditor clubs={data.clubs} isAdmin={data.isAdmin} /> : <p className="text-sm text-ink/60">운영 중인 클럽을 먼저 등록해 주세요.</p>}
    </section>}
  </div>;
}
