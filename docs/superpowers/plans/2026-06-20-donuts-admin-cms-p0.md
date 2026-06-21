# DO:NUTS 관리자화 P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `do-nuts.kr` 도너츠 시리즈 페이지를 Next.js + Supabase 자체 앱으로 재구축하고, 운영진이 코드 없이 시즌·일정·블라인드 스트럭처·온라인 리그·후원/챌린지 탭을 관리하는 `/admin` CMS를 구축한다.

**Architecture:** 단일 Next.js 16 (App Router) 앱. 공개 페이지는 Server Component가 Supabase를 읽어 ISR로 렌더하고, 관리자 변경(Server Actions)은 on-demand revalidate를 트리거한다. `/admin`은 middleware로 Supabase Auth 세션을 검사한다. 데이터는 Supabase Postgres에 두고 공개 read + 인증 write를 RLS로 강제한다. 디자인은 라이브 사이트를 브라우저 확장으로 캡처해 Tailwind 토큰으로 재현한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 3, Supabase (Postgres + Auth + Storage), Vitest, Vercel.

**선행 스펙:** `docs/superpowers/specs/2026-06-20-donuts-admin-cms-p0-design.md`

## Global Constraints

- Next.js `16.x`, React `19.x`, TypeScript `^5` — 형제 프로젝트 `udfnd`/`cuayo`와 일치.
- Tailwind CSS `^3.4`.
- 패키지 매니저: `npm` (`package-lock.json`).
- 언어: 한국어 단일. `<html lang="ko">`.
- 프로젝트 루트: `/Users/seungmok/WebstormProjects/donuts`.
- Supabase: 공개 read는 `deleted_at is null` + 노출 조건에서만 익명 SELECT 허용. 모든 write는 인증 세션 필수(RLS).
- 소프트 삭제: 삭제 대상은 `deleted_at` 기반(실제 DELETE 금지).
- 블라인드 스트럭처 `sb`/`bb`/`ante`는 **text**(PLO처럼 텍스트 허용).
- 도너츠 타이머는 P0에서 `events.timer_event_id` / `events.timer_event_url` **필드만 예약**(연동 로직 없음).
- 비밀은 `.env.local`(커밋 금지). 서버 전용 비밀은 `NEXT_PUBLIC_` 접두사 금지.
- Framer 자동생성 코드 재사용 금지.
- **디자인: `/series` 다크 테마로 통일.** 실측 기준 = `docs/superpowers/design-capture.md`. 토큰: 배경 `#0A0908`, 텍스트 `#FFFFFF`(+화이트 알파 음소거), 골드 액센트 `#FFE58A`, 코럴 CTA 그라데이션 `linear-gradient(90deg,#D94B45,#F08B6F)`, 글래스 카드 `rgba(255,255,255,.04)`, pill `999px`/카드 radius `20~34px`, 폰트 `Inter` + 한글 `Wanted Sans`/Pretendard 폴백. 화이트 디렉토리도 동일 다크 토큰으로 통일.
- **범위 = 통합 다크 앱**: ① 프로그램 디렉토리(`programs` 테이블 → `/`, `/programs`, `/programs/[slug]`, `/poker`/`/social`/`/others`) + ② 시리즈 운영 CMS(`/series`, `/schedule`, `/online-league`, `/leaderboard`, `/[tabSlug]`). "도너츠 시리즈" 프로그램 카드는 `external_url=/series`로 마이크로사이트 연결.
- 매 태스크 종료 시 Conventional Commits 메시지로 커밋.

> **NOTE (실행 순서 변경):** 라이브 캡처 검증 후 스코프가 확장됨(프로그램 디렉토리 추가, 다크 통일). 신규 Task 16~19(프로그램 디렉토리 스키마/데이터/페이지/어드민)가 추가됐다. **의존성 기반 실행 순서: 1→2→3→4→5→16→17→6→7→8→18→9→10→11→12→13→19→14→15.** (Task 10 sitemap이 `getPrograms`(17)를 import → 17이 10보다 먼저; Task 19가 `uploadIfPresent`(13)를 사용 → 13이 19보다 먼저.) Task 8의 홈은 `/`가 아니라 `/series`(시리즈 랜딩)를 만든다 — 최상위 `/`(디렉토리 홈)는 Task 18에서 만든다. Supabase 미프로비저닝: DB 적용·DB의존 빌드·seed(14)·배포(15)는 자격증명 확보 후.

---

## File Structure

```
donuts/
  app/
    layout.tsx                          # 루트 레이아웃 <html lang="ko">, 폰트, Header/Footer
    globals.css                         # Tailwind + 디자인 토큰 CSS 변수
    page.tsx                            # 홈 /
    schedule/page.tsx                   # 일정 목록 /schedule
    schedule/[id]/page.tsx              # 이벤트 상세 /schedule/[id]
    online-league/page.tsx             # 온라인 리그 /online-league
    leaderboard/page.tsx               # 리더보드 /leaderboard
    [tabSlug]/page.tsx                  # 후원/챌린지 동적 페이지
    sitemap.ts / robots.ts
    admin/
      layout.tsx                        # 인증 가드 셸 + 네비
      login/page.tsx
      page.tsx                          # 대시보드
      seasons/page.tsx, seasons/new/page.tsx, seasons/[id]/edit/page.tsx
      events/page.tsx, events/new/page.tsx, events/[id]/edit/page.tsx
      blind-structures/page.tsx, blind-structures/[id]/edit/page.tsx
      online-league/page.tsx
      tabs/page.tsx, tabs/[id]/edit/page.tsx
      special-pages/page.tsx, special-pages/new/page.tsx, special-pages/[id]/edit/page.tsx
      settings/page.tsx
      actions/*.ts                      # 도메인별 server actions
  components/
    site/{Header,Footer,Nav}.tsx
    schedule/{EventCard,StatusBadge,BlindStructureTable,CategoryFilter}.tsx
    league/LeagueStatusBlock.tsx
    special/SpecialPageView.tsx
    admin/{SeasonForm,EventForm,BlindStructureEditor,TabForm,SpecialPageForm,DeleteButton}.tsx
  lib/
    supabase/{server,browser,middleware}.ts
    data/{seasons,events,blindStructures,tabs,specialPages,onlineLeague,siteConfig}.ts
    types.ts
    revalidate.ts
  middleware.ts
  supabase/
    migrations/0001_schema.sql
    migrations/0002_rls.sql
    seed.sql
  test/...
  tailwind.config.ts / next.config.ts / vitest.config.ts / package.json
  docs/superpowers/{specs,plans,design-capture.md}
```

---

## Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.gitignore`, `.env.example`, `vitest.config.ts`, `test/setup.ts`

**Interfaces:**
- Produces: 실행되는 Next.js dev 서버; `app/layout.tsx`의 루트 레이아웃(`<html lang="ko">`).

- [ ] **Step 1: Scaffold the app**

`/Users/seungmok/WebstormProjects` 에서 실행:
```bash
npx create-next-app@latest donuts --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
```
(이미 `donuts/`에 `docs/`가 있으므로, 충돌 시 생성된 파일을 기존 디렉터리에 병합한다. `docs/`는 보존.)

- [ ] **Step 2: Pin versions**

`donuts/package.json`에서 `next` → `16.x`, `react`/`react-dom` → `19.x`, `tailwindcss` → `^3.4`(스캐폴드가 v4면 다운그레이드). 그 후:
```bash
cd /Users/seungmok/WebstormProjects/donuts && npm install
```

- [ ] **Step 3: Add deps**

```bash
npm install @supabase/supabase-js @supabase/ssr marked
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./test/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```
Create `test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```
`package.json` scripts에 추가: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Root layout language**

`app/layout.tsx`의 루트 요소를 `<html lang="ko">`로. 생성된 폰트/body 배선은 유지(폰트는 Task 4에서 확정).

- [ ] **Step 6: Verify dev + build**

```bash
npm run dev    # http://localhost:3000 기본 페이지 확인 후 Ctrl-C
npm run build
```
Expected: 빌드 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold next.js + tailwind + vitest"
```

---

## Task 2: Supabase client wiring + env

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/middleware.ts`, `.env.example`
- Modify: `.env.local`(로컬 전용, gitignore)

**Interfaces:**
- Produces:
  - `createServerSupabase(): Promise<SupabaseClient>` — `lib/supabase/server.ts` (쿠키 기반, async)
  - `createBrowserSupabase(): SupabaseClient` — `lib/supabase/browser.ts`
  - `updateSession(request: NextRequest): Promise<{ response: NextResponse; user: User | null }>` — `lib/supabase/middleware.ts`

- [ ] **Step 1: Env vars**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
`.env.local`에 Supabase 대시보드(Project Settings → API)의 실제 값을 채운다. `.env*.local`이 `.gitignore`에 있는지 확인.

- [ ] **Step 2: Browser client**

Create `lib/supabase/browser.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Server client**

Create `lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch {
            // Server Component에서 호출 시 무시 — 미들웨어가 세션 갱신
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Middleware session helper**

Create `lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: add supabase server/browser/middleware clients"
```

---

## Task 3: Database schema + RLS

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `supabase/migrations/0002_rls.sql`

**Interfaces:**
- Produces: Postgres 테이블 `seasons, events, blind_structures, blind_structure_rows, navigation_tabs, special_pages, online_league_settings, site_config` 및 enum 타입. 공개 read / 인증 write RLS.

- [ ] **Step 1: Write schema migration**

Create `supabase/migrations/0001_schema.sql`:
```sql
create type season_code as enum ('spring','summer','autumn','winter');
create type event_category as enum ('festival','confirmed','upcoming','completed');
create type event_status as enum ('scheduled','confirmed','running','reg_closed','completed','canceled','hidden');
create type row_type as enum ('level','break','stage');
create type tab_type as enum ('internal','external','special');
create type league_status as enum ('operating','revamping','preparing','suspended','hidden');

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code season_code not null,
  year int not null,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  hero_text text, sub_text text, badge_text text,
  hero_image text, bg_image text, theme_color text,
  footer_sponsor_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.blind_structures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_template boolean not null default false,
  event_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.blind_structure_rows (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.blind_structures(id) on delete cascade,
  row_type row_type not null,
  level_no int,
  sb text, bb text, ante text,
  duration int,
  break_name text, break_minutes int, stage_note text,
  sort_order int not null default 0
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id),
  round text,
  title text not null,
  event_type text,
  date date,
  weekday text,
  location text, address text,
  start_time text, reg_close_time text, end_time text,
  buy_in text,
  entry_link text, button_label text,
  description text,
  poster_image text, sponsor_logo text,
  category event_category not null default 'upcoming',
  status event_status not null default 'scheduled',
  is_visible boolean not null default true,
  sort_order int not null default 0,
  blind_structure_id uuid references public.blind_structures(id),
  timer_event_id text, timer_event_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.navigation_tabs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  type tab_type not null default 'internal',
  slug text, external_url text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  mobile_visible boolean not null default true,
  start_show_date date, end_show_date date,
  home_card_visible boolean not null default false,
  home_card_title text, home_card_desc text, home_card_cta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.special_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text, title text not null, description text,
  date date, venue text, address text, start_time text,
  entry_link text, cta_label text,
  sponsor_name text, sponsor_logo text,
  poster text, gallery jsonb not null default '[]',
  info_cards jsonb not null default '[]',
  note_list jsonb not null default '[]',
  blind_structure_id uuid references public.blind_structures(id),
  start_show_date date, end_show_date date,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.online_league_settings (
  id int primary key default 1 check (id = 1),
  status league_status not null default 'preparing',
  tab_visible boolean not null default true,
  title text, description text, join_guide text,
  steps jsonb not null default '[]',
  links jsonb not null default '{}',
  today_leagues jsonb not null default '[]',
  notice_text text, cta_label text, cta_url text, sheet_url text,
  updated_at timestamptz not null default now()
);

create table public.site_config (
  id int primary key default 1 check (id = 1),
  signup_visible boolean not null default true,
  signup_link text, signup_new_tab boolean not null default true,
  signup_button_label text, signup_closed boolean not null default false,
  signup_closed_text text,
  leaderboard_tab_visible boolean not null default true,
  leaderboard_api_url text, leaderboard_personal_rank_visible boolean not null default true,
  footer_sponsors jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

insert into public.online_league_settings (id) values (1) on conflict do nothing;
insert into public.site_config (id) values (1) on conflict do nothing;

create unique index seasons_one_active on public.seasons (is_active) where is_active and deleted_at is null;
create index events_sort_idx on public.events (sort_order, date);
create index blind_rows_idx on public.blind_structure_rows (structure_id, sort_order);
create index tabs_sort_idx on public.navigation_tabs (sort_order);
```

- [ ] **Step 2: Write RLS migration**

Create `supabase/migrations/0002_rls.sql`:
```sql
-- helper: 인증 사용자 = 관리자 (단일 관리자, 공개 가입 없음)
do $$
declare t text;
begin
  foreach t in array array[
    'seasons','blind_structures','blind_structure_rows','events',
    'navigation_tabs','special_pages','online_league_settings','site_config'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('create policy "auth write %1$s" on public.%1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- 공개 read: 소프트삭제 제외 + 노출 조건
create policy "public read seasons" on public.seasons for select using (deleted_at is null);
create policy "public read blind_structures" on public.blind_structures for select using (deleted_at is null);
create policy "public read blind_rows" on public.blind_structure_rows for select using (true);
create policy "public read events" on public.events for select using (deleted_at is null and is_visible);
create policy "public read tabs" on public.navigation_tabs for select using (deleted_at is null and is_visible);
create policy "public read special" on public.special_pages for select using (deleted_at is null and is_visible);
create policy "public read league" on public.online_league_settings for select using (true);
create policy "public read config" on public.site_config for select using (true);
```

- [ ] **Step 3: Apply to Supabase**

Supabase SQL editor에 `0001_schema.sql` → `0002_rls.sql` 순으로 붙여넣어 실행(또는 CLI `supabase db push`). Table Editor에서 8개 테이블 + 싱글턴 행 2개 확인.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add database schema and rls policies"
```

---

## Task 4: TypeScript types + data-access layer (TDD)

**Files:**
- Create: `lib/types.ts`, `lib/data/seasons.ts`, `lib/data/events.ts`, `lib/data/blindStructures.ts`, `lib/data/tabs.ts`, `lib/data/specialPages.ts`, `lib/data/onlineLeague.ts`, `lib/data/siteConfig.ts`, `test/data-mappers.test.ts`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 2).
- Produces (export):
  - `lib/types.ts`: `Season, Event, BlindStructure, BlindRow, NavTab, SpecialPage, OnlineLeague, SiteConfig` 및 enum 유니온(`SeasonCode, EventCategory, EventStatus, RowType, TabType, LeagueStatus`).
  - `lib/data/seasons.ts`: `mapSeason(row): Season`, `getActiveSeason(): Promise<Season|null>`, `getAllSeasons(): Promise<Season[]>`, `getSeasonById(id): Promise<Season|null>`
  - `lib/data/events.ts`: `mapEvent(row): Event`, `getEvents(opts?: { category?: EventCategory }): Promise<Event[]>`, `getEventById(id): Promise<Event|null>`
  - `lib/data/blindStructures.ts`: `mapStructure(row): BlindStructure`, `mapRow(row): BlindRow`, `getStructureWithRows(id): Promise<{ structure: BlindStructure; rows: BlindRow[] } | null>`, `getAllStructures(): Promise<BlindStructure[]>`
  - `lib/data/tabs.ts`: `mapTab(row): NavTab`, `getVisibleTabs(today: string): Promise<NavTab[]>`, `getAllTabs(): Promise<NavTab[]>`, `isTabActive(tab: NavTab, today: string): boolean`
  - `lib/data/specialPages.ts`: `mapSpecialPage(row): SpecialPage`, `getSpecialPageBySlug(slug): Promise<SpecialPage|null>`, `getAllSpecialPages(): Promise<SpecialPage[]>`
  - `lib/data/onlineLeague.ts`: `getOnlineLeague(): Promise<OnlineLeague>`
  - `lib/data/siteConfig.ts`: `getSiteConfig(): Promise<SiteConfig>`

- [ ] **Step 1: Define types**

Create `lib/types.ts`:
```ts
export type SeasonCode = "spring" | "summer" | "autumn" | "winter";
export type EventCategory = "festival" | "confirmed" | "upcoming" | "completed";
export type EventStatus = "scheduled" | "confirmed" | "running" | "reg_closed" | "completed" | "canceled" | "hidden";
export type RowType = "level" | "break" | "stage";
export type TabType = "internal" | "external" | "special";
export type LeagueStatus = "operating" | "revamping" | "preparing" | "suspended" | "hidden";

export interface Season {
  id: string; name: string; code: SeasonCode; year: number;
  start_date: string | null; end_date: string | null; is_active: boolean;
  hero_text: string | null; sub_text: string | null; badge_text: string | null;
  hero_image: string | null; bg_image: string | null; theme_color: string | null;
  footer_sponsor_visible: boolean;
}
export interface Event {
  id: string; season_id: string | null; round: string | null; title: string;
  event_type: string | null; date: string | null; weekday: string | null;
  location: string | null; address: string | null;
  start_time: string | null; reg_close_time: string | null; end_time: string | null;
  buy_in: string | null; entry_link: string | null; button_label: string | null;
  description: string | null; poster_image: string | null; sponsor_logo: string | null;
  category: EventCategory; status: EventStatus; is_visible: boolean; sort_order: number;
  blind_structure_id: string | null; timer_event_id: string | null; timer_event_url: string | null;
}
export interface BlindStructure { id: string; name: string; is_template: boolean; event_type: string | null; }
export interface BlindRow {
  id: string; structure_id: string; row_type: RowType; level_no: number | null;
  sb: string | null; bb: string | null; ante: string | null; duration: number | null;
  break_name: string | null; break_minutes: number | null; stage_note: string | null; sort_order: number;
}
export interface NavTab {
  id: string; name: string; key: string; type: TabType; slug: string | null; external_url: string | null;
  is_visible: boolean; sort_order: number; mobile_visible: boolean;
  start_show_date: string | null; end_show_date: string | null;
  home_card_visible: boolean; home_card_title: string | null; home_card_desc: string | null; home_card_cta: string | null;
}
export interface SpecialPage {
  id: string; slug: string; label: string | null; title: string; description: string | null;
  date: string | null; venue: string | null; address: string | null; start_time: string | null;
  entry_link: string | null; cta_label: string | null; sponsor_name: string | null; sponsor_logo: string | null;
  poster: string | null; gallery: string[]; info_cards: { label: string; value: string }[]; note_list: string[];
  blind_structure_id: string | null; start_show_date: string | null; end_show_date: string | null; is_visible: boolean;
}
export interface OnlineLeague {
  status: LeagueStatus; tab_visible: boolean; title: string | null; description: string | null;
  join_guide: string | null; steps: string[]; links: Record<string, string>;
  today_leagues: { name: string; time?: string; reg_close?: string; link?: string }[];
  notice_text: string | null; cta_label: string | null; cta_url: string | null; sheet_url: string | null;
}
export interface SiteConfig {
  signup_visible: boolean; signup_link: string | null; signup_new_tab: boolean;
  signup_button_label: string | null; signup_closed: boolean; signup_closed_text: string | null;
  leaderboard_tab_visible: boolean; leaderboard_api_url: string | null; leaderboard_personal_rank_visible: boolean;
  footer_sponsors: { name: string; logo?: string }[];
}
```

- [ ] **Step 2: Write failing tests for pure mappers + `isTabActive`**

Create `test/data-mappers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mapEvent } from "@/lib/data/events";
import { mapRow } from "@/lib/data/blindStructures";
import { isTabActive } from "@/lib/data/tabs";

describe("mapEvent", () => {
  it("normalizes a row and defaults nulls", () => {
    const e = mapEvent({ id: "1", title: "9회차", category: "confirmed", status: "confirmed" });
    expect(e.title).toBe("9회차");
    expect(e.is_visible).toBe(true);
    expect(e.sort_order).toBe(0);
    expect(e.timer_event_id).toBeNull();
  });
});

describe("mapRow (blind row keeps text ante)", () => {
  it("preserves non-numeric ante (PLO)", () => {
    const r = mapRow({ id: "r1", structure_id: "s1", row_type: "level", ante: "없음", sort_order: 2 });
    expect(r.ante).toBe("없음");
    expect(r.sort_order).toBe(2);
  });
});

describe("isTabActive (date-window visibility)", () => {
  const base = { id: "t", name: "챌린지", key: "challenge", type: "special" as const,
    slug: "challenge", external_url: null, is_visible: true, sort_order: 0, mobile_visible: true,
    home_card_visible: false, home_card_title: null, home_card_desc: null, home_card_cta: null };
  it("hidden after end_show_date", () => {
    expect(isTabActive({ ...base, start_show_date: "2026-07-01", end_show_date: "2026-07-20" }, "2026-07-21")).toBe(false);
  });
  it("visible inside window", () => {
    expect(isTabActive({ ...base, start_show_date: "2026-07-01", end_show_date: "2026-07-20" }, "2026-07-10")).toBe(true);
  });
  it("visible when no window set", () => {
    expect(isTabActive({ ...base, start_show_date: null, end_show_date: null }, "2026-07-10")).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- data-mappers`
Expected: FAIL (module not found / not a function).

- [ ] **Step 4: Implement mappers + data access**

각 `lib/data/*.ts`를 구현한다. 패턴은 동일 — `mapX`는 순수 normalizer, 조회 함수는 `createServerSupabase()`로 쿼리 후 `mapX`로 매핑. 아래는 핵심 파일들의 전체 코드.

`lib/data/events.ts`:
```ts
import { createServerSupabase } from "@/lib/supabase/server";
import type { Event, EventCategory } from "@/lib/types";

export function mapEvent(r: any): Event {
  return {
    id: String(r.id ?? ""), season_id: r.season_id ?? null, round: r.round ?? null,
    title: String(r.title ?? ""), event_type: r.event_type ?? null, date: r.date ?? null,
    weekday: r.weekday ?? null, location: r.location ?? null, address: r.address ?? null,
    start_time: r.start_time ?? null, reg_close_time: r.reg_close_time ?? null, end_time: r.end_time ?? null,
    buy_in: r.buy_in ?? null, entry_link: r.entry_link ?? null, button_label: r.button_label ?? null,
    description: r.description ?? null, poster_image: r.poster_image ?? null, sponsor_logo: r.sponsor_logo ?? null,
    category: (r.category ?? "upcoming") as EventCategory, status: (r.status ?? "scheduled"),
    is_visible: r.is_visible ?? true, sort_order: Number(r.sort_order ?? 0),
    blind_structure_id: r.blind_structure_id ?? null,
    timer_event_id: r.timer_event_id ?? null, timer_event_url: r.timer_event_url ?? null,
  };
}

export async function getEvents(opts?: { category?: EventCategory }): Promise<Event[]> {
  const supabase = await createServerSupabase();
  let q = supabase.from("events").select("*").is("deleted_at", null).eq("is_visible", true);
  if (opts?.category) q = q.eq("category", opts.category);
  const { data, error } = await q.order("sort_order", { ascending: true }).order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data ? mapEvent(data) : null;
}
```

`lib/data/blindStructures.ts`:
```ts
import { createServerSupabase } from "@/lib/supabase/server";
import type { BlindStructure, BlindRow, RowType } from "@/lib/types";

export function mapStructure(r: any): BlindStructure {
  return { id: String(r.id ?? ""), name: String(r.name ?? ""), is_template: Boolean(r.is_template), event_type: r.event_type ?? null };
}
export function mapRow(r: any): BlindRow {
  return {
    id: String(r.id ?? ""), structure_id: String(r.structure_id ?? ""), row_type: (r.row_type ?? "level") as RowType,
    level_no: r.level_no ?? null, sb: r.sb ?? null, bb: r.bb ?? null, ante: r.ante ?? null,
    duration: r.duration ?? null, break_name: r.break_name ?? null, break_minutes: r.break_minutes ?? null,
    stage_note: r.stage_note ?? null, sort_order: Number(r.sort_order ?? 0),
  };
}
export async function getAllStructures(): Promise<BlindStructure[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("blind_structures").select("*").is("deleted_at", null).order("name");
  if (error) throw error;
  return (data ?? []).map(mapStructure);
}
export async function getStructureWithRows(id: string) {
  const supabase = await createServerSupabase();
  const { data: s } = await supabase.from("blind_structures").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!s) return null;
  const { data: rows } = await supabase.from("blind_structure_rows").select("*").eq("structure_id", id).order("sort_order");
  return { structure: mapStructure(s), rows: (rows ?? []).map(mapRow) };
}
```

`lib/data/tabs.ts`:
```ts
import { createServerSupabase } from "@/lib/supabase/server";
import type { NavTab, TabType } from "@/lib/types";

export function mapTab(r: any): NavTab {
  return {
    id: String(r.id ?? ""), name: String(r.name ?? ""), key: String(r.key ?? ""),
    type: (r.type ?? "internal") as TabType, slug: r.slug ?? null, external_url: r.external_url ?? null,
    is_visible: r.is_visible ?? true, sort_order: Number(r.sort_order ?? 0), mobile_visible: r.mobile_visible ?? true,
    start_show_date: r.start_show_date ?? null, end_show_date: r.end_show_date ?? null,
    home_card_visible: Boolean(r.home_card_visible), home_card_title: r.home_card_title ?? null,
    home_card_desc: r.home_card_desc ?? null, home_card_cta: r.home_card_cta ?? null,
  };
}
export function isTabActive(tab: NavTab, today: string): boolean {
  if (!tab.is_visible) return false;
  if (tab.start_show_date && today < tab.start_show_date) return false;
  if (tab.end_show_date && today > tab.end_show_date) return false;
  return true;
}
export async function getAllTabs(): Promise<NavTab[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("navigation_tabs").select("*").is("deleted_at", null).order("sort_order");
  if (error) throw error;
  return (data ?? []).map(mapTab);
}
export async function getVisibleTabs(today: string): Promise<NavTab[]> {
  return (await getAllTabs()).filter((t) => isTabActive(t, today));
}
```

`lib/data/seasons.ts`, `lib/data/specialPages.ts`, `lib/data/onlineLeague.ts`, `lib/data/siteConfig.ts`도 동일 패턴으로 구현:
- `mapSeason`/`mapSpecialPage`는 위 인터페이스의 모든 필드를 `?? null` 또는 기본값으로 normalize. `special_pages`의 `gallery/info_cards/note_list`는 `Array.isArray(r.x) ? r.x : []`.
- `getActiveSeason()`: `.eq("is_active", true).is("deleted_at", null).maybeSingle()`.
- `getSpecialPageBySlug(slug)`: `.eq("slug", slug).is("deleted_at", null).eq("is_visible", true).maybeSingle()`.
- `getOnlineLeague()`/`getSiteConfig()`: `.eq("id", 1).single()` 후 normalize, 없으면 기본 객체 반환.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- data-mappers`
Expected: PASS (5 tests).

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: add types and typed data-access layer with tests"
```

---

## Task 5: Codify dark design tokens (from design-capture.md)

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`

**Interfaces:**
- Produces: Tailwind 다크 테마 토큰(`colors.bg`, `colors.gold`, `colors.coral.*`, `fontFamily.sans`, `borderRadius`)과 `:root`/`body` CSS 변수. Task 6–18가 소비.

> **출처:** 라이브 캡처는 이미 완료되어 `docs/superpowers/design-capture.md`(검증 완료)에 실측값이 있다. 별도 브라우저 캡처 없이 이 문서 §6.1(다크 테마 토큰)을 코드화한다.

- [ ] **Step 1: Read design-capture.md**

`docs/superpowers/design-capture.md` §6.1(다크 토큰) + §2(타이포)를 읽고 적용할 값을 확정: 배경 `#0A0908`, 텍스트 `#FFFFFF`, 음소거 화이트 알파 단계(`.75/.62/.52/.44`), 골드 `#FFE58A`, 코럴 그라데이션 `#D94B45→#F08B6F`, 글래스 카드 `rgba(255,255,255,.04)`, pill `999px`/카드 radius `24px`, 폰트 `Inter`(+한글 폴백).

- [ ] **Step 2: Codify Tailwind tokens**

`tailwind.config.ts` `theme.extend`에 추가:
```ts
extend: {
  colors: {
    bg: "#0A0908",
    ink: "#FFFFFF",
    gold: "#FFE58A",
    coral: { from: "#D94B45", to: "#F08B6F" },
    glass: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.10)",
  },
  borderRadius: { card: "24px", pill: "999px" },
  fontFamily: { sans: ["var(--font-inter)", "Wanted Sans", "Pretendard", "system-ui", "sans-serif"] },
  backgroundImage: { "coral-cta": "linear-gradient(90deg,#D94B45,#F08B6F)" },
}
```

- [ ] **Step 3: Global dark base + CSS vars**

`app/globals.css`의 `@tailwind` 다음에 추가:
```css
:root {
  --color-bg: #0A0908; --color-ink: #FFFFFF; --color-gold: #FFE58A;
  --muted-1: rgba(255,255,255,.75); --muted-2: rgba(255,255,255,.62);
  --muted-3: rgba(255,255,255,.52); --muted-4: rgba(255,255,255,.44);
}
body { background: var(--color-bg); color: var(--color-ink); }
```
(기존 스캐폴드의 라이트 배경/`Arial` 등 화이트 잔재 제거.)

- [ ] **Step 4: Wire Inter font in layout**

`app/layout.tsx`에서 `next/font/google`의 Inter를 `variable: "--font-inter"`로 로드해 `<html>` 또는 `<body>`에 className 적용. `<html lang="ko">` 유지. (한글 폴백은 CSS 폴백 체인으로 처리; Wanted Sans 웹폰트 추가는 후속.)

- [ ] **Step 5: Verify build**

`npm run build` 성공 확인(다크 base 적용). `npx tsc --noEmit` exit 0.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: codify dark design tokens from design-capture"
```

---

## Task 6: Root layout + Header + Footer + dynamic Nav

**Files:**
- Create: `components/site/Header.tsx`, `components/site/Footer.tsx`, `components/site/Nav.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `getVisibleTabs` (Task 4), `getSiteConfig` (Task 4), 디자인 토큰 (Task 5).
- Produces: 레이아웃에 `<Header />`(내부 `<Nav />`)와 `<Footer />` 렌더.

- [ ] **Step 1: Build Nav (server component)**

Create `components/site/Nav.tsx` — `getVisibleTabs(today)` 결과로 상단 메뉴 렌더. `type==='internal'`은 내부 경로(`/schedule` 등 key→path 매핑), `external`은 `external_url`(target=_blank), `special`은 `/${slug}`. `today`는 서버에서 `new Date().toISOString().slice(0,10)`.

```tsx
import Link from "next/link";
import { getVisibleTabs } from "@/lib/data/tabs";

const INTERNAL_PATH: Record<string, string> = {
  schedule: "/schedule", "online-league": "/online-league", leaderboard: "/leaderboard",
};

export async function Nav() {
  const today = new Date().toISOString().slice(0, 10);
  const tabs = await getVisibleTabs(today);
  return (
    <nav className="flex items-center gap-4 text-sm">
      {tabs.map((t) => {
        const href = t.type === "external" ? (t.external_url ?? "#")
          : t.type === "special" ? `/${t.slug}` : (INTERNAL_PATH[t.key] ?? `/${t.key}`);
        const ext = t.type === "external";
        return <Link key={t.id} href={href} target={ext ? "_blank" : undefined}
          className={t.mobile_visible ? "" : "hidden sm:inline"}>{t.name}</Link>;
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Build Header + Footer (dark)**

Create `components/site/Header.tsx` — 로고(→`/`) + `<Nav />`, **다크 테마**(`bg-bg text-ink`, 골드 액센트). 디렉토리 헤더(로고 + "카테고리별 보기": `/poker`/`/social`/`/others`)를 기본으로 한다. Create `components/site/Footer.tsx` — `getSiteConfig()`의 `footer_sponsors`(OFFICIAL SPONSOR) + "© Donuts Poker Club" 브랜드 라인, 다크 스타일.

> 시리즈 마이크로사이트(`/series`, `/schedule` 등) 전용 서브내비(일정·리더보드·온라인 리그·챌린지·가입신청)는 Task 8에서 `components/series/SeriesNav.tsx`로 별도 구성한다(골드 라벨 패턴).

- [ ] **Step 3: Wire into layout**

`app/layout.tsx`: `<Header />` → `<main className="mx-auto max-w-5xl px-4">{children}</main>` → `<Footer />`.

- [ ] **Step 4: Verify + commit**

`npm run dev`로 헤더/푸터/탭이 라이브와 유사한지 확인. `npm run build`. 그 후:
```bash
git add -A && git commit -m "feat: add header, footer, and db-driven nav"
```

---

## Task 7: Schedule presentation components (TDD)

**Files:**
- Create: `components/schedule/StatusBadge.tsx`, `components/schedule/EventCard.tsx`, `components/schedule/BlindStructureTable.tsx`, `test/status-badge.test.tsx`

**Interfaces:**
- Consumes: `Event, EventStatus, BlindRow` (Task 4), 토큰 (Task 5).
- Produces: `<StatusBadge status={EventStatus} />`, `<EventCard event={Event} />`(→`/schedule/[id]`), `<BlindStructureTable rows={BlindRow[]} />`.

- [ ] **Step 1: Write failing test for StatusBadge**

Create `test/status-badge.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "@/components/schedule/StatusBadge";

describe("StatusBadge", () => {
  it("confirmed → 확정", () => { render(<StatusBadge status="confirmed" />); expect(screen.getByText("확정")).toBeInTheDocument(); });
  it("running → 진행중", () => { render(<StatusBadge status="running" />); expect(screen.getByText("진행중")).toBeInTheDocument(); });
  it("completed → 완료", () => { render(<StatusBadge status="completed" />); expect(screen.getByText("완료")).toBeInTheDocument(); });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- status-badge`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement StatusBadge**

Create `components/schedule/StatusBadge.tsx`:
```tsx
import type { EventStatus } from "@/lib/types";

const LABEL: Record<EventStatus, string> = {
  scheduled: "예정", confirmed: "확정", running: "진행중", reg_closed: "레지마감",
  completed: "완료", canceled: "취소", hidden: "숨김",
};
const STYLE: Record<EventStatus, string> = {
  scheduled: "bg-amber-100 text-amber-800", confirmed: "bg-brand text-white",
  running: "bg-red-600 text-white", reg_closed: "bg-gray-300 text-gray-700",
  completed: "bg-gray-200 text-gray-600", canceled: "bg-gray-100 text-gray-400", hidden: "bg-gray-100 text-gray-400",
};
export function StatusBadge({ status }: { status: EventStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>{LABEL[status]}</span>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- status-badge`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement EventCard + BlindStructureTable**

Create `components/schedule/EventCard.tsx` — `Link href={\`/schedule/${event.id}\`}`, 포스터(있으면 `next/image`), 제목, `<StatusBadge>`, 메타(장소·날짜·참가비). 완료 이벤트는 `COMPLETED` 느낌의 카드(클릭 가능 아카이브).
Create `components/schedule/BlindStructureTable.tsx` — `rows`를 테이블로: level 행은 레벨/SB/BB/Ante/Time, break 행은 break_name+minutes, stage 행은 stage_note(colspan). `ante`는 문자열 그대로 출력.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add schedule presentation components"
```

---

## Task 8: Series microsite landing + schedule pages (dark)

**Files:**
- Create: `components/series/SeriesNav.tsx`, `components/schedule/CategoryFilter.tsx`
- Modify/Create: `app/series/page.tsx`, `app/schedule/page.tsx`, `app/schedule/[id]/page.tsx`

**Interfaces:**
- Consumes: `getActiveSeason, getEvents, getEventById, getStructureWithRows` (Task 4); `EventCard, BlindStructureTable, StatusBadge` (Task 7).
- Produces: `/series`, `/schedule`, `/schedule/[id]` 라우트(ISR). `<SeriesNav />`.

> 주의: 최상위 `/`(디렉토리 홈)는 Task 18에서 만든다. 여기서는 **시리즈 마이크로사이트 홈 `/series`** 를 만든다.

- [ ] **Step 1: SeriesNav**

Create `components/series/SeriesNav.tsx` — 시리즈 서브내비: 일정(`/schedule`)·리더보드(`/leaderboard`)·온라인 리그(`/online-league`)·챌린지(`/challenge`)·가입신청(외부 `site_config.signup_link`, 새 탭). 다크+골드 라벨 패턴.

- [ ] **Step 2: Series landing `/series`**

`app/series/page.tsx` (`export const revalidate = 300;`): `getActiveSeason()` 히어로 — 골드 pill 배지(`badge_text`, 예: "DONUTS SERIES 2026 · SPRING SEASON") + 골드 타이틀(`hero_text`) + 부제(`sub_text`) + 코럴 CTA(일정 확인하기 → `/schedule`) + 아웃라인 CTA(가입 신청하기 → signup_link). 활성 시즌 없으면 기본 fallback 문구. 하단 SCHEDULE/LEADERBOARD/ONLINE LEAGUE 카드 + 스폰서 푸터. `<SeriesNav />` 포함.

- [ ] **Step 3: Schedule list + category filter**

Create `components/schedule/CategoryFilter.tsx` (client) — 카테고리(전체/페스티벌/확정/예정/완료) 버튼으로 in-memory 필터.
`app/schedule/page.tsx` (`revalidate = 300`): `getEvents()` 후 `<CategoryFilter events={...} />`에 전달, `<EventCard>` 그리드. `<SeriesNav />` 포함. 다크 테마.

- [ ] **Step 4: Event detail**

`app/schedule/[id]/page.tsx` (`revalidate = 300`): `getEventById(id)`(없으면 `notFound()`), 메타/장소/시간/참가비(포인트 표기)/참가 버튼 + `blind_structure_id` 있으면 `getStructureWithRows` → `<BlindStructureTable>`(SB/BB/Ante/Time, PLO 텍스트). `generateMetadata`로 title/description/OG. 완료 이벤트면 아카이브 레이아웃. (타이머 실시간/결과 수치는 후속 — 표시 안 함.)

- [ ] **Step 5: Verify + commit**

`npx tsc --noEmit` 통과(Supabase 미프로비저닝이라 DB 호출 페이지의 `npm run dev`/`build` 검증은 자격증명 확보 후로 보류 — 보류 사실을 보고). 그 후:
```bash
git add -A && git commit -m "feat: add series landing and schedule pages (dark)"
```

---

## Task 9: Public online-league + leaderboard + special pages

**Files:**
- Create: `components/league/LeagueStatusBlock.tsx`, `components/special/SpecialPageView.tsx`
- Modify: `app/online-league/page.tsx`, `app/leaderboard/page.tsx`, `app/[tabSlug]/page.tsx`

**Interfaces:**
- Consumes: `getOnlineLeague, getSiteConfig, getSpecialPageBySlug, getAllSpecialPages, getStructureWithRows` (Task 4); `BlindStructureTable` (Task 7).
- Produces: `/online-league`, `/leaderboard`, `/[tabSlug]` 라우트.

- [ ] **Step 1: Online league**

Create `components/league/LeagueStatusBlock.tsx` — `status`별 분기: `operating`이면 오늘의 리그/참가링크/CTA, `revamping`/`preparing`/`suspended`면 해당 안내 박스, `hidden`이면 아무것도 렌더 안 함.
`app/online-league/page.tsx` (`revalidate = 300`): `getOnlineLeague()` → `<LeagueStatusBlock league={...} />`.

- [ ] **Step 2: Leaderboard**

`app/leaderboard/page.tsx` (`revalidate = 300`): `getSiteConfig()` — `leaderboard_tab_visible` false면 `notFound()`. `leaderboard_api_url` 있으면 fetch해 순위 표 렌더(없거나 실패 시 "준비중" fallback). `leaderboard_personal_rank_visible`에 따라 개인 순위 열 토글.

- [ ] **Step 3: Special pages (dynamic tab)**

Create `components/special/SpecialPageView.tsx` — `SpecialPage`를 후원/챌린지 템플릿 레이아웃(타이틀/설명/info_cards 그리드/포스터+갤러리/note_list/CTA + blind structure)으로 렌더.
`app/[tabSlug]/page.tsx` (`revalidate = 300`): `getSpecialPageBySlug(slug)` — 없으면 `notFound()`. 기간 노출 검사: `today < start_show_date || today > end_show_date`면 `notFound()`(자동 숨김). `generateStaticParams`로 `getAllSpecialPages()` slug 생성.

- [ ] **Step 4: Verify + commit**

`npm run dev`로 `/online-league`(상태 변경 시 분기), 임의 special slug, 기간 지난 slug(404) 확인. `npm run build`. 그 후:
```bash
git add -A && git commit -m "feat: add online-league, leaderboard, and special pages"
```

---

## Task 10: SEO + admin auth + route protection

**Files:**
- Create: `app/sitemap.ts`, `app/robots.ts`, `middleware.ts`, `app/admin/login/page.tsx`, `app/admin/layout.tsx`, `lib/revalidate.ts`

**Interfaces:**
- Consumes: `updateSession` (Task 2), `createBrowserSupabase` (Task 2), `getEvents, getAllSpecialPages` (Task 4).
- Produces: `/admin/*` 인증 가드(미인증→`/admin/login`); `revalidatePublic(paths: string[])` from `lib/revalidate.ts`; sitemap/robots.

- [ ] **Step 1: sitemap + robots**

Create `app/sitemap.ts`:
```ts
import type { MetadataRoute } from "next";
import { getEvents } from "@/lib/data/events";
import { getAllSpecialPages } from "@/lib/data/specialPages";
import { getPrograms } from "@/lib/data/programs";

const BASE = "https://do-nuts.kr";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, specials, programs] = await Promise.all([getEvents(), getAllSpecialPages(), getPrograms()]);
  return [
    { url: BASE, priority: 1 }, { url: `${BASE}/programs`, priority: 0.8 },
    { url: `${BASE}/poker`, priority: 0.5 }, { url: `${BASE}/social`, priority: 0.5 }, { url: `${BASE}/others`, priority: 0.4 },
    { url: `${BASE}/series`, priority: 0.9 }, { url: `${BASE}/schedule`, priority: 0.8 },
    { url: `${BASE}/online-league`, priority: 0.6 }, { url: `${BASE}/leaderboard`, priority: 0.5 },
    ...programs.map((p) => ({ url: `${BASE}/programs/${p.slug}`, priority: 0.6 })),
    ...events.map((e) => ({ url: `${BASE}/schedule/${e.id}`, priority: 0.6 })),
    ...specials.map((s) => ({ url: `${BASE}/${s.slug}`, priority: 0.6 })),
  ];
}
```
Create `app/robots.ts`:
```ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/admin" }, sitemap: "https://do-nuts.kr/sitemap.xml" };
}
```

- [ ] **Step 2: revalidate helper**

Create `lib/revalidate.ts`:
```ts
import { revalidatePath } from "next/cache";
export function revalidatePublic(paths: string[] = []) {
  ["/", "/schedule", "/online-league", "/leaderboard", ...paths].forEach((p) => revalidatePath(p));
}
```

- [ ] **Step 3: middleware guard**

Create `middleware.ts`:
```ts
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return response;
}
export const config = { matcher: ["/admin/:path*"] };
```

- [ ] **Step 4: login page + admin layout**

Create `app/admin/login/page.tsx` (client) — `createBrowserSupabase().auth.signInWithPassword({email,password})` 성공 시 `router.push("/admin")`.
Create `app/admin/layout.tsx` (server) — 어드민 네비(시즌/일정/스트럭처/리그/탭/특수페이지/설정 링크) + 로그아웃.

- [ ] **Step 5: Create admin user**

Supabase 대시보드 → Authentication → Users → Add user로 운영자 이메일/비번 생성(공개 가입 없음).

- [ ] **Step 6: Verify + commit**

`npm run dev`: 로그아웃 상태 `/admin` → `/admin/login` 리다이렉트, 로그인 후 `/admin` 도달. `npm run build`. 그 후:
```bash
git add -A && git commit -m "feat: add seo, admin auth, and route protection"
```

---

## Task 11: Admin — seasons + events CRUD (server actions)

**Files:**
- Create: `app/admin/actions/seasons.ts`, `app/admin/actions/events.ts`, `components/admin/SeasonForm.tsx`, `components/admin/EventForm.tsx`, `components/admin/DeleteButton.tsx`, `app/admin/page.tsx`, `app/admin/seasons/page.tsx`, `app/admin/seasons/new/page.tsx`, `app/admin/seasons/[id]/edit/page.tsx`, `app/admin/events/page.tsx`, `app/admin/events/new/page.tsx`, `app/admin/events/[id]/edit/page.tsx`, `test/event-form.test.tsx`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 2); `getAllSeasons, getSeasonById, getEvents, getEventById, getActiveSeason` (Task 4); `getAllStructures` (Task 4); `revalidatePublic` (Task 10).
- Produces:
  - `app/admin/actions/seasons.ts`: `createSeason(fd)`, `updateSeason(id, fd)`, `deleteSeason(id)`, `activateSeason(id)`
  - `app/admin/actions/events.ts`: `createEvent(fd)`, `updateEvent(id, fd)`, `deleteEvent(id)`
  - `<SeasonForm season?={Season} action={(fd)=>void} />`, `<EventForm event?={Event} structures={BlindStructure[]} action={(fd)=>void} />`, `<DeleteButton onDelete={()=>void} />`

- [ ] **Step 1: Failing test for EventForm fields**

Create `test/event-form.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EventForm } from "@/components/admin/EventForm";

describe("EventForm", () => {
  it("renders core fields", () => {
    render(<EventForm structures={[]} action={async () => {}} />);
    expect(screen.getByLabelText("이벤트명")).toBeInTheDocument();
    expect(screen.getByLabelText("카테고리")).toBeInTheDocument();
    expect(screen.getByLabelText("상태")).toBeInTheDocument();
    expect(screen.getByLabelText("타이머 이벤트 ID")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- event-form`
Expected: FAIL (module not found).

- [ ] **Step 3: Build forms**

Create `components/admin/EventForm.tsx` (client) — label이 붙은 입력: 이벤트명(title), 시즌(select season_id), 회차(round), 이벤트 타입(event_type), 카테고리(select: 페스티벌/확정/예정/완료), 상태(select: 위 7개), 날짜/요일, 장소/주소, 시작/레지마감/종료 시간, 참가비, 참가링크/버튼문구, 설명(textarea), 블라인드 스트럭처(select structures), **타이머 이벤트 ID**(timer_event_id), 타이머 URL(timer_event_url), 노출여부(checkbox), 노출순서(sort_order). 각 input `name`은 DB 컬럼과 일치. 편집 시 `event`로 prefill. `<form action={action}>`.
Create `components/admin/SeasonForm.tsx` — name/code(select)/year/기간/문구/이미지/테마색/푸터스폰서 필드.
Create `components/admin/DeleteButton.tsx` (client) — confirm 없이(브라우저 모달 회피) 작은 폼 submit로 `onDelete` 호출.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- event-form`
Expected: PASS.

- [ ] **Step 5: Server actions**

Create `app/admin/actions/events.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePublic } from "@/lib/revalidate";

function parse(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    season_id: s("season_id"), round: s("round"), title: String(fd.get("title")),
    event_type: s("event_type"), date: s("date"), weekday: s("weekday"),
    location: s("location"), address: s("address"),
    start_time: s("start_time"), reg_close_time: s("reg_close_time"), end_time: s("end_time"),
    buy_in: s("buy_in"), entry_link: s("entry_link"), button_label: s("button_label"),
    description: s("description"), category: String(fd.get("category") || "upcoming"),
    status: String(fd.get("status") || "scheduled"), is_visible: fd.get("is_visible") === "on",
    sort_order: Number(fd.get("sort_order") || 0), blind_structure_id: s("blind_structure_id"),
    timer_event_id: s("timer_event_id"), timer_event_url: s("timer_event_url"),
  };
}
export async function createEvent(fd: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").insert(parse(fd));
  if (error) throw error;
  revalidatePublic(); redirect("/admin/events");
}
export async function updateEvent(id: string, fd: FormData) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").update(parse(fd)).eq("id", id);
  if (error) throw error;
  revalidatePublic([`/schedule/${id}`]); redirect("/admin/events");
}
export async function deleteEvent(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePublic([`/schedule/${id}`]); redirect("/admin/events");
}
```
Create `app/admin/actions/seasons.ts` — `createSeason`/`updateSeason`은 동일 패턴. `deleteSeason`은 `deleted_at` 설정. `activateSeason(id)`은 `update({is_active:false}).neq("id",id)` 후 `update({is_active:true}).eq("id",id)`, 그다음 `revalidatePublic()`.

- [ ] **Step 6: Admin dashboard + season/event pages**

`app/admin/page.tsx` — 각 관리 섹션으로의 카드 링크 + 현재 활성 시즌 표시.
`app/admin/seasons/page.tsx` — 시즌 표(활성 토글 = `activateSeason`, 수정 링크) + 새 시즌 버튼.
`app/admin/seasons/new/page.tsx` — `<SeasonForm action={createSeason} />`.
`app/admin/seasons/[id]/edit/page.tsx` — `getSeasonById` 후 `<SeasonForm season={...} action={updateSeason.bind(null,id)} />` + `<DeleteButton onDelete={deleteSeason.bind(null,id)} />`.
`app/admin/events/page.tsx` — 이벤트 표(제목/카테고리/상태/노출/수정). `app/admin/events/new/page.tsx`/`[id]/edit/page.tsx`는 `getAllStructures()`를 받아 `<EventForm structures={...} action={...} />`.

- [ ] **Step 7: Verify end-to-end + commit**

`npm run dev` 로그인 후: 시즌 생성→활성화→홈 반영, 이벤트 생성→`/schedule` 반영, 수정/소프트삭제 확인. `npm run build`. 그 후:
```bash
git add -A && git commit -m "feat: add admin seasons and events crud"
```

---

## Task 12: Admin — blind structure editor + league + tabs + special + settings

**Files:**
- Create: `app/admin/actions/blindStructures.ts`, `app/admin/actions/tabs.ts`, `app/admin/actions/specialPages.ts`, `app/admin/actions/onlineLeague.ts`, `app/admin/actions/siteConfig.ts`, `components/admin/BlindStructureEditor.tsx`, `components/admin/TabForm.tsx`, `components/admin/SpecialPageForm.tsx`, `app/admin/blind-structures/page.tsx`, `app/admin/blind-structures/[id]/edit/page.tsx`, `app/admin/online-league/page.tsx`, `app/admin/tabs/page.tsx`, `app/admin/tabs/[id]/edit/page.tsx`, `app/admin/special-pages/page.tsx`, `app/admin/special-pages/new/page.tsx`, `app/admin/special-pages/[id]/edit/page.tsx`, `app/admin/settings/page.tsx`, `test/blind-editor.test.tsx`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 2); 각 data-access 조회 (Task 4); `revalidatePublic` (Task 10).
- Produces: 스트럭처/탭/특수페이지/리그/설정 server actions + 관리 화면.

- [ ] **Step 1: Failing test for blind row add/remove logic**

Create `test/blind-editor.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BlindStructureEditor } from "@/components/admin/BlindStructureEditor";

describe("BlindStructureEditor", () => {
  it("adds a level row when '레벨 추가' clicked", () => {
    render(<BlindStructureEditor structureId="s1" initialRows={[]} action={async () => {}} />);
    fireEvent.click(screen.getByText("레벨 추가"));
    expect(screen.getAllByPlaceholderText("Ante").length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- blind-editor`
Expected: FAIL (module not found).

- [ ] **Step 3: Build BlindStructureEditor**

Create `components/admin/BlindStructureEditor.tsx` (client) — `initialRows` 상태 관리. "레벨 추가"/"브레이크 추가"/"스테이지 추가" 버튼으로 행 추가, 행별 삭제/위아래 이동, level 행은 level_no/SB/BB/`placeholder="Ante"`(text)/Time 입력. 저장 시 행 배열을 hidden input(JSON) 또는 `action`에 직렬화해 전달. 기존 스트럭처 복제 버튼 포함.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- blind-editor`
Expected: PASS.

- [ ] **Step 5: Server actions (structures/tabs/special/league/config)**

각 `app/admin/actions/*.ts` 구현. 공통: `createServerSupabase` + insert/update + 소프트삭제 + `revalidatePublic()`.
- `blindStructures.ts`: `saveStructure(id|null, name, rows[])` — structure upsert 후 기존 rows 삭제 후 일괄 insert(`sort_order` 재부여). `ante`는 text 그대로 저장.
- `tabs.ts`: `createTab/updateTab/deleteTab` — `key`/`type`/`slug`/노출/순서/기간노출/홈카드 필드.
- `specialPages.ts`: `createSpecialPage/updateSpecialPage/deleteSpecialPage` — `gallery/info_cards/note_list`는 JSON 파싱해 저장.
- `onlineLeague.ts`: `updateOnlineLeague(fd)` — id=1 행 update(`status`/콘텐츠/`steps`/`links`/`today_leagues` JSON). `revalidatePublic(["/online-league"])`.
- `siteConfig.ts`: `updateSiteConfig(fd)` — id=1 행 update. `revalidatePublic(["/leaderboard"])`.

- [ ] **Step 6: Build admin pages**

- `app/admin/blind-structures/page.tsx` — 스트럭처 목록 + 새로 만들기/복제. `[id]/edit` — `getStructureWithRows` 후 `<BlindStructureEditor>`.
- `app/admin/online-league/page.tsx` — `getOnlineLeague()` prefill, 상태 select + 콘텐츠 폼 → `updateOnlineLeague`.
- `app/admin/tabs/page.tsx` + `[id]/edit` — 탭 목록(노출/순서/기간) + `<TabForm>`.
- `app/admin/special-pages/page.tsx` + `new` + `[id]/edit` — `<SpecialPageForm>`(create/update).
- `app/admin/settings/page.tsx` — `getSiteConfig()` prefill, 가입신청/리더보드/푸터 폼 → `updateSiteConfig`.
Create `components/admin/TabForm.tsx`, `components/admin/SpecialPageForm.tsx` — 각 인터페이스 필드를 label 붙여 렌더, 편집 시 prefill.

- [ ] **Step 7: Verify end-to-end + commit**

`npm run dev` 로그인 후: 스트럭처 생성(레벨/브레이크/PLO Ante="없음")→이벤트에 연결→`/schedule/[id]` 테이블 반영; 리그 상태 변경→공개 반영; 탭 생성+기간노출 종료일 과거→공개 자동 숨김; 특수페이지 생성→`/[slug]` 노출; 설정 변경→반영. `npm run build`. 그 후:
```bash
git add -A && git commit -m "feat: add admin blind editor, league, tabs, special pages, settings"
```

---

## Task 13: Image upload (Supabase Storage)

**Files:**
- Modify: `components/admin/EventForm.tsx`, `components/admin/SeasonForm.tsx`, `components/admin/SpecialPageForm.tsx`, `app/admin/actions/events.ts`, `app/admin/actions/seasons.ts`, `app/admin/actions/specialPages.ts`, `next.config.ts`
- Supabase: `media` 버킷(public) 생성

**Interfaces:**
- Consumes: 서버 Supabase 클라이언트 (Task 2); 각 form action (Task 11/12).
- Produces: 업로드된 public URL을 `poster_image`/`hero_image`/`poster` 등에 저장.

- [ ] **Step 1: Create bucket**

Supabase → Storage → `media` 버킷 생성(public). 인증 업로드 허용 정책 추가.

- [ ] **Step 2: File input + upload handling**

각 form에 `<input type="file" name="<col>_file" accept="image/*" />` 추가. 각 action에서 파일 있으면 업로드 후 URL을 컬럼에 반영. 공통 헬퍼 `lib/upload.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
export async function uploadIfPresent(supabase: SupabaseClient, fd: FormData, field: string, existing: string | null) {
  const file = fd.get(`${field}_file`) as File | null;
  if (!file || file.size === 0) return existing;
  const path = `${field}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
```
각 action에서 insert/update 전에 호출해 해당 이미지 컬럼 값을 채운다(편집 시 hidden `<col>_existing`로 기존값 보존).

- [ ] **Step 3: Allow image host**

`next.config.ts`의 `images.remotePatterns`에 Supabase Storage 호스트(`*.supabase.co`) 추가.

- [ ] **Step 4: Verify + commit**

`npm run dev`로 이벤트/시즌/특수페이지에 이미지 업로드 → 카드/상세/홈에 표시 확인. `npm run build`. 그 후:
```bash
git add -A && git commit -m "feat: add image upload to supabase storage"
```

---

## Task 14: Migration seed from live site

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: 스키마 (Task 3); 캡처 자료 (Task 5).
- Produces: 라이브 사이트 데이터를 재현하는 seed.

- [ ] **Step 1: Capture live content**

Task 5 캡처를 토대로(필요 시 브라우저 확장으로 재방문) 마이그레이션 대상(PDF 15절)을 수집: 현재 시즌, 전체 일정(확정/예정/완료), 포커 페스티벌, 장소·참가링크, 이벤트 타입별 스트럭처/문구, 온라인 리그 안내·개편중 상태, 챌린지 내용·포스터, 메뉴 탭, 리더보드 API 설정, 가입신청 링크, 스폰서 로고.

- [ ] **Step 2: Write seed.sql**

Create `supabase/seed.sql` — 수집한 값으로 `seasons`(활성 1개), `blind_structures`+`rows`(이벤트 타입별), `events`, `navigation_tabs`(현 메뉴), `special_pages`(챌린지), `online_league_settings`(id=1 update, 현재 `status='revamping'` 개편중), `site_config`(id=1 update; 가입신청 구글폼 링크 `forms.gle/6kBtHMZNZJLjn8up6`, 리더보드) insert/update. 그리고 **`programs` 디렉토리**: 캡처 §4의 프로그램 카드(도너츠 시리즈[`external_url='/series'`, is_hot], 홀덤연구소, WPL 마스터스, 외대 주간, 소셜전략게임, 문래/서울대/부산/신림 모임 등) + 제휴 파트너(포커루루·맥스홀덤 라운지·DO:LAB, `is_affiliate=true` + `external_url`)를 `program_group`(poker/social/others)·`status`(모집 중/모집 완료)·담당자 카드와 함께 insert. 타이머 필드(`timer_event_id`/`url`)는 비워둔다.

- [ ] **Step 3: Apply + verify**

Supabase SQL editor에서 `seed.sql` 실행. `npm run dev`로 공개 페이지가 라이브 사이트와 시각적으로 거의 동일한지 비교(홈/일정/리그/챌린지).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: seed db from live site content"
```

---

## Task 15: Deploy to Vercel + connect domain

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: 전체 앱.

- [ ] **Step 1: Push to Git remote**

(유저 확인 후) GitHub 레포 생성 + 푸시:
```bash
gh repo create donuts --private --source=. --remote=origin --push
```

- [ ] **Step 2: Import to Vercel**

Vercel에서 레포 import. env 설정: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. 배포.

- [ ] **Step 3: Verify production**

Vercel URL에서 홈/일정/상세/리그/챌린지가 Supabase에서 렌더되는지, `/admin` 로그인, `/sitemap.xml`/`/robots.txt` 확인.

- [ ] **Step 4: Connect domain**

Vercel → Domains에 `do-nuts.kr` 추가, DNS 안내 따름(유저가 레지스트라에서 DNS 변경).

- [ ] **Step 5: README + commit**

env/로컬개발(`npm run dev`)/테스트(`npm test`)/배포 문서화. 그 후:
```bash
git add -A && git commit -m "docs: add readme with env and deploy notes"
```

---

## Task 16: Programs directory schema (migration 0003)

**Files:**
- Create: `supabase/migrations/0003_programs.sql`

**Interfaces:**
- Produces: `programs` 테이블 + `program_group` enum + RLS(공개 read: deleted_at null + is_visible / 인증 write).

- [ ] **Step 1: Write migration**

Create `supabase/migrations/0003_programs.sql`:
```sql
create type program_group as enum ('poker','social','others');

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text,
  program_group program_group not null default 'poker',
  status text,
  member_count int not null default 0,
  location text,
  start_date date, end_date date,
  description text,
  cover_image text,
  manager_name text, manager_role text, manager_avatar text,
  cta_label text, entry_link text,
  external_url text,
  is_hot boolean not null default false,
  is_affiliate boolean not null default false,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.programs enable row level security;
create policy "auth write programs" on public.programs for all to authenticated using (true) with check (true);
create policy "public read programs" on public.programs for select using (deleted_at is null and is_visible);

create index programs_group_idx on public.programs (program_group, sort_order);
create index programs_hot_idx on public.programs (is_hot, sort_order);
```

- [ ] **Step 2: Self-review fidelity (DB not provisioned → cannot run)**

Supabase 미프로비저닝이라 적용은 보류. enum/컬럼/RLS/인덱스를 0001/0002 스타일과 일관되게 재확인.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add programs directory schema and rls"
```

---

## Task 17: Programs directory types + data-access (TDD)

**Files:**
- Create: `lib/data/programs.ts`, `test/programs-mapper.test.ts`
- Modify: `lib/types.ts`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 2).
- Produces:
  - `lib/types.ts`: `Program` interface + `ProgramGroup` union (`"poker"|"social"|"others"`).
  - `lib/data/programs.ts`: `mapProgram(row): Program`, `getPrograms(): Promise<Program[]>`, `getHotPrograms(): Promise<Program[]>`, `getProgramsByGroup(group: ProgramGroup): Promise<Program[]>`, `getProgramBySlug(slug): Promise<Program|null>`, `getAffiliatePartners(): Promise<Program[]>`.

- [ ] **Step 1: Add Program type**

`lib/types.ts`에 추가:
```ts
export type ProgramGroup = "poker" | "social" | "others";
export interface Program {
  id: string; slug: string; title: string; category: string | null; program_group: ProgramGroup;
  status: string | null; member_count: number; location: string | null;
  start_date: string | null; end_date: string | null; description: string | null;
  cover_image: string | null; manager_name: string | null; manager_role: string | null; manager_avatar: string | null;
  cta_label: string | null; entry_link: string | null; external_url: string | null;
  is_hot: boolean; is_affiliate: boolean; is_visible: boolean; sort_order: number;
}
```

- [ ] **Step 2: Write failing test**

Create `test/programs-mapper.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mapProgram } from "@/lib/data/programs";

describe("mapProgram", () => {
  it("normalizes a row and defaults", () => {
    const p = mapProgram({ id: "1", slug: "series", title: "도너츠 시리즈", program_group: "poker", is_hot: true });
    expect(p.slug).toBe("series");
    expect(p.is_hot).toBe(true);
    expect(p.member_count).toBe(0);
    expect(p.is_visible).toBe(true);
    expect(p.is_affiliate).toBe(false);
    expect(p.external_url).toBeNull();
  });
  it("preserves external_url for series→/series link", () => {
    const p = mapProgram({ slug: "series", title: "x", program_group: "poker", external_url: "/series" });
    expect(p.external_url).toBe("/series");
  });
});
```

- [ ] **Step 3: Run test → fails**

Run: `npm test -- programs-mapper` → FAIL (module not found).

- [ ] **Step 4: Implement `lib/data/programs.ts`**

```ts
import { createServerSupabase } from "@/lib/supabase/server";
import type { Program, ProgramGroup } from "@/lib/types";

export function mapProgram(r: any): Program {
  return {
    id: String(r.id ?? ""), slug: String(r.slug ?? ""), title: String(r.title ?? ""),
    category: r.category ?? null, program_group: (r.program_group ?? "poker") as ProgramGroup,
    status: r.status ?? null, member_count: Number(r.member_count ?? 0), location: r.location ?? null,
    start_date: r.start_date ?? null, end_date: r.end_date ?? null, description: r.description ?? null,
    cover_image: r.cover_image ?? null, manager_name: r.manager_name ?? null,
    manager_role: r.manager_role ?? null, manager_avatar: r.manager_avatar ?? null,
    cta_label: r.cta_label ?? null, entry_link: r.entry_link ?? null, external_url: r.external_url ?? null,
    is_hot: Boolean(r.is_hot), is_affiliate: Boolean(r.is_affiliate),
    is_visible: r.is_visible ?? true, sort_order: Number(r.sort_order ?? 0),
  };
}
const base = async () => (await createServerSupabase()).from("programs").select("*").is("deleted_at", null).eq("is_visible", true);
export async function getPrograms(): Promise<Program[]> {
  const { data, error } = await (await base()).order("sort_order", { ascending: true });
  if (error) throw error; return (data ?? []).map(mapProgram);
}
export async function getHotPrograms(): Promise<Program[]> {
  const { data, error } = await (await base()).eq("is_hot", true).order("sort_order", { ascending: true });
  if (error) throw error; return (data ?? []).map(mapProgram);
}
export async function getProgramsByGroup(group: ProgramGroup): Promise<Program[]> {
  const { data, error } = await (await base()).eq("program_group", group).order("sort_order", { ascending: true });
  if (error) throw error; return (data ?? []).map(mapProgram);
}
export async function getAffiliatePartners(): Promise<Program[]> {
  const { data, error } = await (await base()).eq("is_affiliate", true).order("sort_order", { ascending: true });
  if (error) throw error; return (data ?? []).map(mapProgram);
}
export async function getProgramBySlug(slug: string): Promise<Program | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").eq("slug", slug).is("deleted_at", null).maybeSingle();
  if (error) throw error; return data ? mapProgram(data) : null;
}
```

- [ ] **Step 5: Run test → passes**

Run: `npm test -- programs-mapper` → PASS (2). Then `npx tsc --noEmit` exit 0.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add programs directory data-access with tests"
```

---

## Task 18: Directory public pages (dark)

**Files:**
- Create: `components/program/ProgramCard.tsx`, `components/program/ProgramList.tsx`, `components/program/PartnerList.tsx`, `app/page.tsx`(modify), `app/programs/page.tsx`, `app/programs/[slug]/page.tsx`, `app/poker/page.tsx`, `app/social/page.tsx`, `app/others/page.tsx`

**Interfaces:**
- Consumes: `getHotPrograms, getPrograms, getProgramsByGroup, getProgramBySlug, getAffiliatePartners` (Task 17); 다크 토큰 (Task 5); `Header/Footer` (Task 6).
- Produces: `/`, `/programs`, `/programs/[slug]`, `/poker`, `/social`, `/others`.

- [ ] **Step 1: ProgramCard + PartnerList (dark, row form)**

Create `components/program/ProgramCard.tsx` — 캡처 §4 카드(좌 정사각 썸네일 radius, 우 텍스트: 1행 카테고리·우측 상태/N명, 2행 제목·우측 날짜/지역). `external_url` 있으면 그 링크, 없으면 `/programs/[slug]`. 다크 글래스 카드.
Create `components/program/PartnerList.tsx` — 제휴 파트너(로고+이름, 외부 링크) 사이드바.

- [ ] **Step 2: ProgramList (client filter)**

Create `components/program/ProgramList.tsx` (client) — 검색(제목 in-memory) + 카드 그리드.

- [ ] **Step 3: Home `/`**

`app/page.tsx` (`revalidate = 300`): `getHotPrograms()` → 🔥HOT 프로그램 섹션 + `getPrograms()` 상위 N → 🔍모든 프로그램 + `/programs` 링크. 다크.

- [ ] **Step 4: `/programs` + category tabs**

`app/programs/page.tsx`: `getPrograms()` + `getAffiliatePartners()` → `<ProgramList>` + `<PartnerList>`.
`app/poker/page.tsx`/`social`/`others`: `getProgramsByGroup("poker"|"social"|"others")` + 그룹별 히어로 문구 + `<ProgramList>`.

- [ ] **Step 5: `/programs/[slug]` detail**

`app/programs/[slug]/page.tsx` (`revalidate = 300`): `getProgramBySlug(slug)`(없으면 `notFound()`). `external_url` 있으면 안내+버튼으로 외부/내부(`/series`) 연결. 히어로(카테고리 라벨 + 큰 제목 + 상태/인원/지역), 본문 2단(좌 포스터+이모지불릿 설명[markdown], 우 담당자 카드[이름·역할·아바타·코럴 CTA]), 하단 관련(HOT) 프로그램. `generateMetadata` + `generateStaticParams`(getPrograms slug).

- [ ] **Step 6: Verify + commit**

`npx tsc --noEmit` 통과(DB 호출 페이지 런타임 검증은 Supabase 확보 후 보류 — 보고). 그 후:
```bash
git add -A && git commit -m "feat: add dark program directory pages"
```

---

## Task 19: Admin — programs directory CRUD

**Files:**
- Create: `app/admin/actions/programs.ts`, `components/admin/ProgramForm.tsx`, `app/admin/programs/page.tsx`, `app/admin/programs/new/page.tsx`, `app/admin/programs/[id]/edit/page.tsx`, `test/program-form.test.tsx`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 2); `getPrograms` (Task 17); `revalidatePublic` (Task 10); `uploadIfPresent` (Task 13, for cover_image).
- Produces: `createProgram(fd)`, `updateProgram(id, fd)`, `deleteProgram(id)`; `<ProgramForm program?={Program} action={(fd)=>void} />`.

- [ ] **Step 1: Failing test for ProgramForm fields**

Create `test/program-form.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgramForm } from "@/components/admin/ProgramForm";

describe("ProgramForm", () => {
  it("renders core fields", () => {
    render(<ProgramForm action={async () => {}} />);
    expect(screen.getByLabelText("프로그램명")).toBeInTheDocument();
    expect(screen.getByLabelText("그룹")).toBeInTheDocument();
    expect(screen.getByLabelText("담당자명")).toBeInTheDocument();
    expect(screen.getByLabelText("외부 링크")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run → fails**

Run: `npm test -- program-form` → FAIL.

- [ ] **Step 3: Build ProgramForm**

Create `components/admin/ProgramForm.tsx` (client) — label 붙은 입력: 프로그램명(title), 슬러그(slug), 카테고리(category), 그룹(select program_group: poker/social/others), 상태(status), 인원(member_count), 지역(location), 기간(start_date/end_date), 설명(textarea), 커버이미지(cover_image_file + 기존 hidden), 담당자명/역할/아바타(manager_*), CTA 문구(cta_label)/링크(entry_link), 외부 링크(external_url), HOT(is_hot checkbox), 제휴(is_affiliate checkbox), 노출(is_visible)/순서(sort_order). `name`은 컬럼과 일치. 편집 시 prefill. `<form action={action}>`.

- [ ] **Step 4: Run → passes**

Run: `npm test -- program-form` → PASS.

- [ ] **Step 5: Server actions + pages**

Create `app/admin/actions/programs.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePublic } from "@/lib/revalidate";
import { uploadIfPresent } from "@/lib/upload";

function parse(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    slug: String(fd.get("slug")), title: String(fd.get("title")), category: s("category"),
    program_group: String(fd.get("program_group") || "poker"), status: s("status"),
    member_count: Number(fd.get("member_count") || 0), location: s("location"),
    start_date: s("start_date"), end_date: s("end_date"), description: s("description"),
    manager_name: s("manager_name"), manager_role: s("manager_role"), manager_avatar: s("manager_avatar"),
    cta_label: s("cta_label"), entry_link: s("entry_link"), external_url: s("external_url"),
    is_hot: fd.get("is_hot") === "on", is_affiliate: fd.get("is_affiliate") === "on",
    is_visible: fd.get("is_visible") === "on", sort_order: Number(fd.get("sort_order") || 0),
  };
}
export async function createProgram(fd: FormData) {
  const supabase = await createServerSupabase();
  const values: any = parse(fd);
  values.cover_image = await uploadIfPresent(supabase, fd, "cover_image", null);
  const { error } = await supabase.from("programs").insert(values);
  if (error) throw error; revalidatePublic(["/programs"]); redirect("/admin/programs");
}
export async function updateProgram(id: string, fd: FormData) {
  const supabase = await createServerSupabase();
  const values: any = parse(fd);
  values.cover_image = await uploadIfPresent(supabase, fd, "cover_image", (fd.get("cover_image_existing") as string) || null);
  const { error } = await supabase.from("programs").update(values).eq("id", id);
  if (error) throw error; revalidatePublic([`/programs/${values.slug}`]); redirect("/admin/programs");
}
export async function deleteProgram(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("programs").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error; revalidatePublic(["/programs"]); redirect("/admin/programs");
}
```
`app/admin/programs/page.tsx` — 프로그램 표(제목/그룹/HOT/제휴/노출/수정). `new`/`[id]/edit` — `<ProgramForm action={...} />` + edit엔 `<DeleteButton onDelete={deleteProgram.bind(null,id)} />`.

- [ ] **Step 6: Verify + commit**

`npm test` 통과 + `npx tsc --noEmit` exit 0(런타임 DB 검증은 Supabase 확보 후 보류). 그 후:
```bash
git add -A && git commit -m "feat: add admin programs directory crud"
```

---

## Self-Review

**Spec coverage (스펙 → 태스크):**
- 프로그램 디렉토리(스키마/데이터/페이지/어드민) (스펙 5.8, 6, 7) → Task 16,17,18,19 ✓
- 다크 테마 통일 (스펙 0,9) → Task 5,6,8,18 ✓
- 시리즈 마이크로사이트 홈 `/series` (스펙 6) → Task 8 ✓
- 스택/단일앱/ISR/revalidate (스펙 2,4) → Task 1,2,8,10 ✓
- 데이터 모델 8테이블 + RLS + 소프트삭제 (스펙 5) → Task 3 ✓
- 타입드 데이터 액세스 + 기간노출 로직 (스펙 5,6) → Task 4 ✓
- 디자인 캡처/토큰 (스펙 9) → Task 5 ✓
- 동적 네비(하이브리드 C) (스펙 0,6) → Task 4,6 ✓
- 공개 라우트 홈/일정/상세/리그/리더보드/특수 (스펙 6) → Task 8,9 ✓
- 블라인드 스트럭처 + PLO text Ante (스펙 5.3) → Task 4,7,12 ✓
- 타이머 필드만 예약 (스펙 0,11) → Task 3(컬럼), Task 11(EventForm 입력) ✓
- 온라인 리그 상태 분기 (스펙 5.6) → Task 9,12 ✓
- 후원/챌린지 템플릿 + 기간 자동 숨김 (스펙 5.5,6) → Task 9,12 ✓
- 관리자 인증(이메일+비번 단일) (스펙 0,7) → Task 10 ✓
- 어드민 CRUD 전 영역 (스펙 7) → Task 11,12 ✓
- 이미지 업로드 (스펙 7) → Task 13 ✓
- 마이그레이션 seed (스펙 8) → Task 14 ✓
- SEO sitemap/robots (스펙 6) → Task 10 ✓
- 배포 + 도메인 (스펙 3,4) → Task 15 ✓

**비범위 확인:** 타이머 실시간/결과·홀덤연구소·권한3단계·OAuth·임시저장/발행/감사로그·장소프리셋·이벤트타입템플릿저장·시즌복제·WebSocket은 계획에서 의도적으로 제외(스펙 11) — 단, `timer_event_id/url` 컬럼·입력은 예약.

**Placeholder scan:** 코드 단계는 전체 코드 또는 구체 필드 목록 제공. Task 5/14는 의도된 데이터 수집(라이브 캡처) 태스크. `lib/data/*` 중 반복 패턴 파일(seasons/specialPages/onlineLeague/siteConfig)은 Task 4 Step 4에서 동일 패턴 + 파일별 분기 규칙을 명시.

**Type consistency:** `Season/Event/BlindStructure/BlindRow/NavTab/SpecialPage/OnlineLeague/SiteConfig` 및 enum 유니온은 Task 4에서 정의 후 Task 6–13에서 일관 사용. data-access 함수명(`getActiveSeason/getEvents/getEventById/getStructureWithRows/getVisibleTabs/getSpecialPageBySlug/getOnlineLeague/getSiteConfig`), `isTabActive`, `revalidatePublic`, `uploadIfPresent`, `mapEvent/mapRow/mapTab`은 전 태스크에서 동일 시그니처로 참조.
