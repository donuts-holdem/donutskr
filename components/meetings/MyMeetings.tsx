"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { getMyMeetingHistory, type MeetingHistory } from "@/app/meetings/history";
import { applicationLabels } from "@/lib/meetings/types";
import { formatSessionDate } from "@/lib/classes/format";

export function MyMeetings({ initial }: { initial: MeetingHistory }) {
  const [history, setHistory] = useState(initial), [past, setPast] = useState(false);
  const [error, setError] = useState<string | undefined>(initial.error), [pending, startTransition] = useTransition();
  const request = useRef(0);
  function load(includePast: boolean, page: number) {
    setPast(includePast);
    const current = ++request.current;
    startTransition(async () => {
      try {
        const next = await getMyMeetingHistory(includePast, page);
        if (current !== request.current) return;
        setError(next.error);
        if (!next.error) setHistory(next);
      } catch {
        if (current === request.current) setError("모임 내역을 불러오지 못했습니다. 다시 시도해 주세요.");
      }
    });
  }
  return <section className="mt-12 border-t border-border pt-8" aria-labelledby="my-meetings-heading" aria-busy={pending}>
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 id="my-meetings-heading" className="text-xl font-semibold">내 클럽 모임</h2>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={past} onChange={e => load(e.target.checked, 1)} className="size-4 accent-gold focus-visible:outline-2 focus-visible:outline-gold" />지난 모임 보기</label>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-coral-300">{error}</p>}
    {pending && <p role="status" className="mt-4 text-sm text-ink/60">모임 내역을 불러오는 중입니다.</p>}
    {!history.items.length ? <p className="mt-5 text-sm text-ink/60">{history.past ? "신청한 모임 내역이 없습니다." : "현재 참여하거나 대기 중인 모임이 없습니다."}</p> :
      <ul className="mt-5 divide-y divide-border">{history.items.map(item => <li key={item.id} className="py-5"><Link href={"/meetings/" + item.meeting_id} className="block py-1 focus-visible:outline-2 focus-visible:outline-gold">
        <p className="text-xs text-ink/50">{formatSessionDate(item.meeting.scheduled_at)}</p><h3 className="mt-2 font-semibold">{item.meeting.title}</h3>
        <p className="mt-2 text-sm text-gold">{applicationLabels[item.status]}{item.meeting.status !== "OPEN" ? " / 지난 모임 · 읽기 전용" : ""}</p>
      </Link></li>)}</ul>}
    {history.count > 50 && <div className="mt-5 flex items-center gap-5 text-sm"><button disabled={pending || history.page === 1} onClick={() => load(past, history.page - 1)} className="min-h-11 text-gold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-gold">이전</button><span>{history.page} / {Math.ceil(history.count / 50)}</span><button disabled={pending || history.page * 50 >= history.count} onClick={() => load(past, history.page + 1)} className="min-h-11 text-gold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-gold">다음</button></div>}
    <Link href="/meetings" className="mt-5 inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">클럽 모임 찾아보기</Link>
  </section>;
}
