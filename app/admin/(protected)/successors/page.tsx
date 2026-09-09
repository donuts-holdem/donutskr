import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { allRows } from "@/lib/membership/operations";
import { requireUuid } from "@/lib/membership/validation";
import { domainRpc } from "@/lib/domains/server";
import { createSuccessor, executeSuccessor } from "@/app/successors/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { Area, Check, Pick } from "@/components/domains/Fields";
import type { ClassRecord } from "@/lib/classes/types";
import { formatSessionDate } from "@/lib/classes/format";

interface Preview { id: string; mode: "INVITE" | "AUTO_ENROLL"; successor_id: string; fingerprint: string; excluded_count: number; members: { id: string; name: string; username: string }[] }
interface Succession { id: string; predecessor_id: string; successor_id: string; mode: string; executed_at: string | null; execution_snapshot: Preview | null }

export default async function SuccessorsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const client = await requireAdmin(), params = await searchParams;
  const classes = await allRows<ClassRecord>((from, to) => client.from("classes").select("*").order("name").order("id").range(from, to), "클래스 목록을 불러오지 못했습니다.");
  const plans = await allRows<Succession>((from, to) => client.from("class_successions").select("*").order("created_at", { ascending: false }).order("id").range(from, to), "후속 클래스 기록을 불러오지 못했습니다.");
  const selected = params.id ? plans.find(p => p.id === requireUuid(params.id!)) : null;
  const preview = selected ? selected.execution_snapshot ?? await domainRpc<Preview>(client, "preview_class_succession", { p_id: selected.id }) : null;
  const previous = classes.filter(c => c.closed_at), next = classes.filter(c => c.active && !c.closed_at && !c.archived_at && !c.first_started_at && !plans.some(p => p.successor_id === c.id));
  const name = (id: string) => classes.find(c => c.id === id)?.name ?? "클래스";
  return <div className="max-w-5xl space-y-10">
    <header><p className="text-xs font-semibold tracking-widest text-gold">CLASS / CONTINUITY</p><h1 className="mt-3 text-3xl font-bold">후속 클래스</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">이전 클래스 종료 당시의 승인 소속을 기준으로 합니다. 실행 직전 정지·탈퇴·소속 해제된 회원과 이미 후속 클래스에 소속된 회원은 제외합니다. 출석 횟수는 조건이 아닙니다.</p>
      <Link href="/admin/classes" className="mt-4 inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">후속으로 사용할 새 클래스 만들기</Link>
    </header>
    <div className="grid items-start gap-10 lg:grid-cols-2">
      <section className="rounded-card border border-border p-5"><h2 className="mb-6 text-xl font-semibold">클래스 연결</h2>
        {previous.length && next.length ? <ActionForm action={createSuccessor} label="연결하고 대상자 미리보기">
          <Pick name="predecessor_id" label="종료된 이전 클래스" options={previous.map(c => ({ value: c.id, label: c.name }))} />
          <Pick name="successor_id" label="아직 시작하지 않은 후속 클래스" options={next.map(c => ({ value: c.id, label: c.name }))} />
          <Pick name="mode" label="회원 연결 방식" defaultValue="INVITE" options={[{ value: "INVITE", label: "등록 안내만 알림 · 기본" }, { value: "AUTO_ENROLL", label: "관리자 승인으로 자동 소속 + 알림" }]} />
          <p className="text-sm text-muted-foreground">연결만으로는 소속 변경이나 알림이 발생하지 않습니다. 다음 미리보기에서 확인 후 실행합니다.</p>
        </ActionForm> : <p className="text-sm leading-relaxed text-muted-foreground">종료된 이전 클래스와 아직 시작하지 않은 새 클래스가 필요합니다.</p>}
      </section>
      <section><h2 className="mb-5 text-xl font-semibold">연결 내역</h2><ul className="divide-y divide-border">{plans.map(plan => <li key={plan.id} className="py-4">
        <Link href={"/admin/successors?id=" + plan.id} className="block py-2 focus-visible:outline-2 focus-visible:outline-gold"><p className="font-semibold">{name(plan.predecessor_id)} → {name(plan.successor_id)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{plan.mode === "INVITE" ? "등록 안내" : "자동 소속"} / {plan.executed_at ? formatSessionDate(plan.executed_at) + " 실행 완료" : "미리보기 후 실행 대기"}</p></Link>
      </li>)}</ul>{!plans.length && <p className="text-sm text-muted-foreground">아직 연결된 후속 클래스가 없습니다.</p>}</section>
    </div>
    {preview && selected && <section className="border-t border-border pt-8"><h2 className="text-xl font-semibold">{name(selected.successor_id)} / {selected.executed_at ? "실행 당시 대상자" : "대상자 미리보기"}</h2>
      <p className="mt-4 text-sm text-muted-foreground">대상 {preview.members.length}명 / 제외 {preview.excluded_count}명 / {preview.mode === "AUTO_ENROLL" ? "자동 소속 및 알림" : "등록 안내 알림만 발행"}</p>
      <ul className="my-6 divide-y divide-border">{preview.members.map(member => <li key={member.id} className="py-3 text-sm">{member.name} <span className="text-muted-foreground">({member.username})</span></li>)}</ul>
      {!selected.executed_at && <div className="max-w-2xl"><ActionForm action={executeSuccessor} label={preview.mode === "AUTO_ENROLL" ? "확인한 회원을 후속 클래스에 소속시키기" : "확인한 회원에게 등록 안내 보내기"}>
        <input type="hidden" name="id" value={selected.id} /><input type="hidden" name="fingerprint" value={preview.fingerprint} />
        <Area name="reason" label="실행 사유" maxLength={500} /><Check name="confirm" required>대상자·연결 방식을 확인했습니다. 이미 실행된 소속과 알림은 이전 클래스 복구로 자동 취소되지 않습니다.</Check>
      </ActionForm></div>}
    </section>}
  </div>;
}
