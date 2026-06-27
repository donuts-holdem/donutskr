# 프로그램 설명 WYSIWYG 에디터 전환 — 설계 문서

**작성일:** 2026-06-27
**상태:** 설계 승인 대기 (사용자 리뷰 중)

## 목표

어드민의 프로그램 "설명" 입력을 블록 에디터(`BlockEditor`)에서 **WYSIWYG(rich text) 에디터**로 전환한다. 운영자가 위지윅으로 작성한 내용이 공개 프로그램 페이지에 **그대로** 렌더된다. "작성 화면 = 결과 화면"을 달성해, 블록 카드(문단/목록/이미지/서식 문단)가 공개 화면과 닮지 않아 생기던 혼란을 없앤다.

## 배경 / 현황

- `programs` 테이블에는 설명 관련 컬럼이 셋 있다: `description`(마크다운/HTML 텍스트, legacy), `description_blocks`(jsonb `Block[]`), `description_verified`(boolean).
- 공개 페이지(`app/(site)/programs/[slug]/page.tsx`)는 `description_verified && 블록 있음 && 표시할 내용 있음`이면 `<ProgramBlocks>`로 블록을, 아니면 `description`을 `marked.parse` → `sanitizeHtml` → `dangerouslySetInnerHTML`로 렌더한다.
- `ProgramBlocks`(`components/program/ProgramBlocks.tsx`)는 `raw` 블록을 `sanitizeHtml(html, PROGRAM_SANITIZE_CONFIG)` 후 `dangerouslySetInnerHTML`로 렌더한다 — **임의 HTML을 안전하게 렌더하는 경로가 이미 존재**.
- 현재 블록 시스템은 원래 "마크다운 → 구조화 블록" 마이그레이션의 산물이며, `description_verified`로 전환을 게이트하고 어드민 edit 페이지에 "렌더러 비교 미리보기" + `VerifyCutover`를 둔다.
- 업로드는 `lib/upload.ts`의 `uploadIfPresent`가 담당: Supabase Storage `media` 버킷, 경로 `${field}/${Date.now()}-${file.name}`, public URL 반환.
- TipTap/ProseMirror는 **미설치** — 새 의존성으로 추가한다(어드민 전용, 공개 번들 영향 없음).

## 범위

### 위지윅으로 전환하는 것
- 프로그램 **"설명" 본문** 영역만. 공개 페이지에서 좌측 본문(현재 `description_blocks`가 차지하는 자리)에 해당.

### 폼 입력으로 유지하는 것 (변경 없음)
- 카테고리, 제목, 슬러그, 그룹, 상태, 시작/종료일, 지역, 인원, **커버 이미지**, **담당자**(이름·역할·아바타), **CTA**(라벨·링크), external_url, 노출 설정(HOT/제휴/노출/순서).
- 공개 페이지 레이아웃(히어로 메타, 우측 담당자 카드, CTA 버튼, HOT 프로그램 등)도 그대로.

### 명시적으로 범위 밖 (별도 작업)
- **기존 외부 이미지 백필** — 외부 URL(framerusercontent 등) 이미지를 다운로드해 Supabase로 옮기고 DB URL을 교체하는 작업. 본문 이미지뿐 아니라 커버·아바타·포스터·스폰서 로고·시즌 히어로 등 사이트 전역에 걸치고, 프로덕션 스토리지 쓰기 + 외부 다운로드 + 되돌리기 설계가 필요하므로 **이 spec 이후 별도 spec으로** 진행한다.

## 아키텍처 / 데이터 흐름

### 저장 (DB 스키마 변경 없음)
TipTap이 출력하는 HTML을 기존 `description_blocks`에 **단일 `raw` 블록** `[{ type: "raw", html }]`으로 저장하고 `description_verified = true`로 둔다.

```
TipTap → HTML 문자열 → 서버 액션에서 sanitizeHtml() → description_blocks = [{type:"raw", html}], description_verified=true
```

- 공개 페이지는 이미 `raw` 블록을 sanitize 렌더하므로 **공개 렌더 경로는 사실상 그대로**.
- 새 컬럼/마이그레이션(DDL) 불필요 → 빠르고 되돌리기 쉬움.
- `description`(legacy 마크다운) 컬럼은 폼 hidden으로 기존 값을 **보존**(공개 fallback 안전), 새로 덮어쓰지 않는다.

### 로드 (기존 데이터 → 에디터 초기값)
초기 HTML은 **서버 컴포넌트(edit page)에서 계산**해 `ProgramForm`에 prop으로 전달한다. `blocksToHtml`(순수)과 `marked.parse`(서버)를 서버에서 실행하므로 클라이언트 번들에 marked가 들어가지 않는다. 우선순위:
1. `description_blocks`에 `raw` 블록이 있으면 → 그 `html`을 그대로 사용(이미 위지윅으로 저장된 경우).
2. `description_blocks`(구조화: paragraph/list/image/run)가 있으면 → **새 변환기 `blocksToHtml`**로 HTML 생성.
3. 둘 다 없고 `description`(마크다운)만 있으면 → `marked.parse`로 HTML 생성.
4. 아무것도 없으면(신규 생성 포함) → 빈 문자열 → 빈 에디터.

저장 전까지 원본(`description_blocks`/`description`)은 DB에서 변경되지 않고, **저장 시점에** raw HTML로 굳어진다.

## 컴포넌트 / 파일 구조

### 신설
- `components/admin/ProgramRichEditor.tsx` (`"use client"`) — TipTap 에디터 + 툴바. props: `{ name: string; initialHtml: string }`. hidden input(`name="description_blocks"`)에 `JSON.stringify([{type:"raw", html}])`를 직렬화(저장 계약 유지). 빈 내용이면 `[]` 직렬화.
- `lib/program-blocks-to-html.ts` — 순수 함수 `blocksToHtml(blocks: Block[]): string`. `ProgramBlocks` 렌더 규칙과 동일하게 paragraph→`<p>`, bold run→`<strong>`, href run→`<a>`, list→`<ul><li>`, image→`<img>`, raw→html 그대로. 단위 테스트 대상.
- `app/api/admin/program-image/route.ts` — **인라인 이미지 업로드 route handler**(POST). `requireAdmin`으로 보호, 이미지 MIME만 허용, File 수신 → `media` 버킷에 `program_body/${Date.now()}-${name}` 업로드 → `{ url }` JSON 반환. (`uploadIfPresent`의 버킷·public URL 패턴 차용)

### 수정
- `components/admin/ProgramForm.tsx` — "설명" 카드의 `BlockEditor` → `ProgramRichEditor`로 교체. 새 prop `descriptionInitialHtml?: string`을 받아 그대로 `ProgramRichEditor`의 `initialHtml`로 전달(미전달 시 빈 문자열 → 신규 생성). `description` legacy 보존 hidden input 유지.
- `app/admin/(protected)/programs/new/page.tsx` — `ProgramForm`에 `descriptionInitialHtml`을 전달하지 않음(빈 에디터). 그 외 변경 없음.
- `app/admin/actions/programs.ts` — `create/updateProgram`: `description_blocks` 파싱 후 raw 블록의 `html`에 `sanitizeHtml(PROGRAM_SANITIZE_CONFIG)` 적용. `description_verified: true` 저장. 인라인 업로드는 별도 엔드포인트가 처리하므로 `reconcileBlockImages`의 `block_image_N` 경로는 위지윅에서는 사용되지 않음(기존 데이터/다른 호출 경로를 위해 함수는 유지하되 raw 블록에는 영향 없음).
- `app/admin/(protected)/programs/[id]/edit/page.tsx` — "렌더러 비교 미리보기" 섹션과 `<VerifyCutover>` 제거. 위 로드 규칙으로 `descriptionInitialHtml`을 계산해 `ProgramForm`에 전달.

### 제거 / 폐기
- `components/admin/BlockEditor.tsx`(세그먼트화 버전 포함), `lib/admin/block-editor-segments.ts`, `test/block-editor-segments.test.ts`, `test/block-editor.test.tsx`. — 위지윅이 대체.
- `components/admin/VerifyCutover.tsx` 및 edit 페이지에서의 사용. `setProgramVerified` 액션은 더 이상 UI에서 호출되지 않음(액션 자체는 남겨도 무방하나, 미사용이면 제거 검토).

### 영향 없음 (변경하지 않음)
- `components/program/ProgramBlocks.tsx`(raw 블록 렌더 경로 그대로), `lib/program-sanitize.ts`, 공개 `programs/[slug]/page.tsx`의 렌더 분기(raw 블록 경로 유지), 다른 어드민 폼(Event/Season/SpecialPage/Tab), `lib/program-blocks.ts` 타입.

## 서식 범위 (sanitize 허용 태그에 맞춤)

`PROGRAM_SANITIZE_CONFIG` 허용: sanitize 기본 태그 + `img`, `h1`, `h2`; `a`(href/name/target/rel), `img`(src/alt/title/width/height); 스킴 http/https/mailto.

위지윅 툴바/확장: **문단, 굵게(strong), 링크(a), 불릿 목록(ul/li), 소제목(h2), 이미지(img)**. TipTap `StarterKit`(문단·굵게·목록·제목 등) + `Link` + `Image`. 기울임(em)은 기본 허용 태그이므로 선택적으로 포함 가능. YAGNI: 표/색상/폰트 등은 도입하지 않는다.

## 이미지 업로드 흐름

1. 운영자가 에디터 툴바의 이미지 버튼 클릭 → 파일 선택.
2. 클라이언트가 인라인 업로드 엔드포인트(`requireAdmin` 보호)로 File 전송.
3. 엔드포인트가 `media` 버킷에 업로드 후 public URL 반환.
4. TipTap `Image` 노드로 본문 커서 위치에 삽입.
5. 저장 시 해당 `<img src>`가 HTML에 포함되어 raw 블록으로 직렬화.

업로드 실패 시 에디터에 인라인 에러 메시지를 표시하고 본문은 변경하지 않는다.

## 보안 / 에러 처리

- **이중 sanitize**: 저장 시 서버 액션에서 `sanitizeHtml(PROGRAM_SANITIZE_CONFIG)`, 공개 렌더 시 `ProgramBlocks`가 다시 sanitize.
- 인라인 업로드 엔드포인트는 `requireAdmin` 게이트, 이미지 MIME만 허용.
- `description_blocks` 직렬화는 기존 `parseJsonField`(엄격 파싱; 형식 오류 시 `app/admin/error.tsx`가 처리) 계약 유지.
- 에디터가 비어 있으면 `description_blocks = []` 저장 → 공개 페이지는 fallback(`description` 마크다운 또는 없음).

## 테스트 전략

- `blocksToHtml` 단위 테스트(Vitest, 순수 함수): paragraph/bold/href/list/image/raw, 빈 입력, 혼합.
- 저장 액션: raw 블록 + `description_verified=true` 직렬화, html이 sanitize되는지(스크립트/비허용 태그 제거).
- 컴포넌트(jsdom): `ProgramRichEditor`가 초기 HTML을 로드하고 hidden input에 raw 블록 JSON을 직렬화하는지. (TipTap의 jsdom 호환성 확인 필요 — 위험요소 참조)
- 공개 렌더 회귀: raw 블록 HTML이 공개 페이지에서 sanitize되어 렌더되는지(기존 `program-blocks-render` 테스트 보강).

## 위험 요소

1. **TipTap의 jsdom 테스트 호환성** (중간) — ProseMirror는 DOM에 의존. 컴포넌트 단위 테스트가 어려우면 로직(직렬화/`blocksToHtml`)을 순수 함수로 분리해 테스트하고, 에디터 자체는 브라우저 수동 검증으로 보완.
2. **기존 데이터 변환 충실도** (중간) — `blocksToHtml`가 기존 구조화 블록을 손실 없이 HTML로 옮겨야 함. 라운드트립(blocks → html → 공개 렌더)이 기존 표시와 동일한지 실데이터로 검증.
3. **의존성 크기** (낮음) — TipTap/ProseMirror 추가. 어드민 전용 청크라 공개 사이트 성능 영향 없음.
4. **인라인 업로드 엔드포인트 신규** (낮음) — 기존 `uploadIfPresent` 패턴을 따르되 클라이언트→서버 단발 업로드 경로를 새로 만든다.

## 미해결 / 후속

- 기존 외부 이미지 백필(별도 spec).
- `setProgramVerified`/`description_verified` 컬럼의 장기 처리(위지윅 전환 후 항상 true이므로 사실상 의미 상실 — 즉시 제거 대신 미사용으로 두고 백필 작업 때 정리 검토).
