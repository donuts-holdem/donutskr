# 프로그램 설명 WYSIWYG 에디터 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 프로그램 "설명" 입력을 블록 에디터에서 TipTap WYSIWYG 에디터로 바꾸고, 작성한 HTML을 공개 페이지에 그대로(sanitize 후) 렌더한다.

**Architecture:** TipTap이 출력하는 HTML을 기존 `description_blocks` jsonb에 단일 `{type:"raw", html}` 블록으로 저장한다(DB 스키마 변경 없음). 공개 페이지의 `ProgramBlocks`는 이미 `raw` 블록을 sanitize 렌더하므로 공개 경로는 그대로다. 기존 데이터는 서버에서 `blocksToHtml`/`marked`로 HTML로 변환해 에디터 초기값으로 채운다.

**Tech Stack:** Next.js 16.2.9 (App Router, 수정판), React 19.2.4, TipTap v2 (@tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-link, @tiptap/extension-image), sanitize-html 2.x, marked 18.x, Supabase Storage(`media` 버킷), Vitest + @testing-library/react (jsdom).

## Global Constraints

- 어드민 UI는 shadcn/ui 프리미티브(`components/ui/*`) + 디자인 토큰만. 색/간격/타이포/radius/z-index 하드코딩·arbitrary value 금지.
- import는 `@/` alias만 사용.
- 한국어 IME: 키보드 단축키는 `KeyboardEvent.code` 사용(`event.key` 금지).
- TipTap은 어드민 전용 의존성(공개 번들 영향 없음). 새 의존성은 이 4개 패키지로 한정(YAGNI: 표/색상/폰트 확장 금지).
- 저장 계약: hidden input `name="description_blocks"`에 `JSON.stringify(Block[])`. 빈 내용은 `[]`. 서버는 `parseJsonField` + `coerceDescriptionBlocks`로 파싱.
- 저장 시 raw 블록 html은 `sanitizeHtml(html, PROGRAM_SANITIZE_CONFIG)`로 정제하고 `description_verified: true`로 저장한다.
- legacy `description`(마크다운) 컬럼은 폼 hidden으로 기존 값을 보존하며 새로 덮어쓰지 않는다.
- 서식 범위: 문단 / 굵게(strong) / 링크(a) / 불릿 목록(ul·li) / 소제목(h2) / 이미지(img). 이 외 도입 금지.

---

## File Structure

| 파일 | 책임 | 상태 |
|------|------|------|
| `lib/program-blocks-to-html.ts` | `Block[] → HTML` 순수 변환 (기존 데이터 로드용) | 신설 |
| `components/admin/rich-editor-serialize.ts` | `(html, isEmpty) → description_blocks JSON` 순수 직렬화 | 신설 |
| `components/admin/ProgramRichEditor.tsx` | TipTap 에디터 + 툴바 + 이미지 업로드 (`"use client"`) | 신설 |
| `app/api/admin/program-image/route.ts` | 인라인 이미지 업로드 (POST, requireAdmin, media 버킷) | 신설 |
| `components/admin/ProgramForm.tsx` | "설명" 카드를 ProgramRichEditor로 교체, `descriptionInitialHtml` prop | 수정 |
| `app/admin/(protected)/programs/[id]/edit/page.tsx` | 초기 HTML 계산, 미리보기/VerifyCutover 제거 | 수정 |
| `app/admin/actions/programs.ts` | raw 블록 sanitize + `description_verified:true` 저장 | 수정 |
| `components/admin/BlockEditor.tsx` | 폐기 | 삭제 |
| `lib/admin/block-editor-segments.ts` | 폐기 | 삭제 |
| `test/block-editor.test.tsx` | 폐기 | 삭제 |
| `test/block-editor-segments.test.ts` | 폐기 | 삭제 |
| `components/admin/VerifyCutover.tsx` | 폐기 | 삭제 |

---

## Task 1: `blocksToHtml` 변환기

기존 구조화 블록을 에디터 초기 HTML로 바꾸는 순수 함수. 공개 `ProgramBlocks` 렌더 규칙과 1:1로 맞춘다. 텍스트는 HTML escape 한다.

**Files:**
- Create: `lib/program-blocks-to-html.ts`
- Test: `test/program-blocks-to-html.test.ts`

**Interfaces:**
- Consumes: `Block`, `Paragraph`, `Run` from `@/lib/program-blocks`
- Produces: `blocksToHtml(blocks: Block[]): string`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/program-blocks-to-html.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { blocksToHtml } from "@/lib/program-blocks-to-html";
import type { Block } from "@/lib/program-blocks";

describe("blocksToHtml", () => {
  it("plain paragraph → <p>", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [{ text: "hello" }] }])).toBe("<p>hello</p>");
  });

  it("bold run → <strong>", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [{ text: "굵게", bold: true }] }])).toBe(
      "<p><strong>굵게</strong></p>",
    );
  });

  it("href run → <a> with target/rel", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [{ text: "링크", href: "https://x.com" }] }])).toBe(
      '<p><a href="https://x.com" target="_blank" rel="noopener noreferrer">링크</a></p>',
    );
  });

  it("bold + href → nested <a><strong>", () => {
    expect(
      blocksToHtml([{ type: "paragraph", runs: [{ text: "t", bold: true, href: "https://x.com" }] }]),
    ).toBe('<p><a href="https://x.com" target="_blank" rel="noopener noreferrer"><strong>t</strong></a></p>');
  });

  it("empty runs → <p><br></p>", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [] }])).toBe("<p><br></p>");
  });

  it("list → <ul><li><p>", () => {
    const block: Block = { type: "list", items: [[{ runs: [{ text: "a" }] }], [{ runs: [{ text: "b" }] }]] };
    expect(blocksToHtml([block])).toBe("<ul><li><p>a</p></li><li><p>b</p></li></ul>");
  });

  it("image → <img>", () => {
    expect(blocksToHtml([{ type: "image", src: "a.jpg", alt: "설명" }])).toBe('<img src="a.jpg" alt="설명">');
  });

  it("raw → html passthrough", () => {
    expect(blocksToHtml([{ type: "raw", html: "<p>x</p>" }])).toBe("<p>x</p>");
  });

  it("escapes HTML-special characters in text", () => {
    expect(blocksToHtml([{ type: "paragraph", runs: [{ text: "<b>&\"" }] }])).toBe("<p>&lt;b&gt;&amp;&quot;</p>");
  });

  it("joins multiple blocks in order", () => {
    expect(
      blocksToHtml([
        { type: "paragraph", runs: [{ text: "a" }] },
        { type: "image", src: "i.jpg", alt: "" },
      ]),
    ).toBe('<p>a</p><img src="i.jpg" alt="">');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/program-blocks-to-html.test.ts`
Expected: FAIL — "Cannot find module '@/lib/program-blocks-to-html'"

- [ ] **Step 3: 구현**

`lib/program-blocks-to-html.ts`:

```ts
// Block[] → HTML string. Mirrors the public ProgramBlocks renderer so existing
// structured data loads into the WYSIWYG editor unchanged. Text is HTML-escaped;
// raw blocks pass through verbatim (they are sanitized again on save/render).
import type { Block, Paragraph, Run } from "@/lib/program-blocks";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runHtml(run: Run): string {
  let inner = run.bold ? `<strong>${esc(run.text)}</strong>` : esc(run.text);
  if (run.href) {
    inner = `<a href="${esc(run.href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
  }
  return inner;
}

function paragraphHtml(p: Paragraph): string {
  if (p.runs.length === 0) return "<p><br></p>";
  return `<p>${p.runs.map(runHtml).join("")}</p>`;
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((b): string => {
      switch (b.type) {
        case "paragraph":
          return paragraphHtml({ runs: b.runs });
        case "list":
          return `<ul>${b.items.map((item) => `<li>${item.map(paragraphHtml).join("")}</li>`).join("")}</ul>`;
        case "image":
          return `<img src="${esc(b.src)}" alt="${esc(b.alt)}">`;
        case "raw":
          return b.html;
      }
    })
    .join("");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/program-blocks-to-html.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add lib/program-blocks-to-html.ts test/program-blocks-to-html.test.ts
git commit -m "feat(admin): add blocksToHtml converter for WYSIWYG initial value"
```

---

## Task 2: 인라인 이미지 업로드 route handler

에디터에서 파일을 받아 Supabase `media` 버킷에 올리고 public URL을 반환하는 보호된 엔드포인트.

**Files:**
- Create: `app/api/admin/program-image/route.ts`

**Interfaces:**
- Consumes: `requireAdmin` from `@/lib/auth` (`(): Promise<SupabaseClient>`)
- Produces: `POST /api/admin/program-image` — multipart form, field `file`. 성공 `200 { url: string }`, 실패 `400 { error }`(파일 없음/이미지 아님) 또는 `500 { error }`(업로드 실패).

> 이 task는 외부 의존(Supabase Storage + 인증 쿠키)에 묶여 jsdom 단위 테스트가 부적절하다. 구현 후 **브라우저 수동 검증**(Task 3 통합 시 에디터에서 이미지 업로드)으로 확인한다.

- [ ] **Step 1: route handler 구현**

`app/api/admin/program-image/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const supabase = await requireAdmin();

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const path = `program_body/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ url });
}
```

- [ ] **Step 2: 타입/린트 확인**

Run: `npx tsc --noEmit && npx eslint app/api/admin/program-image/route.ts`
Expected: 둘 다 에러 없음(EXIT 0)

- [ ] **Step 3: 커밋**

```bash
git add app/api/admin/program-image/route.ts
git commit -m "feat(admin): add program body image upload endpoint"
```

---

## Task 3: ProgramRichEditor (TipTap) + 직렬화

TipTap 에디터 컴포넌트와, HTML을 저장 계약(`description_blocks` JSON)으로 바꾸는 순수 직렬화 함수.

**Files:**
- Create: `components/admin/rich-editor-serialize.ts`
- Create: `components/admin/ProgramRichEditor.tsx`
- Test: `test/rich-editor-serialize.test.ts`
- Modify: `package.json` (TipTap 의존성 추가)

**Interfaces:**
- Consumes: 업로드 엔드포인트 `POST /api/admin/program-image`
- Produces:
  - `serializeBlocks(html: string, isEmpty: boolean): string` — `isEmpty`면 `"[]"`, 아니면 `JSON.stringify([{type:"raw", html}])`
  - `<ProgramRichEditor name="description_blocks" initialHtml={...} />` — hidden input에 직렬화 결과를 넣는 client 컴포넌트

- [ ] **Step 1: TipTap 설치**

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image
```

Expected: `package.json` dependencies에 5개 패키지 추가됨.

- [ ] **Step 2: 직렬화 실패 테스트 작성**

`test/rich-editor-serialize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serializeBlocks } from "@/components/admin/rich-editor-serialize";

describe("serializeBlocks", () => {
  it("empty editor → []", () => {
    expect(serializeBlocks("<p></p>", true)).toBe("[]");
  });

  it("non-empty → single raw block", () => {
    expect(serializeBlocks("<p>hi</p>", false)).toBe(JSON.stringify([{ type: "raw", html: "<p>hi</p>" }]));
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run test/rich-editor-serialize.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: 직렬화 구현**

`components/admin/rich-editor-serialize.ts`:

```ts
// Pure serialization of editor HTML into the description_blocks storage
// contract. An empty editor stores [] (public page falls back); otherwise the
// whole document is one raw block, sanitized again server-side on save.
import type { Block } from "@/lib/program-blocks";

export function serializeBlocks(html: string, isEmpty: boolean): string {
  const blocks: Block[] = isEmpty ? [] : [{ type: "raw", html }];
  return JSON.stringify(blocks);
}
```

- [ ] **Step 5: 직렬화 테스트 통과 확인**

Run: `npx vitest run test/rich-editor-serialize.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: ProgramRichEditor 구현**

`components/admin/ProgramRichEditor.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { serializeBlocks } from "@/components/admin/rich-editor-serialize";

function ToolbarButton({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={!!active}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Toolbar({ editor, onPickImage }: { editor: Editor; onPickImage: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
      <ToolbarButton label="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        굵게
      </ToolbarButton>
      <ToolbarButton
        label="소제목"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        소제목
      </ToolbarButton>
      <ToolbarButton label="목록" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        목록
      </ToolbarButton>
      <ToolbarButton
        label="링크"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("링크 URL", prev ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
      >
        링크
      </ToolbarButton>
      <ToolbarButton label="이미지" onClick={onPickImage}>
        이미지
      </ToolbarButton>
    </div>
  );
}

export function ProgramRichEditor({ name, initialHtml }: { name: string; initialHtml: string }) {
  const [serialized, setSerialized] = useState(() =>
    serializeBlocks(initialHtml, initialHtml.trim() === ""),
  );
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false, // required under Next SSR
    extensions: [
      StarterKit.configure({ heading: { levels: [2] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      Image,
    ],
    content: initialHtml,
    editorProps: { attributes: { class: "prose-dark min-h-40 rounded-b-lg p-3 outline-none" } },
    onUpdate: ({ editor }) => setSerialized(serializeBlocks(editor.getHTML(), editor.isEmpty)),
  });

  async function uploadImage(file: File) {
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/program-image", { method: "POST", body: fd });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "이미지 업로드에 실패했습니다.");
      return;
    }
    const { url } = (await res.json()) as { url: string };
    editor?.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={serialized} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadImage(file);
          e.target.value = "";
        }}
      />
      <div className="rounded-lg border border-input p-2">
        {editor && <Toolbar editor={editor} onPickImage={() => fileRef.current?.click()} />}
        <EditorContent editor={editor} />
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 7: 타입/린트 확인**

Run: `npx tsc --noEmit && npx eslint components/admin/ProgramRichEditor.tsx components/admin/rich-editor-serialize.ts`
Expected: 에러 없음(EXIT 0)

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json components/admin/ProgramRichEditor.tsx components/admin/rich-editor-serialize.ts test/rich-editor-serialize.test.ts
git commit -m "feat(admin): add TipTap ProgramRichEditor and block serialization"
```

---

## Task 4: 통합 — ProgramForm / edit page / 저장 액션

에디터를 폼에 연결하고, 서버에서 초기 HTML을 계산하며, 저장 시 raw 블록을 sanitize하고 verified=true로 둔다. 미리보기·검증 게이트를 제거한다.

**Files:**
- Modify: `components/admin/ProgramForm.tsx`
- Modify: `app/admin/(protected)/programs/[id]/edit/page.tsx`
- Modify: `app/admin/actions/programs.ts`
- Test: `test/programs-save.test.ts` (신설)

**Interfaces:**
- Consumes: `blocksToHtml` (Task 1), `ProgramRichEditor` (Task 3), `marked`, `sanitizeHtml`, `PROGRAM_SANITIZE_CONFIG`
- Produces: `sanitizeRawBlocks(blocks: Block[]): Block[]` (export from `app/admin/actions/programs.ts`)

- [ ] **Step 1: 저장 액션 sanitize 헬퍼 실패 테스트 작성**

`test/programs-save.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sanitizeRawBlocks } from "@/app/admin/actions/programs";
import type { Block } from "@/lib/program-blocks";

describe("sanitizeRawBlocks", () => {
  it("strips disallowed tags from raw block html", () => {
    const blocks: Block[] = [{ type: "raw", html: '<p>ok</p><script>alert(1)</script>' }];
    const out = sanitizeRawBlocks(blocks);
    expect(out[0]).toEqual({ type: "raw", html: "<p>ok</p>" });
  });

  it("keeps allowed formatting (strong, a, ul, img, h2)", () => {
    const html = '<h2>제목</h2><p><strong>b</strong> <a href="https://x.com">l</a></p><ul><li>i</li></ul><img src="a.jpg" alt="a" />';
    const out = sanitizeRawBlocks([{ type: "raw", html }]);
    expect(out[0].type).toBe("raw");
    const kept = (out[0] as { html: string }).html;
    expect(kept).toContain("<h2>제목</h2>");
    expect(kept).toContain("<strong>b</strong>");
    expect(kept).toContain('href="https://x.com"');
    expect(kept).toContain("<li>i</li>");
    expect(kept).toContain('src="a.jpg"');
  });

  it("leaves non-raw blocks untouched", () => {
    const blocks: Block[] = [{ type: "paragraph", runs: [{ text: "x" }] }];
    expect(sanitizeRawBlocks(blocks)).toEqual(blocks);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/programs-save.test.ts`
Expected: FAIL — `sanitizeRawBlocks` is not exported

- [ ] **Step 3: 저장 액션 수정**

`app/admin/actions/programs.ts` 상단 import에 추가:

```ts
import sanitizeHtml from "sanitize-html";
import { PROGRAM_SANITIZE_CONFIG } from "@/lib/program-sanitize";
```

`reconcileBlockImages` 함수 바로 아래에 추가:

```ts
// WYSIWYG stores the whole document as one raw block. Sanitize it on save so a
// dangerouslySetInnerHTML sink is never fed unsanitized stored HTML.
export function sanitizeRawBlocks(blocks: Block[]): Block[] {
  return blocks.map((b) =>
    b.type === "raw" ? { type: "raw" as const, html: sanitizeHtml(b.html, PROGRAM_SANITIZE_CONFIG) } : b,
  );
}
```

`createProgram`에서 insert 직전 `blocks` 계산을 교체:

```ts
  const blocks = sanitizeRawBlocks(
    await reconcileBlockImages(
      supabase,
      fd,
      coerceDescriptionBlocks(parseJsonField(fd.get("description_blocks"), "description_blocks")),
    ),
  );
  const { error } = await supabase.from("programs").insert({ ...values, description_blocks: blocks, description_verified: true });
```

`updateProgram`에서도 동일하게 교체:

```ts
  const blocks = sanitizeRawBlocks(
    await reconcileBlockImages(
      supabase,
      fd,
      coerceDescriptionBlocks(parseJsonField(fd.get("description_blocks"), "description_blocks")),
    ),
  );
  const { error } = await supabase.from("programs").update({ ...values, description_blocks: blocks, description_verified: true }).eq("id", id);
```

- [ ] **Step 4: 액션 테스트 통과 확인**

Run: `npx vitest run test/programs-save.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: ProgramForm 수정 — 에디터 교체**

`components/admin/ProgramForm.tsx`:

import 교체 — `BlockEditor` import 제거, 추가:

```tsx
import { ProgramRichEditor } from "@/components/admin/ProgramRichEditor";
```

props 인터페이스 수정:

```tsx
interface ProgramFormProps {
  program?: Program;
  descriptionInitialHtml?: string;
  action: (fd: FormData) => void | Promise<void>;
}

export function ProgramForm({ program, descriptionInitialHtml, action }: ProgramFormProps) {
```

"설명" 카드의 `CardContent` 내부(현재 `<BlockEditor .../>` + hidden description)를 교체:

```tsx
        <CardContent>
          <ProgramRichEditor name="description_blocks" initialHtml={descriptionInitialHtml ?? ""} />
          {/* Preserve the legacy description column so the public fallback is never lost on save */}
          <input type="hidden" name="description" value={program?.description ?? ""} />
        </CardContent>
```

- [ ] **Step 6: edit page 수정 — 초기 HTML 계산 + 미리보기/검증 제거**

`app/admin/(protected)/programs/[id]/edit/page.tsx` 전체를 교체:

```tsx
import { notFound } from "next/navigation";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { PROGRAM_SANITIZE_CONFIG } from "@/lib/program-sanitize";
import { ProgramForm } from "@/components/admin/ProgramForm";
import { updateProgram, deleteProgram } from "@/app/admin/actions/programs";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";
import { blocksToHtml } from "@/lib/program-blocks-to-html";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapProgram } from "@/lib/data/programs";
import type { Block } from "@/lib/program-blocks";

interface Props {
  params: Promise<{ id: string }>;
}

async function computeInitialHtml(blocks: Block[] | null, description: string | null): Promise<string> {
  // Already-WYSIWYG: a single raw block holds the document verbatim.
  if (blocks && blocks.length === 1 && blocks[0].type === "raw") return blocks[0].html;
  // Structured blocks: convert to HTML for editing.
  if (blocks && blocks.length > 0) return blocksToHtml(blocks);
  // Legacy markdown fallback.
  if (description) return sanitizeHtml(await marked.parse(description), PROGRAM_SANITIZE_CONFIG);
  return "";
}

export default async function EditProgramPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const program = mapProgram(data);
  const initialHtml = await computeInitialHtml(program.description_blocks, program.description);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gold">프로그램 수정: {program.title}</h1>
        <ViewOnSiteLink href={`/programs/${program.slug}`} />
      </div>

      <ProgramForm
        program={program}
        descriptionInitialHtml={initialHtml}
        action={updateProgram.bind(null, id)}
      />
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-muted-foreground text-xs mb-3">위험 구역</p>
        <DeleteButton onDelete={deleteProgram.bind(null, id)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 타입/린트/전체 테스트 확인**

Run: `npx tsc --noEmit && npx eslint components/admin/ProgramForm.tsx "app/admin/(protected)/programs/[id]/edit/page.tsx" app/admin/actions/programs.ts && npx vitest run`
Expected: tsc/eslint EXIT 0. vitest는 일부 실패 가능(폐기 대상 `block-editor*.test`, `program-form.test`가 옛 BlockEditor를 참조). 이는 Task 5에서 정리한다. 신규/수정 테스트(`program-blocks-to-html`, `rich-editor-serialize`, `programs-save`)는 PASS여야 한다.

- [ ] **Step 8: 커밋**

```bash
git add components/admin/ProgramForm.tsx "app/admin/(protected)/programs/[id]/edit/page.tsx" app/admin/actions/programs.ts test/programs-save.test.ts
git commit -m "feat(admin): wire WYSIWYG editor into ProgramForm and save action"
```

---

## Task 5: 폐기 / 정리

블록 에디터·세그먼트·검증 게이트와 관련 테스트를 제거하고, 남은 참조를 정리한다.

**Files:**
- Delete: `components/admin/BlockEditor.tsx`
- Delete: `lib/admin/block-editor-segments.ts`
- Delete: `test/block-editor.test.tsx`
- Delete: `test/block-editor-segments.test.ts`
- Delete: `components/admin/VerifyCutover.tsx`
- Modify: `app/admin/actions/programs.ts` (미사용 `setProgramVerified` 제거)
- Modify: `test/program-form.test.tsx` (옛 BlockEditor 가정 제거 — 아래 Step에서 확인)

**Interfaces:**
- Consumes: 없음 (제거 작업)
- Produces: 없음

- [ ] **Step 1: 참조 잔존 확인**

```bash
grep -rln "BlockEditor\|block-editor-segments\|VerifyCutover\|setProgramVerified" app components lib test
```

Expected: 위 5개 파일 외에 참조가 있으면 그 파일도 수정 대상. (edit page는 Task 4에서 이미 import 제거됨.)

- [ ] **Step 2: 파일 삭제**

```bash
git rm components/admin/BlockEditor.tsx lib/admin/block-editor-segments.ts test/block-editor.test.tsx test/block-editor-segments.test.ts components/admin/VerifyCutover.tsx
```

- [ ] **Step 3: `setProgramVerified` 액션 제거**

`app/admin/actions/programs.ts`에서 `setProgramVerified` 함수 전체(72–79행 상당)를 삭제한다. (VerifyCutover가 유일 호출자였고 함께 제거됨.)

- [ ] **Step 4: `program-form.test.tsx` 점검/수정**

Run: `npx vitest run test/program-form.test.tsx`

옛 BlockEditor 동작(문단/블록 추가 등)을 단언하는 케이스가 있으면, "설명" 영역에 대한 단언을 **에디터 컨테이너 존재**로 단순화한다. 예: hidden input `name="description_blocks"`가 렌더되고, 다른 폼 필드(title/slug 등)가 정상 동작하는지만 확인. TipTap 인스턴스 내부 동작은 단언하지 않는다(jsdom 한계 — 직렬화는 Task 3에서 순수 함수로 검증됨).

> 만약 `program-form.test.tsx`가 jsdom에서 TipTap 마운트로 깨지면, 해당 테스트에서 ProgramRichEditor를 `vi.mock("@/components/admin/ProgramRichEditor", () => ({ ProgramRichEditor: ({ name }: { name: string }) => <input type="hidden" name={name} /> }))`로 모킹해 폼 레벨 동작만 검증한다.

- [ ] **Step 5: 전체 검증**

Run: `npx tsc --noEmit && npx eslint . && npx vitest run`
Expected: tsc EXIT 0, eslint 클린, 모든 테스트 PASS.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "chore(admin): remove block editor, segments, and verify-cutover gate"
```

---

## 수동 검증 (전체 완료 후)

1. dev 서버에서 기존 프로그램(`/admin/programs/<id>/edit`) 열기 → "설명"이 위지윅 에디터로 기존 내용(굵게/목록/이미지 포함)을 보여주는지.
2. 본문 편집(굵게/소제목/목록/링크) 후 저장 → 공개 페이지(`/programs/<slug>`)에 그대로 반영되는지.
3. 에디터에서 이미지 업로드 → `media` 버킷 저장 + 본문 삽입 + 저장 후 공개 페이지 표시.
4. 신규 생성(`/admin/programs/new`)에서 빈 에디터로 작성 → 저장 → 공개 표시.
5. 스크립트/비허용 태그를 붙여넣어도 저장·렌더 시 제거되는지(이중 sanitize).

> 공유 프로덕션 데이터에 저장/검증을 누르는 것은 사용자 승인 후에만. 조사·로드 확인은 저장 없이 수행.
