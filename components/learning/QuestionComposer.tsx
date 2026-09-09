"use client";

import { useState } from "react";
import { saveQuestion } from "@/app/learning/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { Area, Check, Field, Pick } from "@/components/domains/Fields";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseChoiceLines } from "@/lib/domains/validation";
import type { AnswerMode, LearningVersion } from "@/lib/learning/types";

export function QuestionComposer({ initial }: { initial?: LearningVersion }) {
  const [lines, setLines] = useState(initial?.choices.map(c => c.text).join("\n") ?? "");
  const [mode, setMode] = useState<AnswerMode>(initial?.answer_mode ?? "SINGLE");
  const [kind, setKind] = useState(initial?.kind ?? "GENERAL");
  const [correct, setCorrect] = useState<string[]>(initial?.correct_ids ?? []);
  const choices = parseChoiceLines(lines);
  return <ActionForm action={saveQuestion} label={initial ? "수정 내용을 새 초안 버전으로 등록" : "자체 제작 문항 초안 등록"}>
    {initial && <input type="hidden" name="question_id" value={initial.question_id} />}
    <p className="text-sm leading-relaxed text-muted-foreground">등록과 검수는 별도 단계입니다. 게시된 버전을 수정하지 않고 새 버전을 만듭니다. AI는 제작 보조 도구일 뿐, 자동 등록·검수·정답 결정에 사용하지 않습니다.</p>
    <Area name="prompt" label="문제 · 필요한 모든 상황과 조건" defaultValue={initial?.prompt} maxLength={10000} />
    <Pick name="difficulty" label="문항 난이도 · 활동 레벨과 별개" defaultValue={initial?.difficulty ?? "BEGINNER"} options={[{ value: "BEGINNER", label: "입문" }, { value: "INTERMEDIATE", label: "중급" }, { value: "ADVANCED", label: "고급" }]} />
    <div className="space-y-2"><Label htmlFor="question-kind">문항 유형</Label><Select name="kind" value={kind} onValueChange={v => setKind(v as "GENERAL" | "GTO")}><SelectTrigger id="question-kind" className="min-h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GENERAL">포커 기본·전략</SelectItem><SelectItem value="GTO">검증된 솔버 근거의 GTO</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label htmlFor="answer-mode">정답 선택 방식</Label><Select name="answer_mode" value={mode} onValueChange={v => { setMode(v as AnswerMode); setCorrect([]); }}><SelectTrigger id="answer-mode" className="min-h-11 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SINGLE">단일 정답 · 하나 선택</SelectItem><SelectItem value="MULTIPLE">복수 정답 · 모두 선택</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label htmlFor="choice-lines">선택지 · 한 줄에 하나</Label><Textarea id="choice-lines" value={lines} onChange={e => { setLines(e.target.value); setCorrect([]); }} required rows={5} maxLength={30000} /><p className="text-xs text-muted-foreground">선택지를 변경하면 정답을 다시 지정해야 합니다.</p></div>
    <input type="hidden" name="choices" value={JSON.stringify(choices)} />
    <fieldset className="space-y-3"><legend className="mb-3 text-sm font-semibold">{mode === "SINGLE" ? "정답 1개를 지정하세요" : "정답을 2개 이상 지정하세요"}</legend>
      {mode === "SINGLE" ? <Select name="correct_ids" value={correct[0] ?? ""} onValueChange={v => setCorrect([v])} required><SelectTrigger aria-label="단일 정답" className="min-h-11 w-full"><SelectValue placeholder="정답 선택" /></SelectTrigger><SelectContent>{choices.map(c => <SelectItem key={c.id} value={c.id}>{c.text}</SelectItem>)}</SelectContent></Select> :
        choices.map(c => <Label key={c.id} className="flex min-h-11 items-center gap-3"><Checkbox name="correct_ids" value={c.id} checked={correct.includes(c.id)} onCheckedChange={checked => setCorrect(values => checked ? [...values.filter(id => id !== c.id), c.id] : values.filter(id => id !== c.id))} />{c.text}</Label>)}
    </fieldset>
    <Area name="explanation" label="정답 근거와 해설" defaultValue={initial?.explanation} maxLength={12000} />
    {kind === "GTO" && <fieldset className="space-y-5 border-l-2 border-gold pl-5"><legend className="mb-4 text-sm font-semibold">GTO 검증 자료 · 필수</legend>
      <Field name="solver" label="솔버 이름과 버전" defaultValue={initial?.gto_evidence?.solver} />
      <Area name="assumptions" label="전체 가정 · 게임 형식, 인원, 스택, 포지션, 보드, 액션, 레이크·ICM 등" defaultValue={initial?.gto_evidence?.assumptions} />
      <Area name="evidence" label="검증 결과 파일·출처·재현 정보" defaultValue={initial?.gto_evidence?.evidence} />
      <Area name="frequencies" label="액션별 솔버 빈도와 정답 선정 근거" defaultValue={initial?.gto_evidence?.frequencies} />
      <p className="text-sm text-muted-foreground">혼합 전략의 유효 액션을 낮은 빈도라는 이유로 오답 처리하지 마세요. 여러 액션이 정답이면 복수 정답 문항으로 작성하세요.</p>
    </fieldset>}
    <Area name="authorship_note" label="자체 제작 근거·작성 메모" defaultValue={initial?.authorship_note} />
    <Check name="ai_assisted" defaultChecked={initial?.ai_assisted}>AI를 초안·표현 정리 등 보조 도구로 사용했습니다.</Check>
    <Check name="authorship_confirmed" required>도너츠 자체 제작 문항이며 외부 완성 문항을 무단 등록하지 않았습니다.</Check>
  </ActionForm>;
}
