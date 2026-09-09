import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { allRows } from "@/lib/membership/operations";
import { requireUuid } from "@/lib/membership/validation";
import { difficultyLabels, type LearningVersion } from "@/lib/learning/types";
import { QuestionComposer } from "@/components/learning/QuestionComposer";
import { ActionForm } from "@/components/membership/ActionForm";
import { Area, Check, Field, Pick } from "@/components/domains/Fields";
import { reviewQuestion, scheduleLearning, protectLearningDay } from "@/app/learning/actions";
import { formatSessionDate } from "@/lib/classes/format";

interface Review { version_id: string; notes: string; checks: Record<string, boolean>; decision: string }
interface DailySet { day: string; version_ids: string[] }
export default async function LearningAdminPage({ searchParams }: { searchParams: Promise<{ version?: string }> }) {
  const client = await requireAdmin(), params = await searchParams;
  const versions = await allRows<LearningVersion>((from, to) => client.from("learning_question_versions").select("*").order("created_at", { ascending: false }).order("id").range(from, to), "문항 버전을 불러오지 못했습니다.");
  const reviews = await allRows<Review>((from, to) => client.from("learning_reviews").select("version_id,notes,checks,decision").order("created_at", { ascending: false }).order("id").range(from, to), "검수 기록을 불러오지 못했습니다.");
  const { data: days, error } = await client.from("learning_daily_sets").select("day,version_ids").order("day", { ascending: false }).limit(30).returns<DailySet[]>();
  if (error) throw new Error("출제 기록을 불러오지 못했습니다.");
  const selected = params.version ? versions.find(v => v.id === requireUuid(params.version!)) : undefined;
  const published = versions.filter(v => v.status === "PUBLISHED");
  return <div className="max-w-6xl space-y-12">
    <header><p className="text-xs tracking-widest text-gold">LEARNING / EDITORIAL DESK</p><h1 className="mt-4 text-3xl font-bold">문항 제작·검수·출제</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">도너츠 자체 제작 문항만 등록합니다. 한 관리자가 작성과 검수를 모두 할 수 있지만, 검수 절차·체크리스트·검수자·버전·시각 기록은 생략할 수 없습니다.</p>
    </header>
    <div className="grid items-start gap-10 xl:grid-cols-2">
      <section><h2 className="mb-6 text-xl font-semibold">{selected ? "새 버전 작성 / v" + selected.version + " 기반" : "새 문항 작성"}</h2>
        {selected && <Link href="/admin/learning" className="mb-5 inline-flex min-h-11 items-center text-sm text-gold underline">별도 새 문항으로 작성</Link>}
        <QuestionComposer key={selected?.id ?? "new"} initial={selected} />
      </section>
      <section className="space-y-8"><h2 className="text-xl font-semibold">공통 데일리 5문항</h2>
        {published.length >= 5 ? <ActionForm action={scheduleLearning} label="검수된 5문항을 해당 날짜에 고정">
          <Field name="day" label="학습 날짜 · 서울 기준" type="date" />
          {[1, 2, 3, 4, 5].map(index => <Pick key={index} name={"version_" + index} label={index + "번 문항"} options={published.map(v => ({ value: v.id, label: "[" + difficultyLabels[v.difficulty] + " / v" + v.version + "] " + v.prompt.slice(0, 70) }))} />)}
          <Check name="confirm" required>서로 다른 5개 문항과 난이도 구성을 확인했습니다. 날짜에 고정된 문제와 버전은 변경하지 않습니다.</Check>
        </ActionForm> : <p className="text-sm leading-relaxed text-muted-foreground">검수·게시된 서로 다른 문항 5개를 먼저 준비해 주세요.</p>}
        <div><h3 className="font-semibold">최근 출제 30일</h3><ul className="mt-4 divide-y divide-border">{(days ?? []).map(day => <li key={day.day} className="py-3 text-sm">{day.day} / 5문항 고정</li>)}</ul>{!days?.length && <p className="mt-4 text-sm text-muted-foreground">아직 출제한 날짜가 없습니다.</p>}</div>
        <details className="rounded-card border border-border p-5"><summary className="cursor-pointer py-2 font-semibold focus-visible:outline-2 focus-visible:outline-gold">운영 장애·콘텐츠 누락일 보호</summary><div className="mt-5"><ActionForm action={protectLearningDay} label="연속 학습 기록 보호">
          <Field name="day" label="보호할 날짜" type="date" /><Area name="reason" label="확인한 장애·누락과 처리 사유" maxLength={1000} /><Check name="confirm" required>실제 운영 장애 또는 콘텐츠 누락을 확인했습니다. 완료 횟수와 XP를 추가하지 않습니다.</Check>
        </ActionForm></div></details>
      </section>
    </div>
    <section className="border-t border-border pt-8"><h2 className="text-xl font-semibold">문항 버전과 검수 기록</h2>
      {!versions.length && <p className="mt-5 text-sm text-muted-foreground">등록된 문항이 없습니다. AI 예시나 미검수 문항을 자동으로 채워 넣지 않습니다.</p>}
      <div className="mt-5 divide-y divide-border">{versions.map(v => {
        const review = reviews.find(r => r.version_id === v.id);
        return <details key={v.id} className="py-5"><summary className="cursor-pointer py-2 focus-visible:outline-2 focus-visible:outline-gold"><span className="mr-3 text-xs text-gold">{v.status} / v{v.version} / {difficultyLabels[v.difficulty]}</span><span className="font-semibold">{v.prompt.slice(0, 120)}</span></summary>
          <div className="mt-5 max-w-3xl space-y-5"><p className="whitespace-pre-wrap text-sm leading-relaxed">{v.prompt}</p>
            <ul className="space-y-2 text-sm">{v.choices.map(c => <li key={c.id} className={v.correct_ids.includes(c.id) ? "text-gold" : "text-muted-foreground"}>{v.correct_ids.includes(c.id) ? "정답 / " : ""}{c.text}</li>)}</ul>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{v.explanation}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">작성자 {v.authored_by} / {formatSessionDate(v.created_at)}<br />자체 제작 근거: {v.authorship_note} / AI 보조: {v.ai_assisted ? "사용" : "미사용"}</p>
            {v.gto_evidence && <dl className="space-y-3 text-sm">{Object.entries(v.gto_evidence).map(([key, value]) => <div key={key}><dt className="font-semibold">{key}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{value}</dd></div>)}</dl>}
            {v.status === "DRAFT" ? <ActionForm action={reviewQuestion} label="별도 검수 결과 기록">
              <input type="hidden" name="version_id" value={v.id} /><Pick name="decision" label="검수 결과" defaultValue="PUBLISHED" options={[{ value: "PUBLISHED", label: "검수 완료 · 게시" }, { value: "REJECTED", label: "반려 · 새 버전 작성 필요" }]} />
              <Check name="original">자체 제작·권리 관계를 확인했습니다.</Check><Check name="answer">선택 방식과 정답을 검증했습니다.</Check><Check name="explanation">해설의 정확성과 충분한 조건을 확인했습니다.</Check>
              {v.kind === "GTO" && <Check name="gto">솔버 근거·전체 가정·혼합 액션 빈도를 확인했습니다.</Check>}
              <Area name="notes" label="필수 검수 의견·근거" />
            </ActionForm> : <div className="rounded-card border border-border p-4"><p className="text-sm">검수자 {v.reviewed_by} / {v.reviewed_at && formatSessionDate(v.reviewed_at)}</p><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{review?.notes}</p>{review && <p className="mt-2 text-xs text-muted-foreground">검수 체크: {Object.entries(review.checks).filter(([, checked]) => checked).map(([key]) => key).join(", ")}</p>}</div>}
            <Link href={"/admin/learning?version=" + v.id} className="inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">이 버전을 바탕으로 새 버전 작성</Link>
          </div>
        </details>;
      })}</div>
    </section>
  </div>;
}
