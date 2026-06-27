# Admin Phase 2 — 전체 한글화 + 안전 입력 폴리시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민의 영어 enum(이벤트 상태, 프로그램 그룹/상태, 시즌 코드, 탭 타입, 리그 상태)을 전부 한글로 표시하고, 유명무실한 이벤트 category 필드를 폼·목록에서 숨기며, 필수 표시·이미지 썸네일 같은 안전한 입력 폴리시를 더한다.

**Architecture:** 한글 라벨을 `lib/labels.ts` 단일 소스에 모으고(공개 사이트 기존 맵은 건드리지 않음) 어드민 폼·목록이 이를 공유한다. 프로그램 status는 기존 자유텍스트를 **지연 정규화**(편집 시 표준 키로 매핑, 벌크 DB 마이그레이션 없음)해 Select로 전환한다. 이미지 미리보기는 재사용 `ImagePreview` 컴포넌트로 통일한다. 각 폼은 Phase 2에서 **한 번만** 편집한다.

**Tech Stack:** Next.js App Router, React client components, shadcn/ui Select/Input/Label/Checkbox, Tailwind v4 토큰, Vitest + @testing-library/react (jsdom).

## Global Constraints

- 디자인 토큰만 사용(`text-muted-foreground`, `border-border`, `text-gold` 등). 색/간격 하드코딩 금지. 어드민은 `components/ui/*` shadcn 프리미티브 사용.
- import 별칭 `@/`만. shadcn `SelectItem` value는 **비어 있으면 안 됨**(빈 값 옵션 금지).
- 키보드 단축키는 `KeyboardEvent.code`(해당 시).
- **저장 형태/스키마 불변.** 모든 enum의 **저장 값은 기존 영어 키 그대로**(한글은 표시 라벨일 뿐). `lib/types.ts`의 `EventStatus`/`ProgramGroup`/`SeasonCode`/`LeagueStatus` 유니온 불변.
- **공개 사이트 회귀 금지.** 공개 라벨 맵(`components/schedule/StatusBadge.tsx`, `lib/program-display.ts`, `components/league/LeagueStatusBlock.tsx`)과 공개 컴포넌트는 이 phase에서 수정하지 않는다(별도 admin 소스를 둔다).
- **이벤트 category 공개 동작 불변:** category 컬럼·기존값·공개 필터(`HomeMagazine.tsx:241`의 `category !== "completed"`)는 그대로 둔다. 어드민에서만 숨기고, 편집 시 기존값을 hidden input으로 보존한다(신규는 `"upcoming"`).
- 테스트 명령: `npm test`(= `vitest run --passWithNoTests`). 단일: `npx vitest run <path>`. 타입체크: `npx tsc --noEmit`.
- 커밋 컨벤션: `feat(admin)`/`refactor(admin)`.

## Scope 메모 (의도된 연기)
- 시간 필드 `type="time"` 전환과 요일 자동채움은 **기존 시간 데이터 포맷 검증이 필요**해 Phase 2에서 제외(후속 폴리시). 본 phase의 폼 편집은 한글화·필수표시·썸네일까지만.
- 프로그램 status **벌크 DB 마이그레이션**은 공유 DB 쓰기 권한이 없어 하지 않는다. 대신 편집 시점 지연 정규화로 점진 수렴(§Task 4).

---

## File Structure

**생성:**
- `lib/labels.ts` — 어드민 한글 라벨 맵 + 옵션 배열 + `normalizeProgramStatus`. 단일 소스.
- `components/admin/ImagePreview.tsx` — 이미지 URL 썸네일 미리보기(재사용).
- 테스트: `test/labels.test.ts`, `test/image-preview.test.tsx`, `test/event-form.test.tsx`(기존 확장), `test/program-form.test.tsx`(기존 확장).

**수정:**
- `components/admin/EventForm.tsx` — status 한글 Select, category 숨김(+hidden 보존), 필수 `*`, 썸네일.
- `components/admin/ProgramForm.tsx` — group 한글 Select, status 한글 Select(정규화), 필수 `*`, 커버 썸네일.
- `components/admin/SeasonForm.tsx` — code 한글 라벨, 필수 `*`, 히어로/배경 썸네일.
- `components/admin/SpecialPageForm.tsx` — 썸네일(sponsor_logo/poster).
- `components/admin/TabForm.tsx` — type 한글 Select.
- `app/admin/(protected)/online-league/page.tsx` — status 한글 Select.
- `app/admin/(protected)/events/page.tsx` — status 한글, category 컬럼 제거.
- `app/admin/(protected)/programs/page.tsx` — group 한글.
- `app/admin/(protected)/seasons/page.tsx` — code 한글.
- `app/admin/(protected)/layout.tsx` — 사이드바 "일정" → "이벤트".

---

## Task 1: 중앙 한글 라벨 모듈 `lib/labels.ts`

**Files:**
- Create: `lib/labels.ts`
- Test: `test/labels.test.ts`

**Interfaces — Produces:**
- `EVENT_STATUS_LABELS: Record<EventStatus,string>`, `EVENT_STATUS_OPTIONS: {value,label}[]`, `eventStatusLabel(s:string):string`
- `PROGRAM_GROUP_LABELS: Record<ProgramGroup,string>`, `PROGRAM_GROUP_OPTIONS: {value,label}[]`, `programGroupLabel(g:string):string`
- `SEASON_CODE_LABELS: Record<SeasonCode,string>`, `SEASON_CODE_OPTIONS: {value,label}[]`, `seasonCodeLabel(c:string):string`
- `TAB_TYPE_OPTIONS: {value,label}[]`
- `LEAGUE_STATUS_OPTIONS: {value,label}[]`
- `PROGRAM_STATUS_OPTIONS: readonly {value,label}[]`, `normalizeProgramStatus(raw:string|null|undefined):string`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// test/labels.test.ts
import { describe, it, expect } from "vitest";
import {
  EVENT_STATUS_LABELS, EVENT_STATUS_OPTIONS, eventStatusLabel,
  PROGRAM_GROUP_OPTIONS, programGroupLabel, SEASON_CODE_OPTIONS, seasonCodeLabel,
  TAB_TYPE_OPTIONS, LEAGUE_STATUS_OPTIONS, PROGRAM_STATUS_OPTIONS, normalizeProgramStatus,
} from "@/lib/labels";

describe("labels", () => {
  it("covers every EventStatus key with a Korean label", () => {
    expect(Object.keys(EVENT_STATUS_LABELS).sort()).toEqual(
      ["canceled","completed","confirmed","hidden","reg_closed","running","scheduled"]
    );
    expect(eventStatusLabel("reg_closed")).toBe("레지마감");
    expect(eventStatusLabel("unknown")).toBe("unknown"); // passthrough
    expect(EVENT_STATUS_OPTIONS.find((o) => o.value === "scheduled")?.label).toBe("예정");
  });
  it("localizes program group / season code", () => {
    expect(programGroupLabel("poker")).toBe("포커");
    expect(PROGRAM_GROUP_OPTIONS).toHaveLength(3);
    expect(seasonCodeLabel("autumn")).toBe("가을");
    expect(SEASON_CODE_OPTIONS.find((o) => o.value === "spring")?.label).toBe("봄 (spring)");
  });
  it("provides tab type and league status options in Korean", () => {
    expect(TAB_TYPE_OPTIONS.find((o) => o.value === "external")?.label).toBe("외부 링크");
    expect(LEAGUE_STATUS_OPTIONS.find((o) => o.value === "preparing")?.label).toBe("준비 중");
  });
  it("normalizes legacy program status free-text to standard keys (§2.2)", () => {
    expect(normalizeProgramStatus("모집 중")).toBe("recruiting"); // space variant in real data
    expect(normalizeProgramStatus("모집중")).toBe("recruiting");
    expect(normalizeProgramStatus("모집 완료")).toBe("closed");
    expect(normalizeProgramStatus("")).toBe("");
    expect(normalizeProgramStatus(null)).toBe("");
    expect(normalizeProgramStatus("recruiting")).toBe("recruiting"); // already standard
    expect(normalizeProgramStatus("기괴한값")).toBe(""); // unknown → empty
    expect(PROGRAM_STATUS_OPTIONS.map((o) => o.value)).toEqual(["recruiting","ongoing","closed","completed"]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — `npx vitest run test/labels.test.ts` → FAIL (모듈 없음)

- [ ] **Step 3: 최소 구현**

```ts
// lib/labels.ts
// Central Korean labels for ADMIN enum fields — the single source admin forms
// and lists read so operators never see raw English enum values. The PUBLIC
// site keeps its own label maps (StatusBadge / program-display / LeagueStatusBlock);
// this module deliberately does not import or modify them, to avoid any public
// regression. Stored values stay the English keys; these are display only.
// Pure / client-safe — no server imports.
import type { EventStatus, ProgramGroup, SeasonCode, LeagueStatus } from "@/lib/types";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: "예정",
  confirmed: "확정",
  running: "진행중",
  reg_closed: "레지마감",
  completed: "완료",
  canceled: "취소",
  hidden: "숨김",
};
export const EVENT_STATUS_OPTIONS = (Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map(
  (value) => ({ value, label: EVENT_STATUS_LABELS[value] }),
);
export function eventStatusLabel(s: string): string {
  return EVENT_STATUS_LABELS[s as EventStatus] ?? s;
}

export const PROGRAM_GROUP_LABELS: Record<ProgramGroup, string> = {
  poker: "포커",
  social: "소셜",
  others: "기타",
};
export const PROGRAM_GROUP_OPTIONS = (Object.keys(PROGRAM_GROUP_LABELS) as ProgramGroup[]).map(
  (value) => ({ value, label: PROGRAM_GROUP_LABELS[value] }),
);
export function programGroupLabel(g: string): string {
  return PROGRAM_GROUP_LABELS[g as ProgramGroup] ?? g;
}

export const SEASON_CODE_LABELS: Record<SeasonCode, string> = {
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};
// Options keep the English code in parentheses (matches the existing SeasonForm UX).
export const SEASON_CODE_OPTIONS = (Object.keys(SEASON_CODE_LABELS) as SeasonCode[]).map(
  (value) => ({ value, label: `${SEASON_CODE_LABELS[value]} (${value})` }),
);
export function seasonCodeLabel(c: string): string {
  return SEASON_CODE_LABELS[c as SeasonCode] ?? c;
}

export const TAB_TYPE_OPTIONS: { value: "internal" | "external" | "special"; label: string }[] = [
  { value: "internal", label: "내부 링크" },
  { value: "external", label: "외부 링크" },
  { value: "special", label: "특수 페이지" },
];

export const LEAGUE_STATUS_OPTIONS: { value: LeagueStatus; label: string }[] = [
  { value: "operating", label: "운영 중" },
  { value: "revamping", label: "개편 중" },
  { value: "preparing", label: "준비 중" },
  { value: "suspended", label: "일시 중단" },
  { value: "hidden", label: "숨김" },
];

// Program status: the column is free text with legacy Korean values
// ("모집 중"×19, "모집 완료"×1, ""×3 in real data). The form becomes a Select on
// standard keys; normalizeProgramStatus maps legacy values so the right option
// preselects and a save migrates that row lazily (no bulk DB write).
export const PROGRAM_STATUS_OPTIONS = [
  { value: "recruiting", label: "모집중" },
  { value: "ongoing", label: "진행중" },
  { value: "closed", label: "마감" },
  { value: "completed", label: "종료" },
] as const;

const PROGRAM_STATUS_NORMALIZE: Record<string, string> = {
  recruiting: "recruiting", "모집중": "recruiting", "모집 중": "recruiting",
  ongoing: "ongoing", "진행중": "ongoing", "진행 중": "ongoing",
  closed: "closed", "마감": "closed", "모집완료": "closed", "모집 완료": "closed",
  completed: "completed", "종료": "completed", "완료": "completed",
};
export function normalizeProgramStatus(raw: string | null | undefined): string {
  if (!raw) return "";
  return PROGRAM_STATUS_NORMALIZE[raw.trim()] ?? "";
}
```

- [ ] **Step 4: 테스트 통과 확인** — `npx vitest run test/labels.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/labels.ts test/labels.test.ts
git commit -m "feat(admin): central Korean label module for admin enums"
```

---

## Task 2: 이미지 미리보기 컴포넌트 `ImagePreview`

**Files:**
- Create: `components/admin/ImagePreview.tsx`
- Test: `test/image-preview.test.tsx`

**Interfaces — Produces:** `ImagePreview({ src }: { src: string | null | undefined }): JSX.Element | null` — `src`가 있으면 16×16 썸네일 + URL 텍스트, 없으면 `null`.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
// test/image-preview.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ImagePreview } from "@/components/admin/ImagePreview";

describe("ImagePreview", () => {
  it("renders a thumbnail and the url when src is provided", () => {
    render(<ImagePreview src="https://example.com/a.png" />);
    const img = screen.getByAltText("현재 이미지 미리보기") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://example.com/a.png");
    expect(screen.getByText("https://example.com/a.png")).toBeInTheDocument();
  });
  it("renders nothing when src is empty/null", () => {
    const { container } = render(<ImagePreview src={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인** — `npx vitest run test/image-preview.test.tsx` → FAIL

- [ ] **Step 3: 최소 구현**

```tsx
// components/admin/ImagePreview.tsx
// Admin-only thumbnail preview for a stored image URL. Uses a plain <img> on
// purpose: the source is an arbitrary external URL (e.g. framerusercontent.com)
// and next/image would require per-host remotePatterns config for a back-office
// preview that doesn't need optimization.
export function ImagePreview({ src }: { src: string | null | undefined }) {
  if (!src) return null;
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary external URLs */}
      <img
        src={src}
        alt="현재 이미지 미리보기"
        className="border-border h-16 w-16 shrink-0 rounded-md border object-cover"
      />
      <p className="text-muted-foreground text-xs break-all">{src}</p>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인** — `npx vitest run test/image-preview.test.tsx` → PASS

- [ ] **Step 5: 커밋**

```bash
git add components/admin/ImagePreview.tsx test/image-preview.test.tsx
git commit -m "feat(admin): reusable ImagePreview thumbnail component"
```

---

## Task 3: EventForm — 상태 한글 Select, category 숨김, 필수 표시, 썸네일

**Files:**
- Modify: `components/admin/EventForm.tsx`
- Test: `test/event-form.test.tsx` (기존 파일에 케이스 추가)

**Interfaces — Consumes:** `EVENT_STATUS_OPTIONS` (`@/lib/labels`), `ImagePreview` (`@/components/admin/ImagePreview`).

- [ ] **Step 1: 기존 테스트에 케이스 추가 (실패 확인용)**

`test/event-form.test.tsx`를 열어 기존 import 아래에 추가하고, 아래 describe 블록을 파일 끝에 추가:

```tsx
import { EVENT_STATUS_OPTIONS } from "@/lib/labels";

describe("EventForm Phase 2 localization", () => {
  it("shows the status select in Korean and hides the category select", () => {
    render(<EventForm structures={[]} action={async () => {}} />);
    // Korean status label visible (default 예정 = scheduled)
    expect(screen.getByText("예정")).toBeInTheDocument();
    // category is hidden: no English category options, but value preserved in a hidden input
    expect(screen.queryByText("festival")).not.toBeInTheDocument();
    const hidden = document.querySelector('input[type="hidden"][name="category"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.value).toBe("upcoming"); // default for a new event
  });
});
```

(기존 `render`/`screen`/`describe`/`it`/`expect` import가 이미 있으면 중복 추가하지 말 것.)

- [ ] **Step 2: 테스트 실패 확인** — `npx vitest run test/event-form.test.tsx` → FAIL (festival 옵션이 아직 보임 / 한글 라벨 없음)

- [ ] **Step 3: 구현**

`components/admin/EventForm.tsx` import에 추가:

```tsx
import { EVENT_STATUS_OPTIONS } from "@/lib/labels";
import { ImagePreview } from "@/components/admin/ImagePreview";
```

`:24-33`의 `CATEGORIES`/`STATUSES` 상수를 **삭제**(라벨 모듈로 대체).

`:55-59` 이벤트명 Label을 필수 표시로:
```tsx
        <Label htmlFor="title">이벤트명 *</Label>
```

`:73-88` 카테고리 블록 전체를 **hidden input 한 줄로 교체**(컬럼·기존값 보존, UI에서 숨김):
```tsx
      {/* 카테고리: 운영자에겐 무의미해 숨김. 기존값 보존(신규는 upcoming). */}
      <input type="hidden" name="category" value={event?.category ?? "upcoming"} />
```

`:90-105` 상태 블록의 `<SelectContent>`를 한글 옵션으로 교체:
```tsx
          <SelectContent>
            {EVENT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
```

`:173-181` 포스터 이미지 미리보기 교체:
```tsx
        <Label htmlFor="poster_image_file">포스터 이미지</Label>
        <ImagePreview src={event?.poster_image} />
        {event && <input type="hidden" name="poster_image_existing" value={event.poster_image ?? ""} />}
        <Input id="poster_image_file" name="poster_image_file" type="file" accept="image/*" />
```

`:183-191` 스폰서 로고 미리보기 교체:
```tsx
        <Label htmlFor="sponsor_logo_file">스폰서 로고</Label>
        <ImagePreview src={event?.sponsor_logo} />
        {event && <input type="hidden" name="sponsor_logo_existing" value={event.sponsor_logo ?? ""} />}
        <Input id="sponsor_logo_file" name="sponsor_logo_file" type="file" accept="image/*" />
```

(즉 기존 `{event?.poster_image && (<p ...>{...}</p>)}` 조각을 `<ImagePreview .../>`로 대체. action은 변경 없음 — `parse()`가 여전히 `category`/status를 받음.)

- [ ] **Step 4: 테스트 통과 + 타입체크** — `npx vitest run test/event-form.test.tsx && npx tsc --noEmit` → PASS, 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add components/admin/EventForm.tsx test/event-form.test.tsx
git commit -m "refactor(admin): Korean event status, hide category, required mark + thumbnails"
```

---

## Task 4: ProgramForm — 그룹/상태 한글 Select(정규화), 필수 표시, 커버 썸네일

**Files:**
- Modify: `components/admin/ProgramForm.tsx`
- Test: `test/program-form.test.tsx` (기존 파일에 케이스 추가)

**Interfaces — Consumes:** `PROGRAM_GROUP_OPTIONS`, `PROGRAM_STATUS_OPTIONS`, `normalizeProgramStatus` (`@/lib/labels`), `ImagePreview`.

- [ ] **Step 1: 기존 테스트에 케이스 추가**

`test/program-form.test.tsx` 끝에 추가:

```tsx
import { PROGRAM_STATUS_OPTIONS } from "@/lib/labels";

describe("ProgramForm Phase 2 localization", () => {
  it("renders Korean group options and a Korean status select", () => {
    render(<ProgramForm action={async () => {}} />);
    expect(screen.getByText("포커")).toBeInTheDocument();   // group default poker → 포커
    expect(screen.queryByText("poker")).not.toBeInTheDocument();
    // status is now a select; its hidden form value should be empty for a new program
    const hidden = document.querySelector('select[name="status"], [data-slot="select"]');
    expect(hidden).not.toBeNull();
  });
  it("preselects the normalized standard key for a legacy status value", () => {
    const program = {
      id: "1", slug: "x", title: "t", category: null, program_group: "poker", status: "모집 중",
      member_count: 0, location: null, start_date: null, end_date: null, description: null,
      cover_image: null, manager_name: null, manager_role: null, manager_avatar: null,
      cta_label: null, entry_link: null, external_url: null, is_hot: false, is_affiliate: false,
      is_visible: true, sort_order: 0,
    };
    render(<ProgramForm program={program} action={async () => {}} />);
    // "모집 중" normalizes to recruiting → its Korean label 모집중 shows in the trigger
    expect(screen.getByText("모집중")).toBeInTheDocument();
  });
});
```

> shadcn Select submits via its `name` prop through a hidden input Radix manages; the test asserts the visible Korean label rather than the raw value.

- [ ] **Step 2: 테스트 실패 확인** — `npx vitest run test/program-form.test.tsx` → FAIL

- [ ] **Step 3: 구현**

import 추가:
```tsx
import { PROGRAM_GROUP_OPTIONS, PROGRAM_STATUS_OPTIONS, normalizeProgramStatus } from "@/lib/labels";
import { ImagePreview } from "@/components/admin/ImagePreview";
```

`:22`의 `const GROUPS = [...]` **삭제**.

`:28-31` 프로그램명 Label 필수 표시: `<Label htmlFor="title">프로그램명 *</Label>`
`:34-37` 슬러그 Label 필수 표시: `<Label htmlFor="slug">슬러그 *</Label>`

`:39-43` 카테고리 블록 Label을 명확화(자유 표시 라벨 — 그룹과 구분):
```tsx
        <Label htmlFor="category">카테고리 (표시용 라벨)</Label>
        <Input id="category" name="category" defaultValue={program?.category ?? ""} placeholder="예: 커뮤니티" />
```

`:45-60` 그룹 Select `<SelectContent>` 교체:
```tsx
          <SelectContent>
            {PROGRAM_GROUP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
```

`:62-66` 상태 자유텍스트 Input을 한글 Select로 교체(지연 정규화 + 미지값 보존):
```tsx
      {/* 상태 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="status">상태</Label>
        <Select name="status" defaultValue={normalizeProgramStatus(program?.status) || undefined}>
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="-- 선택 --" />
          </SelectTrigger>
          <SelectContent>
            {PROGRAM_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
            {/* 표준 키로 매핑되지 않는 기존값은 원본 그대로 보존(다음 저장에서 덮이지 않게) */}
            {program?.status && normalizeProgramStatus(program.status) === "" && (
              <SelectItem value={program.status}>{program.status} (원본값)</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
```

`:98-106` 커버 이미지 미리보기 교체:
```tsx
        <Label htmlFor="cover_image_file">커버 이미지</Label>
        <ImagePreview src={program?.cover_image} />
        {program && <input type="hidden" name="cover_image_existing" value={program.cover_image ?? ""} />}
        <Input id="cover_image_file" name="cover_image_file" type="file" accept="image/*" />
```

(action `app/admin/actions/programs.ts`는 변경 없음 — `status: s("status")`가 Select가 보낸 표준 키 또는 보존된 원본값을 그대로 저장.)

- [ ] **Step 4: 테스트 통과 + 타입체크** — `npx vitest run test/program-form.test.tsx && npx tsc --noEmit` → PASS

- [ ] **Step 5: 커밋**

```bash
git add components/admin/ProgramForm.tsx test/program-form.test.tsx
git commit -m "refactor(admin): Korean program group/status selects, required marks, cover thumbnail"
```

---

## Task 5: SeasonForm + SpecialPageForm — 코드 라벨, 필수 표시, 썸네일

**Files:**
- Modify: `components/admin/SeasonForm.tsx`
- Modify: `components/admin/SpecialPageForm.tsx`

**Interfaces — Consumes:** `SEASON_CODE_OPTIONS` (`@/lib/labels`), `ImagePreview`.

- [ ] **Step 1: SeasonForm 구현**

import 추가:
```tsx
import { SEASON_CODE_OPTIONS } from "@/lib/labels";
import { ImagePreview } from "@/components/admin/ImagePreview";
```

`:21-26`의 로컬 `SEASON_CODES` 배열을 **삭제**하고, `:45`의 매핑을 `SEASON_CODE_OPTIONS`로 변경:
```tsx
            {SEASON_CODE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
```

필수 표시: 시즌명 Label `시즌명 *`(`:?` — `시즌명` 라벨), 연도 Label `연도 *`(`:56`).

히어로 이미지 미리보기(`:90-98`):
```tsx
        <Label htmlFor="hero_image_file">히어로 이미지</Label>
        <ImagePreview src={season?.hero_image} />
        {season && <input type="hidden" name="hero_image_existing" value={season.hero_image ?? ""} />}
        <Input id="hero_image_file" name="hero_image_file" type="file" accept="image/*" />
```
배경 이미지 미리보기(`:100-108`):
```tsx
        <Label htmlFor="bg_image_file">배경 이미지</Label>
        <ImagePreview src={season?.bg_image} />
        {season && <input type="hidden" name="bg_image_existing" value={season.bg_image ?? ""} />}
        <Input id="bg_image_file" name="bg_image_file" type="file" accept="image/*" />
```

- [ ] **Step 2: SpecialPageForm 구현**

import 추가: `import { ImagePreview } from "@/components/admin/ImagePreview";`

스폰서 로고 미리보기(`:69-76` 영역, 기존 `{page?.sponsor_logo && (<p ...>{...}</p>)}` 교체):
```tsx
        <Label htmlFor="sponsor_logo_file">스폰서 로고</Label>
        <ImagePreview src={page?.sponsor_logo} />
        {page && <input type="hidden" name="sponsor_logo_existing" value={page.sponsor_logo ?? ""} />}
        <Input id="sponsor_logo_file" name="sponsor_logo_file" type="file" accept="image/*" />
```
포스터 미리보기(`:77-84` 영역):
```tsx
        <Label htmlFor="poster_file">포스터</Label>
        <ImagePreview src={page?.poster} />
        {page && <input type="hidden" name="poster_existing" value={page.poster ?? ""} />}
        <Input id="poster_file" name="poster_file" type="file" accept="image/*" />
```

- [ ] **Step 3: 타입체크 + 전체 테스트** — `npx tsc --noEmit && npm test` → 오류 없음, 전체 PASS

- [ ] **Step 4: 커밋**

```bash
git add components/admin/SeasonForm.tsx components/admin/SpecialPageForm.tsx
git commit -m "refactor(admin): Korean season code, required marks, image thumbnails (season/special)"
```

---

## Task 6: TabForm + 온라인 리그 — 타입/상태 한글 Select

**Files:**
- Modify: `components/admin/TabForm.tsx`
- Modify: `app/admin/(protected)/online-league/page.tsx`

**Interfaces — Consumes:** `TAB_TYPE_OPTIONS`, `LEAGUE_STATUS_OPTIONS` (`@/lib/labels`).

- [ ] **Step 1: TabForm 구현**

import 추가: `import { TAB_TYPE_OPTIONS } from "@/lib/labels";`
`:20`의 `const TAB_TYPES = [...]` **삭제**. 타입 Select `<SelectContent>`(`:41-43`) 교체:
```tsx
            {TAB_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
```

- [ ] **Step 2: 온라인 리그 status 구현**

`app/admin/(protected)/online-league/page.tsx` import에 추가: `import { LEAGUE_STATUS_OPTIONS } from "@/lib/labels";`
`:16`의 `const STATUSES = [...]` **삭제**. status Select `<SelectContent>`(`:31-37`) 교체:
```tsx
            <SelectContent>
              {LEAGUE_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
```

- [ ] **Step 3: 타입체크 + 전체 테스트** — `npx tsc --noEmit && npm test` → PASS

- [ ] **Step 4: 커밋**

```bash
git add components/admin/TabForm.tsx "app/admin/(protected)/online-league/page.tsx"
git commit -m "refactor(admin): Korean tab type and league status selects"
```

---

## Task 7: 목록 한글화 + 사이드바 명칭 통일

**Files:**
- Modify: `app/admin/(protected)/events/page.tsx`
- Modify: `app/admin/(protected)/programs/page.tsx`
- Modify: `app/admin/(protected)/seasons/page.tsx`
- Modify: `app/admin/(protected)/layout.tsx`

**Interfaces — Consumes:** `eventStatusLabel`, `programGroupLabel`, `seasonCodeLabel` (`@/lib/labels`).

- [ ] **Step 1: events 목록 — 상태 한글 + 카테고리 컬럼 제거**

`app/admin/(protected)/events/page.tsx` import에 추가: `import { eventStatusLabel } from "@/lib/labels";`
헤더에서 `<TableHead>카테고리</TableHead>` 줄 **삭제**.
본문에서 `<TableCell className="text-muted-foreground">{event.category}</TableCell>` 줄 **삭제**.
상태 셀 교체: `<TableCell className="text-muted-foreground">{eventStatusLabel(event.status)}</TableCell>`
빈 상태 `colSpan={5}` → `colSpan={4}` (컬럼 1개 감소).

- [ ] **Step 2: programs 목록 — 그룹 한글**

import 추가: `import { programGroupLabel } from "@/lib/labels";`
그룹 셀 교체: `<TableCell className="text-muted-foreground">{programGroupLabel(program.program_group)}</TableCell>`

- [ ] **Step 3: seasons 목록 — 코드 한글**

import 추가: `import { seasonCodeLabel } from "@/lib/labels";`
코드 셀 교체: `<TableCell className="text-muted-foreground">{seasonCodeLabel(season.code)}</TableCell>`

- [ ] **Step 4: 사이드바 명칭 통일 (일정 → 이벤트)**

`app/admin/(protected)/layout.tsx`의 `NAV_LINKS`에서 events 항목 라벨 변경:
```tsx
  { href: "/admin/events", label: "이벤트" },
```

- [ ] **Step 5: 타입체크 + 전체 테스트** — `npx tsc --noEmit && npm test` → PASS

- [ ] **Step 6: 커밋**

```bash
git add "app/admin/(protected)/events/page.tsx" "app/admin/(protected)/programs/page.tsx" "app/admin/(protected)/seasons/page.tsx" "app/admin/(protected)/layout.tsx"
git commit -m "refactor(admin): localize list columns and unify sidebar naming"
```

---

## 최종 검증 (전 Task 완료 후)

- [ ] `npm test` → 전부 PASS. `npx tsc --noEmit` → 오류 없음. `npx eslint <changed files>` → 통과.
- [ ] 사용성 검증 게이트(브라우저, 운영자 시나리오):
  1. 이벤트 생성/수정 → 상태 드롭다운이 한글(예정/확정/…), 카테고리 필드 안 보임, 기존 이벤트 수정·저장해도 홈 노출 동작 불변.
  2. 프로그램 수정 → 그룹·상태가 한글 드롭다운, 기존 "모집 중" 프로그램이 "모집중"으로 미리 선택됨.
  3. 목록(이벤트/프로그램/시즌)에 영어 enum이 없음. 사이드바가 "이벤트".
  4. 이미지 필드에 썸네일이 보임.

## Self-Review (작성자 체크 — 완료)
- **Spec 커버리지(Phase 2):** 라벨 중앙화(T1), enum 한글화 — 이벤트 상태(T3), 프로그램 그룹/상태(T4), 시즌 코드(T5/T7), 탭 타입·리그 상태(T6), 목록(T7); 이벤트 category 숨김+보존(T3/T7); 명칭 통일(T7); §2.2 status 지연 정규화(T1/T4); 필수 표시·썸네일(T3–T5). 시간/요일은 Scope 메모대로 연기.
- **Placeholder 스캔:** 없음 — 모든 단계 실제 코드/정확한 편집 지시.
- **타입 일관성:** `labels.ts` export 시그니처가 T1 정의와 T3–T7 사용처에서 일치. 저장 값은 영어 키 유지(스키마 불변). 공개 맵 미수정(회귀 방지).
- **위험 메모:** 프로그램 status 미지값은 "원본값" SelectItem으로 보존(데이터 손실 방지). 이벤트 category는 hidden input으로 보존(공개 동작 불변).
