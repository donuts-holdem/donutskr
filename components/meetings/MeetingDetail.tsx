import Link from "next/link";
import { getMeetingBoard } from "@/lib/meetings/server";
import { applicationLabels } from "@/lib/meetings/types";
import { formatSessionDate } from "@/lib/classes/format";
import { applyMeeting, closeMeeting, respondMeeting } from "@/app/meetings/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { MeetingEditor } from "@/components/meetings/MeetingEditor";
import { Area, Check, Pick } from "@/components/domains/Fields";

export async function MeetingDetail({ id }: { id: string }) {
  const { board, isAdmin } = await getMeetingBoard(id);
  const m = board.meeting, a = board.application;
  const active = a && ["CONFIRMED", "WAITLIST", "OFFERED"].includes(a.status);
  return <div className="space-y-10">
    <header className="border-b border-border pb-8"><Link href="/meetings" className="inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">클럽 모임</Link>
      <p className="mt-5 text-xs tracking-widest text-ink/60">{board.club_name}</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{m.title}</h1>
      <p className="mt-5 text-sm leading-relaxed text-ink/70">{formatSessionDate(m.scheduled_at)}<br />{m.place}</p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{m.description}</p>
      <p className="mt-5 text-sm text-gold">확정 {board.confirmed}명 / 자리 제안 {board.reserved}명 / 대기 {board.waiting}명{m.capacity ? " / 정원 " + m.capacity + "명" : " / 정원 제한 없음"}</p>
    </header>
    <section className="max-w-2xl space-y-5" aria-labelledby="meeting-application-heading">
      <h2 id="meeting-application-heading" className="text-xl font-semibold">내 신청</h2>
      {a && <div className="border-l-2 border-gold py-2 pl-5"><p className="font-semibold">{applicationLabels[a.status]}</p>
        {a.status === "OFFERED" && a.offer_expires_at && <p className="mt-2 text-sm leading-relaxed text-ink/70">{formatSessionDate(a.offer_expires_at)}까지 직접 확정해 주세요. 시간이 지나면 다음 대기자에게 자리를 제안합니다.</p>}
      </div>}
      {m.status !== "OPEN" ? <p className="text-sm text-ink/60">{m.status === "COMPLETED" ? "완료된" : "취소된"} 모임입니다. 신청 기록은 읽기 전용으로 보존됩니다.</p> : <>
        {a?.status === "OFFERED" && <div className="grid gap-4 sm:grid-cols-2">{[{ action: "CONFIRM", label: "제안받은 자리 참여 확정" }, { action: "DECLINE", label: "자리 제안 거절" }].map(item => <ActionForm key={item.action} action={respondMeeting} label={item.label}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="action" value={item.action} /></ActionForm>)}</div>}
        {active && <ActionForm action={respondMeeting} label="내 신청 취소"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="action" value="CANCEL" /></ActionForm>}
        {!active && board.eligible && m.signup_open && <ActionForm action={applyMeeting} label={a ? "새로 신청하기 · 대기 시 맨 뒤에 등록" : "모임 신청 · 만석이면 대기 등록"}><input type="hidden" name="id" value={m.id} /></ActionForm>}
        {!board.eligible && <p className="text-sm leading-relaxed text-ink/70">주최 클럽의 소속 승인과 정회원 자격이 필요합니다. 운영 권한만으로는 참여 명단에 포함되지 않습니다. <Link href={"/club/" + m.club_id} className="text-gold underline focus-visible:outline-2 focus-visible:outline-gold">주최 클럽 보기</Link></p>}
        {!m.signup_open && !active && <p className="text-sm text-ink/60">새 신청을 받지 않고 있습니다.</p>}
      </>}
    </section>
    {board.can_manage && <section className="space-y-8 border-t border-border pt-8">
      <h2 className="text-xl font-semibold">운영 기록과 참가자</h2>
      {!board.people.length ? <p className="text-sm text-ink/60">아직 신청자가 없습니다.</p> : <ul className="divide-y divide-border">{board.people.map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><p>{person.name} <span className="text-sm text-ink/50">(회원 번호 {person.user_id.slice(0, 8)})</span></p><p className="text-sm text-ink/70">{applicationLabels[person.status]}</p></li>)}</ul>}
      {m.status === "OPEN" && <div className="grid items-start gap-10 lg:grid-cols-2"><details className="rounded-card border border-border p-5"><summary className="cursor-pointer py-2 font-semibold focus-visible:outline-2 focus-visible:outline-gold">모임 정보 변경</summary><div className="mt-5"><MeetingEditor clubs={[]} meeting={m} isAdmin={isAdmin} /></div></details>
        <section className="rounded-card border border-border p-5"><h3 className="mb-5 font-semibold">모임 마감</h3><ActionForm action={closeMeeting} label="모임 마감 처리">
          <input type="hidden" name="id" value={m.id} /><input type="hidden" name="revision" value={m.revision} />
          <Pick name="status" label="마감 방식" defaultValue="COMPLETED" options={[{ value: "COMPLETED", label: "완료" }, { value: "CANCELLED", label: "취소" }]} />
          <Area name="reason" label="마감 사유" maxLength={500} /><Check name="confirm" required>신청을 마감하고 과거 기록으로 보존함을 확인했습니다.</Check>
        </ActionForm></section>
      </div>}
    </section>}
  </div>;
}
