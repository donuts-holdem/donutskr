# Admin Phase 1 — 데이터 유실 방지 + 안전장치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 손으로 쓰던 raw-JSON textarea를 구조화 반복 행 에디터로 교체하고, 잘못된 입력이 조용히 콘텐츠를 삭제하던 경로를 제거하며, 어드민 에러 바운더리·삭제 확인·고아 탭 숨김으로 안전장치를 건다.

**Architecture:** 클라이언트 반복 행 에디터(`useRepeatableRows` 훅 + 제네릭 `RepeatableFieldEditor`)가 행을 `useState`로 관리하고 hidden input에 `JSON.stringify`로 직렬화한다(기존 `BlindStructureEditor` 패턴 재사용). 서버 액션은 그 문자열을 **엄격히** 파싱하는 순수 헬퍼(`lib/admin/structured-fields.ts`)로 받아 파싱 실패 시 던지고(=조용한 fallback 제거), 파싱된 값을 저장 형태로 관용적 보정한다. 던져진 에러는 `app/admin/error.tsx`가 한국어로 표시한다.

**Tech Stack:** Next.js App Router (server actions), React client components, shadcn/ui (Button/Input/Label + 신규 AlertDialog), Tailwind v4 토큰, Vitest + @testing-library/react (jsdom, DB 미접근).

## Global Constraints

- 디자인 토큰만 사용. 색/간격/타이포/radius/z-index 하드코딩 금지(`bg-card`, `text-muted-foreground`, `border-border`, `text-gold` 등). 어드민은 `components/ui/*` shadcn 프리미티브 사용, input/button 직접 제작 금지.
- import 별칭은 `@/`만.
- 키보드 단축키는 `KeyboardEvent.code` 사용(`event.key` 금지 — 한글 IME).
- 다이얼로그/메뉴/팝오버는 포털로 렌더(shadcn AlertDialog가 기본 포털).
- 기본은 Server Component. `"use client"`는 필요한 곳만.
- jsonb 컬럼 형태 **변경 없음**(Phase 1은 스키마 무변경). 저장 형태는 `lib/types.ts`의 기존 타입과 동일해야 함:
  - `SpecialPage.gallery: string[]`, `info_cards: { label: string; value: string }[]`, `note_list: string[]`
  - `OnlineLeague.steps: string[]`, `links: Record<string, string>`, `today_leagues: { name: string; time?: string; reg_close?: string; link?: string }[]`
  - `SiteConfig.footer_sponsors: { name: string; logo?: string; url?: string }[]`
- 테스트 명령: `npm test`(= `vitest run --passWithNoTests`). 특정 파일: `npx vitest run <path>`.
- 커밋 메시지는 기존 컨벤션(`feat(admin): …`, `refactor(admin): …`, `fix(admin): …`).

---

## File Structure

**생성:**
- `lib/admin/useRepeatableRows.ts` — 반복 행 상태 훅(추가/삭제/정렬/업데이트). 저수준 공통 로직.
- `components/admin/RepeatableFieldEditor.tsx` — 훅 위에 구축한 제네릭 동종 행 에디터(hidden input 직렬화 + 행별 renderRow).
- `lib/admin/structured-fields.ts` — 순수 (역)직렬화/보정 헬퍼. 서버 액션에서 사용. 파싱 실패는 던짐.
- `app/admin/error.tsx` — 어드민 한국어 에러 바운더리(클라이언트 컴포넌트).
- `components/ui/alert-dialog.tsx` — shadcn AlertDialog(설치로 생성).
- 테스트: `test/use-repeatable-rows.test.tsx`, `test/repeatable-field-editor.test.tsx`, `test/structured-fields.test.ts`, `test/special-page-form.test.tsx`, `test/admin-error.test.tsx`, `test/delete-button.test.tsx`.

**수정:**
- `components/admin/SpecialPageForm.tsx` — gallery/info_cards/note_list 텍스트박스 → 에디터.
- `app/admin/actions/specialPages.ts` — `parseJson` 제거, 엄격 파싱+보정.
- `app/admin/(protected)/online-league/page.tsx` — steps/links/today_leagues 텍스트박스 → 에디터.
- `app/admin/actions/onlineLeague.ts` — `parseJson` 제거, 엄격 파싱+보정.
- `app/admin/(protected)/settings/page.tsx` — footer_sponsors 텍스트박스 → 에디터.
- `app/admin/actions/siteConfig.ts` — `parseJson` 제거, 엄격 파싱+보정.
- `components/admin/DeleteButton.tsx` — AlertDialog 확인 추가.
- `app/admin/(protected)/special-pages/page.tsx` — DeleteButton에 `itemName` 전달(예시).
- `app/admin/(protected)/layout.tsx` — 사이드바에서 "탭" 링크 제거.

---

## Task 1: `useRepeatableRows` 훅

**Files:**
- Create: `lib/admin/useRepeatableRows.ts`
- Test: `test/use-repeatable-rows.test.tsx`

**Interfaces:**
- Produces:
  - `interface Keyed<T> { key: string; value: T }`
  - `interface RepeatableRows<T> { rows: Keyed<T>[]; values: T[]; add: () => void; remove: (key: string) => void; update: (key: string, value: T) => void; moveUp: (index: number) => void; moveDown: (index: number) => void }`
  - `function useRepeatableRows<T>(initial: T[], makeEmpty: () => T): RepeatableRows<T>`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// test/use-repeatable-rows.test.tsx
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useRepeatableRows } from "@/lib/admin/useRepeatableRows";

describe("useRepeatableRows", () => {
  it("seeds rows from initial values", () => {
    const { result } = renderHook(() => useRepeatableRows<string>(["a", "b"], () => ""));
    expect(result.current.values).toEqual(["a", "b"]);
    expect(result.current.rows.map((r) => r.key)).toHaveLength(2);
  });

  it("adds, updates, removes and reorders rows", () => {
    const { result } = renderHook(() => useRepeatableRows<string>(["a"], () => ""));
    act(() => result.current.add());
    expect(result.current.values).toEqual(["a", ""]);

    const secondKey = result.current.rows[1].key;
    act(() => result.current.update(secondKey, "b"));
    expect(result.current.values).toEqual(["a", "b"]);

    act(() => result.current.moveUp(1));
    expect(result.current.values).toEqual(["b", "a"]);

    act(() => result.current.moveDown(0));
    expect(result.current.values).toEqual(["a", "b"]);

    const firstKey = result.current.rows[0].key;
    act(() => result.current.remove(firstKey));
    expect(result.current.values).toEqual(["b"]);
  });

  it("assigns stable unique keys across rows", () => {
    const { result } = renderHook(() => useRepeatableRows<string>([], () => ""));
    act(() => result.current.add());
    act(() => result.current.add());
    const keys = result.current.rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/use-repeatable-rows.test.tsx`
Expected: FAIL — `Cannot find module '@/lib/admin/useRepeatableRows'`

- [ ] **Step 3: 최소 구현 작성**

```ts
// lib/admin/useRepeatableRows.ts
import { useState } from "react";

// Monotonic counter for row keys. Module-level (client only) avoids
// Date.now()/Math.random() in keys and guarantees uniqueness across instances.
let seq = 0;
function newKey(): string {
  seq += 1;
  return `rfe-${seq}`;
}

export interface Keyed<T> {
  key: string;
  value: T;
}

export interface RepeatableRows<T> {
  rows: Keyed<T>[];
  values: T[];
  add: () => void;
  remove: (key: string) => void;
  update: (key: string, value: T) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
}

export function useRepeatableRows<T>(initial: T[], makeEmpty: () => T): RepeatableRows<T> {
  const [rows, setRows] = useState<Keyed<T>[]>(() => initial.map((value) => ({ key: newKey(), value })));
  return {
    rows,
    values: rows.map((r) => r.value),
    add: () => setRows((rs) => [...rs, { key: newKey(), value: makeEmpty() }]),
    remove: (key) => setRows((rs) => rs.filter((r) => r.key !== key)),
    update: (key, value) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, value } : r))),
    moveUp: (index) =>
      setRows((rs) => {
        if (index <= 0) return rs;
        const a = [...rs];
        [a[index - 1], a[index]] = [a[index], a[index - 1]];
        return a;
      }),
    moveDown: (index) =>
      setRows((rs) => {
        if (index >= rs.length - 1) return rs;
        const a = [...rs];
        [a[index], a[index + 1]] = [a[index + 1], a[index]];
        return a;
      }),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/use-repeatable-rows.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/admin/useRepeatableRows.ts test/use-repeatable-rows.test.tsx
git commit -m "feat(admin): add useRepeatableRows hook for repeatable field editors"
```

---

## Task 2: `RepeatableFieldEditor` 컴포넌트

**Files:**
- Create: `components/admin/RepeatableFieldEditor.tsx`
- Test: `test/repeatable-field-editor.test.tsx`

**Interfaces:**
- Consumes: `useRepeatableRows` (Task 1).
- Produces:
  - `interface RepeatableFieldEditorProps<T> { name: string; initial: T[]; makeEmpty: () => T; addLabel: string; emptyHint?: string; serialize?: (values: T[]) => string; renderRow: (value: T, onChange: (next: T) => void) => import("react").ReactNode }`
  - `function RepeatableFieldEditor<T>(props: RepeatableFieldEditorProps<T>): JSX.Element` — `name`의 hidden input에 `serialize(values)`(기본 `JSON.stringify`)를 넣어 폼 제출 시 전송.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// test/repeatable-field-editor.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
import { Input } from "@/components/ui/input";

function StringEditor({ initial }: { initial: string[] }) {
  return (
    <RepeatableFieldEditor<string>
      name="note_list"
      initial={initial}
      makeEmpty={() => ""}
      addLabel="항목 추가"
      renderRow={(value, onChange) => (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="안내 문구" />
      )}
    />
  );
}

describe("RepeatableFieldEditor", () => {
  it("serializes initial values into the hidden input", () => {
    const { container } = render(<StringEditor initial={["첫 줄", "둘째 줄"]} />);
    const hidden = container.querySelector('input[name="note_list"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual(["첫 줄", "둘째 줄"]);
  });

  it("adds a row and reflects edits in the hidden input", () => {
    const { container } = render(<StringEditor initial={[]} />);
    fireEvent.click(screen.getByText("항목 추가"));
    const input = screen.getByPlaceholderText("안내 문구");
    fireEvent.change(input, { target: { value: "새 항목" } });
    const hidden = container.querySelector('input[name="note_list"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual(["새 항목"]);
  });

  it("removes a row", () => {
    const { container } = render(<StringEditor initial={["지울 항목"]} />);
    fireEvent.click(screen.getByLabelText("행 삭제"));
    const hidden = container.querySelector('input[name="note_list"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/repeatable-field-editor.test.tsx`
Expected: FAIL — `Cannot find module '@/components/admin/RepeatableFieldEditor'`

- [ ] **Step 3: 최소 구현 작성**

```tsx
// components/admin/RepeatableFieldEditor.tsx
"use client";
import type { ReactNode } from "react";
import { useRepeatableRows } from "@/lib/admin/useRepeatableRows";
import { Button } from "@/components/ui/button";

interface RepeatableFieldEditorProps<T> {
  name: string;
  initial: T[];
  makeEmpty: () => T;
  addLabel: string;
  emptyHint?: string;
  serialize?: (values: T[]) => string;
  renderRow: (value: T, onChange: (next: T) => void) => ReactNode;
}

export function RepeatableFieldEditor<T>({
  name,
  initial,
  makeEmpty,
  addLabel,
  emptyHint,
  serialize = (values) => JSON.stringify(values),
  renderRow,
}: RepeatableFieldEditorProps<T>) {
  const { rows, values, add, remove, update, moveUp, moveDown } = useRepeatableRows<T>(initial, makeEmpty);
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialize(values)} />
      {rows.length === 0 && emptyHint && <p className="text-muted-foreground text-xs">{emptyHint}</p>}
      {rows.map((row, idx) => (
        <div
          key={row.key}
          className="border-border bg-card/60 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {renderRow(row.value, (next) => update(row.key, next))}
          </div>
          <div className="ml-auto flex gap-1">
            <Button type="button" variant="outline" size="icon" onClick={() => moveUp(idx)} aria-label="위로 이동">
              ↑
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => moveDown(idx)} aria-label="아래로 이동">
              ↓
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => remove(row.key)} aria-label="행 삭제">
              삭제
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/repeatable-field-editor.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add components/admin/RepeatableFieldEditor.tsx test/repeatable-field-editor.test.tsx
git commit -m "feat(admin): add generic RepeatableFieldEditor component"
```

---

## Task 3: 순수 (역)직렬화 헬퍼 `structured-fields.ts`

**Files:**
- Create: `lib/admin/structured-fields.ts`
- Test: `test/structured-fields.test.ts`

**Interfaces:**
- Produces:
  - `class StructuredFieldError extends Error {}`
  - `function parseJsonField(raw: FormDataEntryValue | null, field: string): unknown` — 빈 문자열은 `null`, 그 외는 `JSON.parse`. 파싱 실패 시 `StructuredFieldError`를 던짐(조용한 fallback 없음).
  - `function coerceStringList(value: unknown): string[]`
  - `function coerceLabelValueList(value: unknown): { label: string; value: string }[]`
  - `function coerceStringRecord(value: unknown): Record<string, string>`
  - `function coerceTodayLeagues(value: unknown): { name: string; time?: string; reg_close?: string; link?: string }[]`
  - `function coerceSponsors(value: unknown): { name: string; logo?: string; url?: string }[]`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// test/structured-fields.test.ts
import { describe, it, expect } from "vitest";
import {
  StructuredFieldError,
  parseJsonField,
  coerceStringList,
  coerceLabelValueList,
  coerceStringRecord,
  coerceTodayLeagues,
  coerceSponsors,
} from "@/lib/admin/structured-fields";

describe("parseJsonField", () => {
  it("returns null for empty/whitespace", () => {
    expect(parseJsonField("", "x")).toBeNull();
    expect(parseJsonField("   ", "x")).toBeNull();
    expect(parseJsonField(null, "x")).toBeNull();
  });
  it("parses valid JSON", () => {
    expect(parseJsonField('["a","b"]', "x")).toEqual(["a", "b"]);
  });
  it("throws StructuredFieldError on malformed JSON (no silent fallback)", () => {
    expect(() => parseJsonField("[oops", "갤러리")).toThrow(StructuredFieldError);
    expect(() => parseJsonField("[oops", "갤러리")).toThrow(/갤러리/);
  });
});

describe("coerceStringList", () => {
  it("keeps non-empty strings, drops empties, coerces non-strings", () => {
    expect(coerceStringList(["a", "", "  ", 3, null])).toEqual(["a", "3"]);
  });
  it("returns [] for non-array", () => {
    expect(coerceStringList(null)).toEqual([]);
    expect(coerceStringList({})).toEqual([]);
  });
});

describe("coerceLabelValueList", () => {
  it("round-trips full shapes", () => {
    const input = [{ label: "날짜", value: "6/9" }];
    expect(coerceLabelValueList(input)).toEqual(input);
  });
  it("tolerates partial shapes without dropping the row", () => {
    expect(coerceLabelValueList([{ label: "날짜" }])).toEqual([{ label: "날짜", value: "" }]);
  });
  it("drops fully-empty rows and non-arrays", () => {
    expect(coerceLabelValueList([{ label: "", value: "" }])).toEqual([]);
    expect(coerceLabelValueList("nope")).toEqual([]);
  });
});

describe("coerceStringRecord", () => {
  it("builds a string map, skips blank keys", () => {
    expect(coerceStringRecord({ 카카오: "url", "": "x", n: 5 })).toEqual({ 카카오: "url", n: "5" });
  });
  it("returns {} for arrays/non-objects", () => {
    expect(coerceStringRecord(["a"])).toEqual({});
    expect(coerceStringRecord(null)).toEqual({});
  });
});

describe("coerceTodayLeagues", () => {
  it("keeps name, includes optional fields only when present", () => {
    expect(coerceTodayLeagues([{ name: "리그A", time: "20:00", link: "" }])).toEqual([
      { name: "리그A", time: "20:00" },
    ]);
  });
  it("drops rows without a name", () => {
    expect(coerceTodayLeagues([{ time: "20:00" }])).toEqual([]);
  });
});

describe("coerceSponsors", () => {
  it("keeps name, includes logo/url only when present", () => {
    expect(coerceSponsors([{ name: "스폰서", logo: "l.png", url: "" }])).toEqual([
      { name: "스폰서", logo: "l.png" },
    ]);
  });
  it("drops nameless rows and non-arrays", () => {
    expect(coerceSponsors([{ logo: "x" }])).toEqual([]);
    expect(coerceSponsors(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/structured-fields.test.ts`
Expected: FAIL — `Cannot find module '@/lib/admin/structured-fields'`

- [ ] **Step 3: 최소 구현 작성**

```ts
// lib/admin/structured-fields.ts
// Pure (de)serialization for admin repeatable-field editors. Editors emit a
// JSON string in a hidden input; parseJsonField parses it STRICTLY (malformed
// JSON throws → caught by app/admin/error.tsx) so a typo can never silently
// wipe a jsonb field, and the coerce* helpers normalize the parsed value into
// the exact stored shape, tolerating partial/legacy element shapes.

export class StructuredFieldError extends Error {}

export function parseJsonField(raw: FormDataEntryValue | null, field: string): unknown {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s === "") return null;
  try {
    return JSON.parse(s);
  } catch {
    throw new StructuredFieldError(`"${field}" 입력을 저장할 수 없습니다 (형식 오류).`);
  }
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}
function asObject(el: unknown): Record<string, unknown> {
  return el && typeof el === "object" ? (el as Record<string, unknown>) : {};
}

export function coerceStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(str).filter((v) => v.trim() !== "");
}

export function coerceLabelValueList(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((el) => {
      const o = asObject(el);
      return { label: str(o.label), value: str(o.value) };
    })
    .filter((c) => c.label.trim() !== "" || c.value.trim() !== "");
}

export function coerceStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.trim() === "") continue;
    out[k] = str(v);
  }
  return out;
}

export function coerceTodayLeagues(
  value: unknown,
): { name: string; time?: string; reg_close?: string; link?: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((el) => {
      const o = asObject(el);
      const row: { name: string; time?: string; reg_close?: string; link?: string } = { name: str(o.name) };
      if (str(o.time) !== "") row.time = str(o.time);
      if (str(o.reg_close) !== "") row.reg_close = str(o.reg_close);
      if (str(o.link) !== "") row.link = str(o.link);
      return row;
    })
    .filter((r) => r.name.trim() !== "");
}

export function coerceSponsors(value: unknown): { name: string; logo?: string; url?: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((el) => {
      const o = asObject(el);
      const row: { name: string; logo?: string; url?: string } = { name: str(o.name) };
      if (str(o.logo) !== "") row.logo = str(o.logo);
      if (str(o.url) !== "") row.url = str(o.url);
      return row;
    })
    .filter((r) => r.name.trim() !== "");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/structured-fields.test.ts`
Expected: PASS (모든 describe 블록)

- [ ] **Step 5: 커밋**

```bash
git add lib/admin/structured-fields.ts test/structured-fields.test.ts
git commit -m "feat(admin): add strict structured-field parse/coerce helpers"
```

---

## Task 4: 특수페이지 폼·액션을 에디터로 전환

**Files:**
- Modify: `components/admin/SpecialPageForm.tsx:85-96` (gallery/info_cards/note_list 블록)
- Modify: `app/admin/actions/specialPages.ts:7-32` (parseSpecialPageForm)
- Test: `test/special-page-form.test.tsx`

**Interfaces:**
- Consumes: `RepeatableFieldEditor` (Task 2), `parseJsonField`/`coerceStringList`/`coerceLabelValueList` (Task 3).

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// test/special-page-form.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SpecialPageForm } from "@/components/admin/SpecialPageForm";

describe("SpecialPageForm structured fields", () => {
  it("renders add buttons instead of raw JSON textareas", () => {
    render(<SpecialPageForm action={async () => {}} />);
    expect(screen.getByText("이미지 추가")).toBeInTheDocument();
    expect(screen.getByText("카드 추가")).toBeInTheDocument();
    expect(screen.getByText("노트 추가")).toBeInTheDocument();
    // raw-JSON label gone
    expect(screen.queryByText(/JSON 배열/)).not.toBeInTheDocument();
  });

  it("seeds info_cards hidden input from existing page data", () => {
    const page = {
      id: "1", slug: "x", label: null, title: "t", description: null, date: null, venue: null,
      address: null, start_time: null, entry_link: null, cta_label: null, sponsor_name: null,
      sponsor_logo: null, poster: null, gallery: [], info_cards: [{ label: "날짜", value: "6/9" }],
      note_list: [], blind_structure_id: null, start_show_date: null, end_show_date: null, is_visible: true,
    };
    const { container } = render(<SpecialPageForm page={page} action={async () => {}} />);
    const hidden = container.querySelector('input[name="info_cards"]') as HTMLInputElement;
    expect(JSON.parse(hidden.value)).toEqual([{ label: "날짜", value: "6/9" }]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/special-page-form.test.tsx`
Expected: FAIL — `이미지 추가` 텍스트 없음(아직 Textarea).

- [ ] **Step 3: 폼 구현 — gallery/info_cards/note_list 블록 교체**

`components/admin/SpecialPageForm.tsx` 상단 import에 추가:

```tsx
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
```

`:85-96`의 세 `<div>` 블록(gallery/info_cards/note_list Textarea)을 아래로 교체:

```tsx
      <div className="flex flex-col gap-2">
        <Label>갤러리 (이미지 URL)</Label>
        <RepeatableFieldEditor<string>
          name="gallery"
          initial={page?.gallery ?? []}
          makeEmpty={() => ""}
          addLabel="이미지 추가"
          emptyHint="추가된 이미지가 없습니다."
          renderRow={(value, onChange) => (
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="이미지 URL" className="flex-1" />
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>정보 카드</Label>
        <RepeatableFieldEditor<{ label: string; value: string }>
          name="info_cards"
          initial={page?.info_cards ?? []}
          makeEmpty={() => ({ label: "", value: "" })}
          addLabel="카드 추가"
          emptyHint="추가된 카드가 없습니다."
          renderRow={(card, onChange) => (
            <>
              <Input value={card.label} onChange={(e) => onChange({ ...card, label: e.target.value })} placeholder="항목 (예: 날짜)" className="w-40" />
              <Input value={card.value} onChange={(e) => onChange({ ...card, value: e.target.value })} placeholder="내용 (예: 6/9 화요일 16:00)" className="flex-1" />
            </>
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>노트 목록</Label>
        <RepeatableFieldEditor<string>
          name="note_list"
          initial={page?.note_list ?? []}
          makeEmpty={() => ""}
          addLabel="노트 추가"
          emptyHint="추가된 노트가 없습니다."
          renderRow={(value, onChange) => (
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="안내 문구" className="flex-1" />
          )}
        />
      </div>
```

- [ ] **Step 4: 액션 구현 — 엄격 파싱+보정**

`app/admin/actions/specialPages.ts`의 import에 추가:

```ts
import { parseJsonField, coerceStringList, coerceLabelValueList } from "@/lib/admin/structured-fields";
```

`parseSpecialPageForm`(`:7-32`)에서 내부 `parseJson` 함수를 **삭제**하고, `gallery`/`info_cards`/`note_list` 세 줄을 교체:

```ts
function parseSpecialPageForm(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    slug: String(fd.get("slug") || ""),
    label: s("label"),
    title: String(fd.get("title") || ""),
    description: s("description"),
    date: s("date"),
    venue: s("venue"),
    address: s("address"),
    start_time: s("start_time"),
    entry_link: s("entry_link"),
    cta_label: s("cta_label"),
    sponsor_name: s("sponsor_name"),
    gallery: coerceStringList(parseJsonField(fd.get("gallery"), "갤러리")),
    info_cards: coerceLabelValueList(parseJsonField(fd.get("info_cards"), "정보 카드")),
    note_list: coerceStringList(parseJsonField(fd.get("note_list"), "노트 목록")),
    blind_structure_id: s("blind_structure_id"),
    start_show_date: s("start_show_date"),
    end_show_date: s("end_show_date"),
    is_visible: fd.get("is_visible") === "on",
  };
}
```

- [ ] **Step 5: 테스트 통과 + 타입체크 확인**

Run: `npx vitest run test/special-page-form.test.tsx && npx tsc --noEmit`
Expected: 테스트 PASS, 타입 오류 없음.

- [ ] **Step 6: 커밋**

```bash
git add components/admin/SpecialPageForm.tsx app/admin/actions/specialPages.ts test/special-page-form.test.tsx
git commit -m "refactor(admin): replace special-page JSON textareas with structured editors"
```

---

## Task 5: 온라인 리그 폼·액션을 에디터로 전환

**Files:**
- Modify: `app/admin/(protected)/online-league/page.tsx:56-67` (steps/links/today_leagues)
- Modify: `app/admin/actions/onlineLeague.ts:7-24`

**Interfaces:**
- Consumes: `RepeatableFieldEditor` (Task 2), `parseJsonField`/`coerceStringList`/`coerceStringRecord`/`coerceTodayLeagues` (Task 3).

> 참고: `online-league/page.tsx`는 Server Component이지만, 그 안의 `RepeatableFieldEditor`는 클라이언트 컴포넌트 아일랜드로 정상 렌더된다(기존 `Checkbox`/`Select`와 동일).

- [ ] **Step 1: 폼 구현 — 세 블록 교체**

`app/admin/(protected)/online-league/page.tsx` import에 추가:

```tsx
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
```

`:56-67`의 steps/links/today_leagues `<div>` 세 블록을 교체:

```tsx
        <div className="flex flex-col gap-2">
          <Label>스텝</Label>
          <RepeatableFieldEditor<string>
            name="steps"
            initial={league.steps}
            makeEmpty={() => ""}
            addLabel="스텝 추가"
            emptyHint="추가된 스텝이 없습니다."
            renderRow={(value, onChange) => (
              <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="예: 1단계 — 카카오 입장" className="flex-1" />
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>링크</Label>
          <RepeatableFieldEditor<{ key: string; value: string }>
            name="links"
            initial={Object.entries(league.links).map(([key, value]) => ({ key, value }))}
            makeEmpty={() => ({ key: "", value: "" })}
            addLabel="링크 추가"
            emptyHint="추가된 링크가 없습니다."
            serialize={(rows) =>
              JSON.stringify(Object.fromEntries(rows.filter((r) => r.key.trim() !== "").map((r) => [r.key, r.value])))
            }
            renderRow={(row, onChange) => (
              <>
                <Input value={row.key} onChange={(e) => onChange({ ...row, key: e.target.value })} placeholder="이름 (예: 카카오)" className="w-40" />
                <Input value={row.value} onChange={(e) => onChange({ ...row, value: e.target.value })} placeholder="URL" className="flex-1" />
              </>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>오늘의 리그</Label>
          <RepeatableFieldEditor<{ name: string; time?: string; reg_close?: string; link?: string }>
            name="today_leagues"
            initial={league.today_leagues}
            makeEmpty={() => ({ name: "", time: "", reg_close: "", link: "" })}
            addLabel="리그 추가"
            emptyHint="추가된 리그가 없습니다."
            renderRow={(row, onChange) => (
              <>
                <Input value={row.name} onChange={(e) => onChange({ ...row, name: e.target.value })} placeholder="리그명" className="w-40" />
                <Input value={row.time ?? ""} onChange={(e) => onChange({ ...row, time: e.target.value })} placeholder="시간 (예: 20:00)" className="w-28" />
                <Input value={row.reg_close ?? ""} onChange={(e) => onChange({ ...row, reg_close: e.target.value })} placeholder="레지마감" className="w-28" />
                <Input value={row.link ?? ""} onChange={(e) => onChange({ ...row, link: e.target.value })} placeholder="링크" className="flex-1" />
              </>
            )}
          />
        </div>
```

- [ ] **Step 2: 액션 구현 — 엄격 파싱+보정**

`app/admin/actions/onlineLeague.ts` import에 추가:

```ts
import { parseJsonField, coerceStringList, coerceStringRecord, coerceTodayLeagues } from "@/lib/admin/structured-fields";
```

내부 `parseJson` 함수를 **삭제**하고 payload의 steps/links/today_leagues 교체:

```ts
  const payload = {
    status: String(fd.get("status") || "hidden"),
    tab_visible: fd.get("tab_visible") === "on",
    title: s("title"),
    description: s("description"),
    join_guide: s("join_guide"),
    steps: coerceStringList(parseJsonField(fd.get("steps"), "스텝")),
    links: coerceStringRecord(parseJsonField(fd.get("links"), "링크")),
    today_leagues: coerceTodayLeagues(parseJsonField(fd.get("today_leagues"), "오늘의 리그")),
    notice_text: s("notice_text"),
    cta_label: s("cta_label"),
    cta_url: s("cta_url"),
    sheet_url: s("sheet_url"),
  };
```

- [ ] **Step 3: 타입체크 + 회귀 테스트**

Run: `npx tsc --noEmit && npm test`
Expected: 타입 오류 없음, 전체 테스트 PASS.

- [ ] **Step 4: 커밋**

```bash
git add "app/admin/(protected)/online-league/page.tsx" app/admin/actions/onlineLeague.ts
git commit -m "refactor(admin): replace online-league JSON textareas with structured editors"
```

---

## Task 6: 푸터 스폰서 폼·액션을 에디터로 전환

**Files:**
- Modify: `app/admin/(protected)/settings/page.tsx:82-93` (footer_sponsors 카드 내용)
- Modify: `app/admin/actions/siteConfig.ts:9-26`

**Interfaces:**
- Consumes: `RepeatableFieldEditor` (Task 2), `parseJsonField`/`coerceSponsors` (Task 3).

- [ ] **Step 1: 폼 구현 — footer_sponsors 블록 교체**

`app/admin/(protected)/settings/page.tsx` import에 추가:

```tsx
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
```

`:82-93`의 `<CardContent>` 내부(현 Label+Textarea)를 교체:

```tsx
          <CardContent>
            <div className="flex flex-col gap-2">
              <Label>스폰서 목록</Label>
              <RepeatableFieldEditor<{ name: string; logo?: string; url?: string }>
                name="footer_sponsors"
                initial={config.footer_sponsors}
                makeEmpty={() => ({ name: "", logo: "", url: "" })}
                addLabel="스폰서 추가"
                emptyHint="추가된 스폰서가 없습니다."
                renderRow={(row, onChange) => (
                  <>
                    <Input value={row.name} onChange={(e) => onChange({ ...row, name: e.target.value })} placeholder="스폰서명" className="w-40" />
                    <Input value={row.logo ?? ""} onChange={(e) => onChange({ ...row, logo: e.target.value })} placeholder="로고 URL" className="flex-1" />
                    <Input value={row.url ?? ""} onChange={(e) => onChange({ ...row, url: e.target.value })} placeholder="링크 URL (선택)" className="flex-1" />
                  </>
                )}
              />
            </div>
          </CardContent>
```

- [ ] **Step 2: 액션 구현 — 엄격 파싱+보정**

`app/admin/actions/siteConfig.ts` import에 추가:

```ts
import { parseJsonField, coerceSponsors } from "@/lib/admin/structured-fields";
```

내부 `parseJson` 함수를 **삭제**하고 payload의 footer_sponsors 교체:

```ts
    footer_sponsors: coerceSponsors(parseJsonField(fd.get("footer_sponsors"), "푸터 스폰서")),
```

(파일 상단의 `validateHttpsUrlFormat` 사용 로직은 그대로 유지.)

- [ ] **Step 3: 타입체크 + 회귀 테스트**

Run: `npx tsc --noEmit && npm test`
Expected: 타입 오류 없음, 전체 테스트 PASS.

- [ ] **Step 4: 커밋**

```bash
git add "app/admin/(protected)/settings/page.tsx" app/admin/actions/siteConfig.ts
git commit -m "refactor(admin): replace footer-sponsors JSON textarea with structured editor"
```

---

## Task 7: 어드민 에러 바운더리

**Files:**
- Create: `app/admin/error.tsx`
- Test: `test/admin-error.test.tsx`

**Interfaces:**
- Produces: `app/admin/error.tsx`의 default export `AdminError({ error, reset })` — Next.js App Router 에러 바운더리(클라이언트). Task 3의 `StructuredFieldError` 등 서버 액션이 던진 오류를 한국어로 표시.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// test/admin-error.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AdminError from "@/app/admin/error";

describe("AdminError boundary", () => {
  it("shows a Korean message and retry button, calls reset on click", () => {
    const reset = vi.fn();
    render(<AdminError error={new Error("boom")} reset={reset} />);
    expect(screen.getByText("문제가 발생했어요")).toBeInTheDocument();
    fireEvent.click(screen.getByText("다시 시도"));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/admin-error.test.tsx`
Expected: FAIL — `Cannot find module '@/app/admin/error'`

- [ ] **Step 3: 최소 구현 작성**

```tsx
// app/admin/error.tsx
"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center" role="alert">
      <h2 className="text-foreground text-xl font-bold">문제가 발생했어요</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        저장 중 오류가 생겨 변경사항이 적용되지 않았습니다. 입력값을 확인하고 다시 시도해 주세요. 문제가 계속되면
        개발자에게 문의해 주세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/admin-error.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: 커밋**

```bash
git add app/admin/error.tsx test/admin-error.test.tsx
git commit -m "feat(admin): add Korean error boundary for admin routes"
```

---

## Task 8: 삭제 확인 다이얼로그

**Files:**
- Create: `components/ui/alert-dialog.tsx` (shadcn 설치)
- Modify: `components/admin/DeleteButton.tsx`
- Modify: `app/admin/(protected)/special-pages/page.tsx:48` (itemName 전달 — 예시)
- Test: `test/delete-button.test.tsx`

**Interfaces:**
- Produces: `DeleteButton({ onDelete, itemName }: { onDelete: () => void | Promise<void>; itemName?: string })` — `삭제` 클릭 시 즉시 제출하지 않고 AlertDialog로 확인을 받은 뒤에만 기존 서버 액션 폼을 제출.

- [ ] **Step 1: shadcn AlertDialog 설치**

Run: `npx shadcn@latest add alert-dialog`
Expected: `components/ui/alert-dialog.tsx` 생성, `@radix-ui/react-alert-dialog` 의존성 추가. (설치 후 `git status`로 확인.)

- [ ] **Step 2: 실패하는 테스트 작성**

```tsx
// test/delete-button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeleteButton } from "@/components/admin/DeleteButton";

describe("DeleteButton", () => {
  it("does not call onDelete until the confirm dialog is acknowledged", () => {
    const onDelete = vi.fn();
    render(<DeleteButton onDelete={onDelete} itemName="슈퍼컵" />);
    // Clicking the row '삭제' opens the dialog, does NOT delete.
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onDelete).not.toHaveBeenCalled();
    // Dialog shows the irreversible warning + item name.
    expect(screen.getByText(/되돌릴 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/슈퍼컵/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run test/delete-button.test.tsx`
Expected: FAIL — 다이얼로그 경고 텍스트 없음(현재 즉시 제출 버튼).

- [ ] **Step 4: DeleteButton 구현**

```tsx
// components/admin/DeleteButton.tsx
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
  itemName?: string;
}

export function DeleteButton({ onDelete, itemName }: DeleteButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={onDelete} ref={formRef}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm">
            삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemName ? `"${itemName}"을(를) ` : ""}삭제하면 공개 사이트에서 숨겨집니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run test/delete-button.test.tsx`
Expected: PASS (1 test)

> 참고: 두 개의 `삭제` 버튼(트리거 + 다이얼로그 확인) 중 테스트의 `getByRole("button", { name: "삭제" })`는 첫 클릭 시점에 트리거 하나만 존재하므로 모호하지 않다.

- [ ] **Step 6: 특수페이지 목록에 itemName 전달**

`app/admin/(protected)/special-pages/page.tsx:48`의 DeleteButton 사용부를 교체:

```tsx
                  <DeleteButton itemName={p.title} onDelete={async () => { "use server"; await deleteSpecialPage(p.id); }} />
```

> 다른 목록 페이지(시즌·탭·스트럭처 등)의 DeleteButton은 `itemName` 없이도 동일 확인 다이얼로그를 자동으로 갖는다(옵셔널 prop). 본 Task는 특수페이지만 예시로 전달한다.

- [ ] **Step 7: 회귀 테스트 + 커밋**

Run: `npm test`
Expected: 전체 PASS.

```bash
git add components/ui/alert-dialog.tsx components/admin/DeleteButton.tsx "app/admin/(protected)/special-pages/page.tsx" test/delete-button.test.tsx package.json package-lock.json
git commit -m "feat(admin): require confirmation before delete"
```

---

## Task 9: 고아 탭 섹션 숨김

**Files:**
- Modify: `app/admin/(protected)/layout.tsx:7-16` (NAV_LINKS)

**Interfaces:** 없음(네비게이션 링크 1개 제거). 라우트(`app/admin/(protected)/tabs/**`)와 액션은 유지.

- [ ] **Step 1: 사이드바에서 탭 링크 제거**

`app/admin/(protected)/layout.tsx`의 `NAV_LINKS`에서 탭 항목을 삭제:

```tsx
const NAV_LINKS = [
  { href: "/admin/programs", label: "프로그램" },
  { href: "/admin/seasons", label: "시즌" },
  { href: "/admin/events", label: "일정" },
  { href: "/admin/blind-structures", label: "스트럭처" },
  { href: "/admin/online-league", label: "리그" },
  { href: "/admin/special-pages", label: "특수페이지" },
  { href: "/admin/settings", label: "설정" },
] as const;
```

(`{ href: "/admin/tabs", label: "탭" }` 줄만 제거. 대시보드 `page.tsx`에는 탭 카드가 없으므로 추가 변경 불필요.)

- [ ] **Step 2: 빌드/타입체크 + 커밋**

Run: `npx tsc --noEmit`
Expected: 타입 오류 없음.

```bash
git add "app/admin/(protected)/layout.tsx"
git commit -m "refactor(admin): hide orphaned tabs section from sidebar"
```

---

## 최종 검증 (전 Task 완료 후)

- [ ] **전체 테스트**: `npm test` → 전부 PASS.
- [ ] **타입체크**: `npx tsc --noEmit` → 오류 없음.
- [ ] **사용성 검증 게이트 (브라우저, 운영자 시나리오):**
  1. 특수페이지 수정 → 정보 카드 2개 추가·내용 입력·정렬·1개 삭제 → 저장 → 공개 페이지 반영 확인.
  2. 온라인 리그 → 오늘의 리그 1개 추가 후 저장 → `/online-league` 반영 확인.
  3. 모든 행을 비우고 저장 → 빈 목록(`[]`)으로 저장됨(과거값 보존이 아님) 확인.
  4. (개발자) 잘못된 데이터가 액션에 도달해도 `StructuredFieldError`로 막히고 `app/admin/error.tsx`가 표시됨 — 단위 테스트로 보장됨.
  5. 임의 항목 삭제 클릭 → 확인 다이얼로그 표시 → 취소 시 미삭제 확인.
  6. 사이드바에 "탭" 없음 확인.

---

## Self-Review (작성자 체크 — 완료)

- **Spec 커버리지(Phase 1):** raw-JSON→구조화 에디터(Task 4–6), silent fallback 제거(Task 3 + 4–6), 한국어 에러 바운더리(Task 7), 삭제 확인(Task 8), 탭 숨김(Task 9), `useRepeatableRows`+`RepeatableFieldEditor` 공통 컴포넌트(Task 1–2). 모두 매핑됨.
- **Placeholder 스캔:** "적절히 처리"류 없음 — 모든 코드 단계에 실제 코드 포함.
- **타입 일관성:** `parseJsonField`/`coerce*` 시그니처가 Task 3 정의와 Task 4–6 사용처에서 일치. `RepeatableFieldEditor` props가 Task 2 정의와 사용처에서 일치. 저장 형태가 `lib/types.ts`와 일치.
- **범위 메모(의도된 축소):** 갤러리는 Phase 1에서 이미지 URL 행으로 처리(행별 파일 업로드 재사용은 후속). 성공 토스트/리다이렉트는 Phase 3 범위라 본 계획 제외.
