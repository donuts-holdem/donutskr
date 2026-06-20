# DO:NUTS Site Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Framer-hosted `do-nuts.kr` (Korean poker/holdem community site) as a self-owned Next.js app backed by Supabase, with a built-in `/admin` CRUD UI, deployed to Vercel.

**Architecture:** Single Next.js 16 (App Router) application. Public pages are Server Components that read `programs` from Supabase and use ISR; admin mutations trigger on-demand revalidation. Admin lives at `/admin`, gated by Supabase Auth. Program content (tournaments/sessions) lives in a Supabase `programs` table with public read + authenticated write via RLS. Visual design is reproduced from the live site by capturing exact tokens/assets with the Claude browser extension and codifying them into the Tailwind theme.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 3, Supabase (Postgres + Auth + Storage), Vitest for unit tests, Vercel for hosting.

## Global Constraints

- Next.js `16.x`, React `19.x`, TypeScript `^5` — match sibling projects `udfnd`/`cuayo`.
- Tailwind CSS `^3.4`.
- Package manager: `npm` (use `package-lock.json`).
- Language/content: Korean (`ko`) single-locale. `<html lang="ko">`.
- Project root: `/Users/seungmok/WebstormProjects/donuts`.
- Supabase access: public anon read on `programs`; all writes require an authenticated session (RLS enforced).
- Do NOT reuse Framer auto-generated code. Reproduce design from captured tokens/assets only.
- Secrets in `.env.local` (never committed). Server-only secrets must not be prefixed `NEXT_PUBLIC_`.
- Commit after every task with a Conventional Commits message.

---

## File Structure

```
donuts/
  app/
    layout.tsx                      # root layout, <html lang="ko">, fonts, global Header/Footer slot
    globals.css                     # Tailwind directives + design tokens as CSS vars
    page.tsx                        # Home (/)
    programs/
      page.tsx                      # Programs list (/programs)
      [slug]/page.tsx               # Program detail (/programs/[slug])
    admin/
      layout.tsx                    # admin shell, auth guard
      login/page.tsx                # admin login
      page.tsx                      # admin program list
      programs/new/page.tsx         # create form
      programs/[id]/edit/page.tsx   # edit form
      actions.ts                    # server actions: create/update/delete program
    api/revalidate/route.ts         # (optional manual) revalidation endpoint
    sitemap.ts                      # dynamic sitemap
    robots.ts                       # robots
  components/
    site/Header.tsx
    site/Footer.tsx
    program/ProgramCard.tsx
    program/StatusBadge.tsx
    program/ProgramList.tsx         # client filter/search wrapper
    admin/ProgramForm.tsx
  lib/
    supabase/server.ts              # server-side client (cookies)
    supabase/browser.ts             # browser client
    supabase/middleware.ts          # session refresh helper
    programs.ts                     # typed data-access layer
    types.ts                        # Program type + status enum
  middleware.ts                     # /admin auth + session refresh
  supabase/
    migrations/0001_programs.sql    # schema + RLS
    seed.sql                        # seed data from current site
  test/
    programs.test.ts
    program-form.test.ts
  _framer-export/                   # (optional) reference assets only — gitignored
  docs/superpowers/                 # spec + this plan
  tailwind.config.ts
  next.config.ts
  package.json
  .env.local                        # gitignored
  .env.example
```

---

## Task 1: Scaffold Next.js app + Tailwind + tooling

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.gitignore`, `.env.example`, `vitest.config.ts`

**Interfaces:**
- Produces: a running Next.js dev server; `app/layout.tsx` exporting root layout with `<html lang="ko">`.

- [ ] **Step 1: Scaffold the app**

Run from `/Users/seungmok/WebstormProjects`:
```bash
npx create-next-app@latest donuts --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
```
Accept defaults. This creates `donuts/` with App Router, Tailwind, TS.

- [ ] **Step 2: Pin versions to match siblings**

Edit `donuts/package.json` so `next` is `16.x`, `react`/`react-dom` are `19.x`, `tailwindcss` is `^3.4` (downgrade if scaffold used v4). Then:
```bash
cd /Users/seungmok/WebstormProjects/donuts && npm install
```

- [ ] **Step 3: Add Supabase + Vitest deps**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Add Vitest config**

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
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 5: Set root layout language**

Edit `app/layout.tsx` so the root element is `<html lang="ko">`. Keep the generated body/font wiring for now (fonts finalized in Task 5).

- [ ] **Step 6: Verify dev server + build**

Run:
```bash
npm run dev    # visit http://localhost:3000, confirm default page renders, then Ctrl-C
npm run build
```
Expected: build completes with no errors.

- [ ] **Step 7: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold next.js + tailwind + vitest"
```

---

## Task 2: Supabase client wiring

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/middleware.ts`, `.env.example`
- Modify: `.env.local` (local only, gitignored)

**Interfaces:**
- Produces:
  - `createServerSupabase(): SupabaseClient` (async, reads cookies) from `lib/supabase/server.ts`
  - `createBrowserSupabase(): SupabaseClient` from `lib/supabase/browser.ts`
  - `updateSession(request: NextRequest): NextResponse` from `lib/supabase/middleware.ts`

- [ ] **Step 1: Record required env vars**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
Create `.env.local` with the real values from the Supabase project dashboard (Project Settings → API). Confirm `.env*.local` is in `.gitignore`.

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
            // called from a Server Component; safe to ignore — middleware refreshes
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

## Task 3: `programs` schema, RLS, and seed

**Files:**
- Create: `supabase/migrations/0001_programs.sql`, `supabase/seed.sql`, `lib/types.ts`

**Interfaces:**
- Produces: `programs` table; `Program` TS type and `ProgramStatus` union in `lib/types.ts`.

- [ ] **Step 1: Define the TS type**

Create `lib/types.ts`:
```ts
export type ProgramStatus = "recruiting" | "closed" | "upcoming";

export interface Program {
  id: string;
  slug: string;
  title: string;
  status: ProgramStatus;
  is_hot: boolean;
  member_count: number;
  location: string | null;
  start_date: string | null; // ISO date
  end_date: string | null;
  description: string | null; // markdown
  manager: string | null;
  cover_image: string | null;
  sort_order: number;
  created_at: string;
}
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0001_programs.sql`:
```sql
create type program_status as enum ('recruiting', 'closed', 'upcoming');

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status program_status not null default 'upcoming',
  is_hot boolean not null default false,
  member_count integer not null default 0,
  location text,
  start_date date,
  end_date date,
  description text,
  manager text,
  cover_image text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.programs enable row level security;

create policy "public read" on public.programs
  for select using (true);

create policy "authenticated write" on public.programs
  for all to authenticated using (true) with check (true);

create index programs_sort_idx on public.programs (sort_order, created_at desc);
```

- [ ] **Step 3: Seed from the current live site**

Create `supabase/seed.sql` with the programs observed on `do-nuts.kr` (slugs already known: `donutslab`, `series`, `wpl-홀덤-마스터스`, `donuts-socialstrategygame`, `donuts-seoul-east`, `문래-동호회-원페어`, `도너츠-신림-홀덤-세션`, `신림-동호회-에어라인`). Example row:
```sql
insert into public.programs (slug, title, status, is_hot, member_count, location, start_date, end_date, manager, sort_order)
values
  ('series', '도너츠 시리즈', 'recruiting', true, 75, '서울', '2026-05-16', '2026-07-19', '이종한', 10),
  ('donutslab', 'Community Holdem Lab', 'recruiting', true, 55, '서울', null, null, null, 20);
-- ...add remaining rows; full text/description filled during design-capture (Task 5).
```

- [ ] **Step 4: Apply to Supabase**

Run via the Supabase SQL editor (paste `0001_programs.sql` then `seed.sql`), OR with the Supabase CLI:
```bash
supabase db push    # if CLI + linked project configured
```
Expected: `programs` table exists with seed rows. Verify in Table Editor.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add programs schema, rls policies, and seed"
```

---

## Task 4: Typed data-access layer (TDD)

**Files:**
- Create: `lib/programs.ts`, `test/programs.test.ts`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 2), `Program` (Task 3).
- Produces (from `lib/programs.ts`):
  - `getAllPrograms(): Promise<Program[]>` — ordered by `sort_order`, then `created_at` desc
  - `getHotPrograms(): Promise<Program[]>` — `is_hot = true`, same ordering
  - `getProgramBySlug(slug: string): Promise<Program | null>`
  - `mapRow(row: unknown): Program` — pure normalizer (the testable unit)

- [ ] **Step 1: Write the failing test for `mapRow`**

Create `test/programs.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { mapRow } from "@/lib/programs";

describe("mapRow", () => {
  it("normalizes a db row into a Program", () => {
    const row = {
      id: "1", slug: "series", title: "도너츠 시리즈", status: "recruiting",
      is_hot: true, member_count: 75, location: "서울",
      start_date: "2026-05-16", end_date: "2026-07-19", description: null,
      manager: "이종한", cover_image: null, sort_order: 10,
      created_at: "2026-01-01T00:00:00Z",
    };
    const p = mapRow(row);
    expect(p.slug).toBe("series");
    expect(p.is_hot).toBe(true);
    expect(p.member_count).toBe(75);
  });

  it("coerces null member_count to 0", () => {
    const p = mapRow({ slug: "x", title: "x", status: "upcoming", member_count: null });
    expect(p.member_count).toBe(0);
    expect(p.is_hot).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- programs`
Expected: FAIL with "mapRow is not a function" / module not found.

- [ ] **Step 3: Implement `lib/programs.ts`**

```ts
import { createServerSupabase } from "@/lib/supabase/server";
import type { Program, ProgramStatus } from "@/lib/types";

export function mapRow(row: any): Program {
  return {
    id: String(row.id ?? ""),
    slug: String(row.slug),
    title: String(row.title),
    status: (row.status ?? "upcoming") as ProgramStatus,
    is_hot: Boolean(row.is_hot),
    member_count: Number(row.member_count ?? 0),
    location: row.location ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    description: row.description ?? null,
    manager: row.manager ?? null,
    cover_image: row.cover_image ?? null,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ?? "",
  };
}

const ORDER = "sort_order.asc,created_at.desc";

export async function getAllPrograms(): Promise<Program[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*")
    .order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getHotPrograms(): Promise<Program[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").eq("is_hot", true)
    .order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getProgramBySlug(slug: string): Promise<Program | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- programs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add typed programs data-access layer with tests"
```

---

## Task 5: Capture live design → tokens, fonts, assets

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`
- Create: `public/fonts/*`, `public/images/*` (downloaded assets), `docs/superpowers/design-capture.md` (recorded values)

**Interfaces:**
- Produces: Tailwind theme tokens (`colors.brand`, `fontFamily`, spacing scale) and global CSS variables consumed by all page/component tasks. Records the per-page section structure (home/list/detail) used by Tasks 6–10.

> **Prerequisite:** The Claude browser extension (claude.ai/chrome) must be connected so the implementer can open `https://do-nuts.kr`, screenshot each page, and read computed styles. If unavailable, fall back to a NoCodeExport ZIP placed in `_framer-export/` and read styles from there.

- [ ] **Step 1: Capture each page**

Open `https://do-nuts.kr`, `/programs`, and one `/programs/[slug]` detail page. For each: take a full screenshot, and read computed styles (via the extension's read_page / DOM inspection) for: primary/background/text/accent colors (hex), font families + weights, base font sizes, heading sizes, container max-width, section vertical spacing, border-radius, button styles, status-badge styling.

- [ ] **Step 2: Record values**

Create `docs/superpowers/design-capture.md` listing the captured hex colors, font names, spacing, radii, and a short per-page section outline (home: hero?, HOT row, all-programs grid; list: filter bar + grid; detail: title/badge/meta/description/CTA + HOT sidebar). This file is the source of truth for Tasks 6–10.

- [ ] **Step 3: Download fonts + key images**

Save webfonts to `public/fonts/` and logo/illustration assets to `public/images/`. If fonts are Google Fonts, prefer `next/font/google` instead and note the family name in the capture doc.

- [ ] **Step 4: Codify tokens into Tailwind**

Edit `tailwind.config.ts` `theme.extend` with the captured `colors`, `fontFamily`, `borderRadius`, and any custom spacing. Edit `app/globals.css` to declare matching CSS variables under `:root` and set base `body` background/text colors. Wire fonts in `app/layout.tsx` (via `next/font` or `@font-face` referencing `public/fonts`).

- [ ] **Step 5: Verify tokens render**

Add a temporary block to `app/page.tsx` using `bg-brand`, `text-...`, and the heading font; run `npm run dev` and visually compare the color/font against the live site screenshot. Remove the temporary block after confirming.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: capture live design tokens, fonts, and assets"
```

---

## Task 6: Root layout + Header + Footer

**Files:**
- Create: `components/site/Header.tsx`, `components/site/Footer.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: design tokens (Task 5).
- Produces: `<Header />` and `<Footer />` rendered in `app/layout.tsx` around `{children}`.

- [ ] **Step 1: Build Header**

Create `components/site/Header.tsx` — a Server Component with the DO:NUTS logo linking to `/`, a link to `/programs` ("모두 보기"), styled with Task 5 tokens. Match the live header layout (logo left, nav/search right).
```tsx
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[--bg] border-b border-black/5">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-xl font-bold">DO:NUTS</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/programs">모두 보기</Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Build Footer**

Create `components/site/Footer.tsx` mirroring the live footer content (brand line, any links). Keep it minimal and token-styled.

- [ ] **Step 3: Wire into layout**

Edit `app/layout.tsx` to render `<Header />`, then `<main className="mx-auto max-w-5xl px-4">{children}</main>`, then `<Footer />`.

- [ ] **Step 4: Verify**

Run `npm run dev`; confirm header/footer appear on `/` and match the live layout. Run `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add site header and footer in root layout"
```

---

## Task 7: Program presentation components

**Files:**
- Create: `components/program/StatusBadge.tsx`, `components/program/ProgramCard.tsx`, `test/status-badge.test.tsx`

**Interfaces:**
- Consumes: `Program`, `ProgramStatus` (Task 3); design tokens (Task 5).
- Produces:
  - `<StatusBadge status={ProgramStatus} />`
  - `<ProgramCard program={Program} />` — links to `/programs/[slug]`

- [ ] **Step 1: Write failing test for StatusBadge label mapping**

Create `test/status-badge.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "@/components/program/StatusBadge";

describe("StatusBadge", () => {
  it("renders Korean label for recruiting", () => {
    render(<StatusBadge status="recruiting" />);
    expect(screen.getByText("모집 중")).toBeInTheDocument();
  });
  it("renders Korean label for closed", () => {
    render(<StatusBadge status="closed" />);
    expect(screen.getByText("마감")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- status-badge`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement StatusBadge**

Create `components/program/StatusBadge.tsx`:
```tsx
import type { ProgramStatus } from "@/lib/types";

const LABEL: Record<ProgramStatus, string> = {
  recruiting: "모집 중",
  closed: "마감",
  upcoming: "예정",
};
const STYLE: Record<ProgramStatus, string> = {
  recruiting: "bg-brand text-white",
  closed: "bg-gray-200 text-gray-600",
  upcoming: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ status }: { status: ProgramStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- status-badge`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement ProgramCard**

Create `components/program/ProgramCard.tsx`:
```tsx
import Link from "next/link";
import Image from "next/image";
import type { Program } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <Link href={`/programs/${program.slug}`}
      className="block overflow-hidden rounded-xl border border-black/5 transition hover:shadow-md">
      {program.cover_image && (
        <div className="relative aspect-[16/9]">
          <Image src={program.cover_image} alt={program.title} fill className="object-cover" />
        </div>
      )}
      <div className="space-y-2 p-4">
        <StatusBadge status={program.status} />
        <h3 className="font-heading text-lg font-semibold">{program.title}</h3>
        <p className="text-sm text-gray-500">
          {program.location && `${program.location} · `}{program.member_count}명
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add StatusBadge and ProgramCard components"
```

---

## Task 8: Home page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getHotPrograms`, `getAllPrograms` (Task 4); `ProgramCard` (Task 7).
- Produces: home route with ISR.

- [ ] **Step 1: Implement the home page**

Edit `app/page.tsx`:
```tsx
import { getHotPrograms, getAllPrograms } from "@/lib/programs";
import { ProgramCard } from "@/components/program/ProgramCard";
import Link from "next/link";

export const revalidate = 300;

export default async function HomePage() {
  const [hot, all] = await Promise.all([getHotPrograms(), getAllPrograms()]);
  return (
    <div className="space-y-12 py-8">
      <section>
        <h2 className="mb-4 font-heading text-2xl font-bold">🔥 HOT 프로그램</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hot.map((p) => <ProgramCard key={p.id} program={p} />)}
        </div>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold">전체 프로그램</h2>
          <Link href="/programs" className="text-sm text-brand">모두 보기 →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {all.slice(0, 6).map((p) => <ProgramCard key={p.id} program={p} />)}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify against live home**

Run `npm run dev`, open `/`. Compare section order/spacing to the live-site screenshot from Task 5; adjust Tailwind classes to match. Run `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add home page with hot + all programs"
```

---

## Task 9: Programs list page with search/filter

**Files:**
- Create: `components/program/ProgramList.tsx`
- Modify: `app/programs/page.tsx`

**Interfaces:**
- Consumes: `getAllPrograms` (Task 4); `ProgramCard` (Task 7).
- Produces: `/programs` route; `<ProgramList programs={Program[]} />` client component doing in-memory search + status filter.

- [ ] **Step 1: Build the client list/filter component**

Create `components/program/ProgramList.tsx`:
```tsx
"use client";
import { useState, useMemo } from "react";
import type { Program, ProgramStatus } from "@/lib/types";
import { ProgramCard } from "./ProgramCard";

const FILTERS: { key: "all" | ProgramStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "recruiting", label: "모집 중" },
  { key: "upcoming", label: "예정" },
  { key: "closed", label: "마감" },
];

export function ProgramList({ programs }: { programs: Program[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | ProgramStatus>("all");
  const shown = useMemo(() => programs.filter((p) =>
    (filter === "all" || p.status === filter) &&
    (q === "" || p.title.toLowerCase().includes(q.toLowerCase()))
  ), [programs, q, filter]);

  return (
    <div className="space-y-6 py-8">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="프로그램 검색"
        className="w-full rounded-lg border px-4 py-2" />
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-sm ${filter === f.key ? "bg-brand text-white" : "bg-gray-100"}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => <ProgramCard key={p.id} program={p} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement the page**

Edit `app/programs/page.tsx`:
```tsx
import { getAllPrograms } from "@/lib/programs";
import { ProgramList } from "@/components/program/ProgramList";

export const revalidate = 300;

export default async function ProgramsPage() {
  const programs = await getAllPrograms();
  return (
    <>
      <h1 className="pt-8 font-heading text-3xl font-bold">전체 프로그램</h1>
      <ProgramList programs={programs} />
    </>
  );
}
```

- [ ] **Step 3: Verify**

Run `npm run dev`, open `/programs`; confirm search + filter work and grid matches live. Run `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add programs list page with search and filter"
```

---

## Task 10: Program detail page + metadata

**Files:**
- Modify: `app/programs/[slug]/page.tsx`
- Create: (if needed) `lib/markdown.ts` for rendering `description` markdown

**Interfaces:**
- Consumes: `getProgramBySlug`, `getAllPrograms`/`getHotPrograms` (Task 4); `StatusBadge` (Task 7).
- Produces: `/programs/[slug]` route with `generateStaticParams`, `generateMetadata`, and `notFound()` on miss.

- [ ] **Step 1: (If description is markdown) add a renderer**

Run `npm install marked`. Create `lib/markdown.ts`:
```ts
import { marked } from "marked";
export function renderMarkdown(md: string | null): string {
  return md ? (marked.parse(md, { async: false }) as string) : "";
}
```

- [ ] **Step 2: Implement the detail page**

Edit `app/programs/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProgramBySlug, getAllPrograms, getHotPrograms } from "@/lib/programs";
import { StatusBadge } from "@/components/program/StatusBadge";
import { ProgramCard } from "@/components/program/ProgramCard";
import { renderMarkdown } from "@/lib/markdown";

export const revalidate = 300;

export async function generateStaticParams() {
  const programs = await getAllPrograms();
  return programs.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProgramBySlug(slug);
  if (!p) return {};
  return {
    title: `${p.title} | DO:NUTS`,
    description: (p.description ?? "").slice(0, 120),
    openGraph: { title: p.title, images: p.cover_image ? [p.cover_image] : [] },
  };
}

export default async function ProgramDetail(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) notFound();
  const hot = (await getHotPrograms()).filter((h) => h.slug !== program.slug).slice(0, 3);

  return (
    <div className="grid gap-10 py-8 lg:grid-cols-[1fr_300px]">
      <article className="space-y-4">
        <StatusBadge status={program.status} />
        <h1 className="font-heading text-3xl font-bold">{program.title}</h1>
        <p className="text-gray-500">
          {program.location && `${program.location} · `}{program.member_count}명
          {program.start_date && ` · ${program.start_date} ~ ${program.end_date ?? ""}`}
        </p>
        {program.manager && <p className="text-sm text-gray-500">담당: {program.manager}</p>}
        <div className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(program.description) }} />
      </article>
      <aside className="space-y-4">
        <h2 className="font-heading text-lg font-bold">🔥 HOT 프로그램</h2>
        {hot.map((p) => <ProgramCard key={p.id} program={p} />)}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run `npm run dev`, open `/programs/series`; confirm fields render and layout matches live detail page. Visit a non-existent slug → 404. Run `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add program detail page with metadata"
```

---

## Task 11: SEO — sitemap + robots

**Files:**
- Create: `app/sitemap.ts`, `app/robots.ts`

**Interfaces:**
- Consumes: `getAllPrograms` (Task 4).

- [ ] **Step 1: Add sitemap**

Create `app/sitemap.ts`:
```ts
import type { MetadataRoute } from "next";
import { getAllPrograms } from "@/lib/programs";

const BASE = "https://do-nuts.kr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const programs = await getAllPrograms();
  return [
    { url: BASE, priority: 1 },
    { url: `${BASE}/programs`, priority: 0.8 },
    ...programs.map((p) => ({ url: `${BASE}/programs/${p.slug}`, priority: 0.6 })),
  ];
}
```

- [ ] **Step 2: Add robots**

Create `app/robots.ts`:
```ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: "https://do-nuts.kr/sitemap.xml",
  };
}
```

- [ ] **Step 3: Verify + commit**

Run `npm run build`; confirm `/sitemap.xml` and `/robots.txt` generate. Then:
```bash
git add -A && git commit -m "feat: add sitemap and robots"
```

---

## Task 12: Admin auth + route protection

**Files:**
- Create: `middleware.ts`, `app/admin/login/page.tsx`, `app/admin/layout.tsx`

**Interfaces:**
- Consumes: `updateSession` (Task 2), `createServerSupabase` (Task 2), `createBrowserSupabase` (Task 2).
- Produces: `/admin/*` requires an authenticated session; unauthenticated users are redirected to `/admin/login`.

- [ ] **Step 1: Add middleware that refreshes session + guards /admin**

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

- [ ] **Step 2: Build the login page**

Create `app/admin/login/page.tsx` (client component) using email+password sign-in:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); return; }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-20 max-w-sm space-y-3">
      <h1 className="font-heading text-2xl font-bold">관리자 로그인</h1>
      <input className="w-full rounded border px-3 py-2" type="email" placeholder="이메일"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full rounded border px-3 py-2" type="password" placeholder="비밀번호"
        value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="w-full rounded bg-brand py-2 text-white">로그인</button>
    </form>
  );
}
```

- [ ] **Step 3: Admin layout with sign-out**

Create `app/admin/layout.tsx` (Server Component) that renders an admin nav (link to `/admin`, `/admin/programs/new`) and a sign-out control. Keep it simple and token-styled.

- [ ] **Step 4: Create the admin user**

In Supabase dashboard → Authentication → Users → Add user, create the admin email/password. (No public sign-up.)

- [ ] **Step 5: Verify**

Run `npm run dev`. Visit `/admin` while logged out → redirected to `/admin/login`. Log in → reach `/admin`. Run `npm run build`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add admin auth, login, and route protection"
```

---

## Task 13: Admin program list

**Files:**
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `getAllPrograms` (Task 4).
- Produces: admin dashboard listing all programs with edit links and a "new" link.

- [ ] **Step 1: Implement admin list**

Edit `app/admin/page.tsx`:
```tsx
import Link from "next/link";
import { getAllPrograms } from "@/lib/programs";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const programs = await getAllPrograms();
  return (
    <div className="space-y-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">프로그램 관리</h1>
        <Link href="/admin/programs/new" className="rounded bg-brand px-3 py-2 text-sm text-white">
          + 새 프로그램
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-gray-500">
          <th className="py-2">제목</th><th>상태</th><th>HOT</th><th>인원</th><th></th>
        </tr></thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.title}</td>
              <td>{p.status}</td>
              <td>{p.is_hot ? "🔥" : ""}</td>
              <td>{p.member_count}</td>
              <td><Link href={`/admin/programs/${p.id}/edit`} className="text-brand">수정</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run `npm run dev`, log in, visit `/admin`; confirm the table lists seed programs. Then:
```bash
git add -A && git commit -m "feat: add admin program list"
```

---

## Task 14: Admin create/edit/delete (server actions)

**Files:**
- Create: `app/admin/actions.ts`, `components/admin/ProgramForm.tsx`, `app/admin/programs/new/page.tsx`, `app/admin/programs/[id]/edit/page.tsx`, `test/program-form.test.tsx`

**Interfaces:**
- Consumes: `createServerSupabase` (Task 2), `Program` (Task 3), `getProgramBySlug` pattern (Task 4).
- Produces:
  - server actions `createProgram(formData: FormData)`, `updateProgram(id: string, formData: FormData)`, `deleteProgram(id: string)` in `app/admin/actions.ts`
  - `<ProgramForm program?={Program} action={(fd: FormData) => void} />`

- [ ] **Step 1: Write failing test for form field rendering**

Create `test/program-form.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgramForm } from "@/components/admin/ProgramForm";

describe("ProgramForm", () => {
  it("renders required fields", () => {
    render(<ProgramForm action={async () => {}} />);
    expect(screen.getByLabelText("제목")).toBeInTheDocument();
    expect(screen.getByLabelText("슬러그")).toBeInTheDocument();
    expect(screen.getByLabelText("상태")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- program-form`
Expected: FAIL (module not found).

- [ ] **Step 3: Build the form component**

Create `components/admin/ProgramForm.tsx` (client component) with labelled inputs for title, slug, status (select), is_hot (checkbox), member_count, location, start_date, end_date, manager, description (textarea), sort_order, and a submit button. Each input `name` must match the DB column. Pre-fill from `program` when editing. Wire `action={action}` on the `<form>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- program-form`
Expected: PASS.

- [ ] **Step 5: Implement server actions**

Create `app/admin/actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

function parse(formData: FormData) {
  return {
    slug: String(formData.get("slug")),
    title: String(formData.get("title")),
    status: String(formData.get("status")),
    is_hot: formData.get("is_hot") === "on",
    member_count: Number(formData.get("member_count") || 0),
    location: (formData.get("location") as string) || null,
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    description: (formData.get("description") as string) || null,
    manager: (formData.get("manager") as string) || null,
    sort_order: Number(formData.get("sort_order") || 0),
  };
}

async function revalidateProgram(slug: string) {
  revalidatePath("/");
  revalidatePath("/programs");
  revalidatePath(`/programs/${slug}`);
}

export async function createProgram(formData: FormData) {
  const supabase = await createServerSupabase();
  const values = parse(formData);
  const { error } = await supabase.from("programs").insert(values);
  if (error) throw error;
  await revalidateProgram(values.slug);
  redirect("/admin");
}

export async function updateProgram(id: string, formData: FormData) {
  const supabase = await createServerSupabase();
  const values = parse(formData);
  const { error } = await supabase.from("programs").update(values).eq("id", id);
  if (error) throw error;
  await revalidateProgram(values.slug);
  redirect("/admin");
}

export async function deleteProgram(id: string) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("programs").select("slug").eq("id", id).maybeSingle();
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw error;
  if (data?.slug) await revalidateProgram(data.slug);
  redirect("/admin");
}
```

- [ ] **Step 6: Wire create + edit pages**

Create `app/admin/programs/new/page.tsx` rendering `<ProgramForm action={createProgram} />`.
Create `app/admin/programs/[id]/edit/page.tsx` that loads the program by id (server-side Supabase query), renders `<ProgramForm program={program} action={updateProgram.bind(null, id)} />`, and includes a delete button posting to `deleteProgram.bind(null, id)`.

- [ ] **Step 7: Verify end-to-end**

Run `npm run dev`, log in. Create a program → appears in `/admin` and on `/` after revalidation. Edit it → changes persist. Delete it → removed. Run `npm run build`.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add admin program create/edit/delete with revalidation"
```

---

## Task 15: Cover image upload to Supabase Storage

**Files:**
- Modify: `components/admin/ProgramForm.tsx`, `app/admin/actions.ts`
- Supabase: create a public `program-images` Storage bucket

**Interfaces:**
- Consumes: server Supabase client (Task 2); form action wiring (Task 14).
- Produces: `cover_image` populated with the uploaded public URL.

- [ ] **Step 1: Create the bucket**

In Supabase dashboard → Storage → create bucket `program-images`, set to public. Add a policy allowing authenticated uploads.

- [ ] **Step 2: Add a file input + upload handling**

Add a `<input type="file" name="cover" accept="image/*" />` to `ProgramForm`. In the create/update actions, if a `cover` file is present, upload it:
```ts
const file = formData.get("cover") as File | null;
let cover_image = (formData.get("cover_image_existing") as string) || null;
if (file && file.size > 0) {
  const path = `${values.slug}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("program-images")
    .upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  cover_image = supabase.storage.from("program-images").getPublicUrl(path).data.publicUrl;
}
```
Include `cover_image` in the insert/update payload. Add a hidden `cover_image_existing` input in the edit form to preserve the current image when no new file is chosen.

- [ ] **Step 3: Allow the image host in Next config**

Edit `next.config.ts` to add the Supabase Storage hostname to `images.remotePatterns` (e.g. `*.supabase.co`).

- [ ] **Step 4: Verify**

Run `npm run dev`; create a program with an image; confirm it shows on the card/detail. Run `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add cover image upload to supabase storage"
```

---

## Task 16: Deploy to Vercel + connect domain

**Files:**
- Create: `README.md` (env + deploy notes)

**Interfaces:**
- Consumes: the full app.

- [ ] **Step 1: Push to a Git remote**

Create a GitHub repo and push:
```bash
gh repo create donuts --private --source=. --remote=origin --push
```
(Confirm with the user before creating the remote.)

- [ ] **Step 2: Import to Vercel**

In Vercel, import the repo. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Deploy.

- [ ] **Step 3: Verify the production deploy**

Open the Vercel URL; confirm home/list/detail render from Supabase and `/admin` login works. Confirm `/sitemap.xml` and `/robots.txt`.

- [ ] **Step 4: Connect the domain**

In Vercel → Project → Domains, add `do-nuts.kr` and follow DNS instructions. (User performs DNS changes at the registrar.)

- [ ] **Step 5: Write README + commit**

Document env vars, local dev (`npm run dev`), tests (`npm test`), and deploy. Then:
```bash
git add -A && git commit -m "docs: add README with env and deploy notes"
```

---

## Self-Review

**Spec coverage:**
- Goal/stack (Next+React+TS+Tailwind+Supabase, Vercel) → Tasks 1, 2, 16 ✓
- `programs` data model + RLS → Task 3 ✓
- Public routes `/`, `/programs`, `/programs/[slug]` with ISR → Tasks 8, 9, 10 ✓
- SEO (metadata, sitemap, robots) → Tasks 10, 11 ✓
- Admin `/admin` with Supabase Auth + CRUD + revalidation → Tasks 12, 13, 14, 16 ✓
- Image storage → Task 15 ✓
- Design fidelity via browser-extension capture → Task 5 ✓
- Single app (no separate admin project) → admin lives under `app/admin/*` ✓

**Placeholder scan:** Task 3 seed and Task 5 tokens are intentionally data-collection tasks (real values captured from the live site), not code placeholders. Task 13/14 list/form markup is concrete; ProgramForm field markup is described field-by-field with matching `name`s.

**Type consistency:** `Program`/`ProgramStatus` (Task 3) used consistently in Tasks 4, 7, 9, 10, 14. Data-access names (`getAllPrograms`, `getHotPrograms`, `getProgramBySlug`, `mapRow`) consistent across Tasks 4, 8, 9, 10, 11, 13. Supabase client names (`createServerSupabase`, `createBrowserSupabase`, `updateSession`) consistent across Tasks 2, 4, 12, 14, 15.

**Open items deferred to implementation (per spec §9):** exact `programs` fields beyond the core set, exact design tokens, and login method are resolved inside Tasks 3/5/12 using the live site + Supabase dashboard.
