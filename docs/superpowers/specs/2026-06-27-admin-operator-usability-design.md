# DO:NUTS 어드민 운영자화(化) — 설계 문서

- **작성일:** 2026-06-27
- **개정:** 2026-06-27 (designer + QA subagent 리뷰 반영)
- **브랜치:** 별도 작업 브랜치 권장 (`feat/admin-operator-usability`)
- **상태:** 설계 확정 대기 (사용자 spec 리뷰)

## 1. 배경 / 문제 정의

`/admin`은 8개 섹션의 CRUD가 구현되어 있으나, **개발자용 테이블 편집기**처럼 동작해 비개발자(한국어) 운영자가 쓰기 매우 어렵다. 정적 코드 감사(QA + product 관점)와 **라이브 브라우저 조작 조사**(운영자 시나리오 직접 수행)로 다음을 확인했다.

### 1.1 라이브 사용성 조사 결과 (Phase 0 산출물 — 이미 수행 완료)

실제 어드민에 로그인해 화면을 조작하며 확인한 마찰점:

| # | 화면 | 확인된 문제 |
|---|------|------------|
| L1 | 대시보드 `/admin` | 사이드바 8개 섹션 중 카드 2개(시즌·이벤트)만 노출. 같은 기능을 사이드바 "일정" vs 카드 "이벤트 관리"로 다르게 호칭. 운영 현황(카운트·임박 이벤트·라이브 링크) 전무. |
| L2 | 이벤트 생성 | 카테고리 드롭다운 `festival/confirmed/upcoming/completed`, 상태 `scheduled` 등 **영어**. "festival"(유형)과 상태값이 한 드롭다운에 섞여 의미 불명확. 시간 필드가 `예: 14:00` 자유텍스트(`type="time"` 아님). 회차·이벤트타입·요일 자유텍스트, 요일은 날짜에서 자동 안 채워짐. |
| L3 | 프로그램 수정 | 설명란에 Framer에서 복사한 **raw HTML 덩어리**(`<img src><p dir="auto"><strong>…<ul><li data-preset-tag>`)가 그대로 들어 있어 사람이 손볼 수 없음. 카테고리="커뮤니티"(자유텍스트) vs 그룹="poker"(영어 드롭다운) 혼재. 상태="모집 중" 자유 입력(고정 어휘여야 함). 커버 이미지 = URL 문자열, 썸네일 없음. |
| L4 | 프로그램 목록 | 그룹 컬럼 poker/social/others **영어**. HOT·제휴·노출 = ●/○ 점만(텍스트·aria 없음, 켜짐/꺼짐 모호, 스크린리더 불가 — WCAG 1.4.1·4.1.2 위반). |
| L5 | 특수페이지 수정 | 필드 라벨에 문자 그대로 **"갤러리 (JSON 배열)", "정보 카드 (JSON 배열, 예: [{\"label\":\"\",\"value\":\"\"}])", "노트 목록 (JSON 배열)"**. 노트 목록은 모든 항목이 한 줄 JSON으로 뭉쳐 편집 불가. 오타 1개면 저장은 "성공"하나 내용 조용히 전체 삭제. |
| L6 | 시즌 목록 | 코드 `spring` **영어**. 이 시즌이 `/series`에 노출된다는 안내·"사이트에서 보기" 링크 전무. 삭제 버튼이 확인 절차 없이 인접. |
| L7 | 공통 | 저장 후 성공 메시지 없음, "사이트에서 보기" 링크 없음, 삭제 확인 없음, 한글 에러 바운더리 없음. |

### 1.2 정적 감사로 추가 확인된 구조적 문제

QA subagent가 file:line으로 모두 검증함.

- **고아 탭 섹션:** `navigation_tabs` CRUD가 풀로 존재하나 공개 헤더(`components/site/Header.tsx`)는 하드코딩 `NAV_LINKS` 배열이라 어떤 탭도 렌더되지 않음. `lib/data/tabs.ts`의 `getVisibleTabs`는 import하는 공개 컴포넌트가 0개.
- **가짜 시즌↔이벤트 관계:** 이벤트 폼에서 `season_id`를 지정하지만(`components/admin/EventForm.tsx:41`), `lib/data/events.ts`의 `getEvents()`는 `category`/`is_visible`로만 필터링하고 `season_id`를 안 씀. 공개 소비자(`app/(site)/page.tsx`, `app/(site)/schedule/page.tsx`, `app/sitemap.ts`)도 시즌 미사용. 시즌 활성화는 `/series` 문구만 바꿈. 죽은 시즌 필드: `theme_color`, `footer_sponsor_visible`(공개 소비자 0).
- **silent 데이터 유실 (write-path 한정):** 쓰기 액션 `app/admin/actions/specialPages.ts:9-11`, `app/admin/actions/onlineLeague.ts:8-10`, `app/admin/actions/siteConfig.ts:9-11`의 `try { JSON.parse } catch { return fallback }`가 파싱 실패 시 빈 값으로 fallback → 운영자 오타가 콘텐츠를 조용히 삭제. (읽기 매퍼 `lib/data/*`는 이미 파싱된 jsonb를 `Array.isArray ? x : []`로 받으므로 읽기 경로는 안전. 동명 파일이 `lib/data/`에도 있으니 경로 주의.)

### 1.4 프로그램 설명 콘텐츠 인벤토리 (블록 에디터 타당성 — 브라우저로 표본 조사)

prod DB 직접 조회는 미승인이므로, 승인된 브라우저 세션에서 어드민 수정 화면의 `description` textarea 원문을 그룹별로 4개 표본 조사(donutslab/poker, DO:LAB/others, 대선포커/social, 도너츠 시리즈/poker). **결과: 전 표본이 동일한 Framer 내보내기 구조.**

- 사용 태그(전 표본 공통): `img`(헤더 이미지) · `p`(문단, `dir="auto"`) · `strong`(이모지+굵은 글머리) · `ul > li[data-preset-tag="p"] > p`(불릿) · `br`. 표본에서 `a`(링크)·`h1/h2`(제목)는 미관측이나 sanitize 설정이 허용하므로 모델에 안전하게 포함.
- 비(非)콘텐츠 속성: `data-preset-tag`, `dir="auto"`는 표현용 → 변환 시 폐기해도 콘텐츠 무손실. 이모지는 텍스트로 보존.
- **결론:** 구조가 규칙적이고 작아 블록 모델로 거의 무손실 변환 가능. 핵심 요건은 문단/리스트 항목이 **인라인 굵게(+링크) 마크를 보존**하는 것(평문 블록이면 안 됨). (표본 4/23 — 전수 아님. `raw` 이스케이프 블록을 안전망으로 유지.)

## 2. 확정된 제품 결정 (사용자 승인)

1. **범위:** 감사 전체를 **단계적**으로 수행.
2. **시즌↔이벤트:** 실제로 **연결**(활성 시즌의 이벤트를 홈/일정에 노출 — null 시즌 처리 규칙은 §2.1 참조).
3. **탭 섹션:** 헤더 연동은 별도 대형 작업이므로 **지금은 숨김**(라우트 유지, 사이드바/대시보드에서 제거).
4. **설명 편집:** **구조화 블록 에디터로 확정.** 근거는 §1.4의 실제 콘텐츠 인벤토리 — 모든 표본이 소수의 규칙적 구조(헤더 이미지 + 문단 + 굵은 글머리 불릿)라 블록으로 거의 무손실 매핑됨. 비개발자 운영자에게 raw HTML/마크다운보다 블록 편집이 적합. 마크다운 대안은 §5.1에 기각 사유와 함께 기록.

### 2.1 사전 확정 결정 (리뷰 지적 — 코딩 전 확정)

리뷰어들이 "번역 작업으로 위장된 데이터모델 결정"이라 지적한 항목을 여기서 확정한다.

- **이벤트 "카테고리" 필드:** 현재 `festival/confirmed/upcoming/completed`로 *유형*과 *상태*가 혼재. → **유형(type)으로 정의**하고 상태성 값(confirmed/upcoming/completed)은 제거, 한글 유형 어휘로 재정의. Phase 2 착수 시 공개 소비 경로(`lib/schedule.ts`) 30분 트레이스로 실제 효과 확정 후 최종 어휘 결정. (status와 역할 분리)
- **죽은 시즌 필드:** `theme_color`, `footer_sponsor_visible` → **제거**(Phase 4, 공개 소비자 없음 확인됨).
- **명칭 통일:** 엔티티 기준 **"이벤트"로 통일**. 사이드바 "일정" → "이벤트"로 변경(대시보드 카드·페이지 H1·액션과 일치). 공개 라우트 `/schedule`는 유지.
- **null `season_id` 규칙:** §Phase 4 참조 — null 시즌 이벤트는 **상시 노출(evergreen)**.

## 3. 기존 자산 (재사용 대상, 새로 만들지 말 것)

- 한글 라벨 맵이 이미 존재:
  - `lib/program-display.ts` → `PROGRAM_STATUS_LABELS`(recruiting/ongoing/closed/completed → 모집중/진행중/마감/종료), `PROGRAM_CATEGORIES`(poker/social/others → 포커/소셜/기타), `isOpenStatus`(영/한 모두 정규식 매칭).
  - `components/schedule/StatusBadge.tsx` → `LABEL`(EventStatus → 예정/확정/진행중/레지마감/완료/취소/숨김). 타입은 `lib/types.ts` `EventStatus`.
  - `components/league/LeagueStatusBlock.tsx` → 리그 상태 한글 타이틀.
- **반복 행 에디터 선례:** `components/admin/BlindStructureEditor.tsx`가 이미 **이종(異種) 타입 행 + 추가/삭제/정렬 + FormData 직렬화**를 구현. Phase 1·5의 패턴 기준점으로 삼는다(처음부터 새로 설계하지 말 것).
- 프로그램 설명은 `app/(site)/programs/[slug]/page.tsx:76-85`에서 `marked.parse()` + `sanitizeHtml`로 렌더(img/h1/h2 허용). 이벤트·특수페이지 설명은 `whitespace-pre-line` 평문 렌더(계약이 다름 — §Phase 6에서 통일 검토).
- 이미지 업로드 플로우: `lib/upload.ts`의 `uploadIfPresent`.
- 어드민 UI는 shadcn 프리미티브(`components/ui/*`). admin에서 input/button 직접 제작 금지. 삭제 확인·토스트도 shadcn(AlertDialog, sonner)로.

## 4. 단계별 설계

각 단계는 **독립적으로 머지 가능**하며, 끝에 **사용성 검증 게이트**(브라우저로 운영자 시나리오 수행) + **자동화 테스트**(§8)를 둔다. 기존 테스트 스위트는 순수 jsdom 단위 테스트(`vitest run`, DB 미접근)이므로, 신규 테스트도 순수 헬퍼 추출 후 단위 테스트하는 방식을 따른다.

### Phase 0 — 사용성 베이스라인 ✅ 완료
§1.1의 라이브 조사로 완료. 산출물 = 위 마찰점 표 + 정적 감사 백로그.

### Phase 1 — 데이터 유실 방지 + 안전장치 (최우선)
**목표:** 운영자 실수로 콘텐츠가 사라지지 않게 하고, 위험 동작에 가드를 건다.

- `lib/admin/useRepeatableRows.ts` (신규 훅): 행 추가/삭제/정렬/키 관리 — 저수준 공통 로직.
- `components/admin/RepeatableFieldEditor.tsx` (신규): `useRepeatableRows` 위에 구축. **동종 스칼라 행** 전용. variant: `string[]`(노트), `{label,value}[]`(정보 카드), `{name,logo}[]`(스폰서), 이미지 URL 배열(+업로드). 행별 렌더 함수로 파라미터화. (이종 블록 에디터는 Phase 5의 별도 컴포넌트 — 이 컴포넌트를 늘리지 않음.)
- **관용적 역직렬화:** 레거시/부분 형태(예: `info_cards` 원소에 `label` 누락)도 필드 손실 없이 방어적으로 렌더.
- raw JSON textarea 교체:
  - 특수페이지 `gallery`/`info_cards`/`note_list` (`components/admin/SpecialPageForm.tsx`, `app/admin/actions/specialPages.ts`).
  - 온라인 리그 `steps`/`links`/`today_leagues` (`app/admin/(protected)/online-league/page.tsx`, `actions/onlineLeague.ts`).
  - 푸터 `footer_sponsors` (`app/admin/(protected)/settings/page.tsx`, `actions/siteConfig.ts`).
- **(de)serialize 순수 헬퍼 추출** → 액션의 silent try/catch fallback 제거. 구조화 입력을 서버에서 직렬화하므로 파싱 실패 경로 자체가 사라짐. 기존 jsonb 컬럼 형태 유지(**스키마 변경 없음**).
- `app/admin/error.tsx` 한글 에러 바운더리 신규(`"use client"` 필수).
- 삭제 확인: `components/admin/DeleteButton.tsx` → shadcn `AlertDialog`(확인 시 **기존 서버 액션 그대로 submit**).
- 고아 탭 섹션 숨김: 사이드바(`layout.tsx`)·대시보드에서 제거. 라우트·액션은 유지.

**검증 게이트:** (1) 카드/노트 추가·삭제·정렬 후 저장 → 공개 페이지 반영. (2) **잘못된 형태의 입력이 더 이상 DB에 도달하지 않음**. (3) 의도적으로 모두 비우면 `[]`로 정상 저장(빈 저장은 유효 동작 — 과거값 보존이 아님). 키보드로 행 정렬 가능(드래그 단독 금지).

### Phase 2 — 전체 한글화 + 싼 입력 수정
**목표:** 운영자가 모든 enum을 한국어로 읽고 고르며, 매일 쓰는 폼의 자잘한 마찰을 같은 김에 제거.

- 라벨 맵을 단일 소스(`lib/labels.ts` 또는 기존 파일 확장)로 모으되 **기존 export 유지**(공개 사이트 회귀 방지). 어드민 select/목록과 공개 사이트가 같은 맵 공유.
- 목록 한글화: 이벤트 카테고리/상태(`events/page.tsx`), 프로그램 그룹(`programs/page.tsx`), 시즌 코드(`seasons/page.tsx`).
- 드롭다운 한글화: `EventForm`(category/status — §2.1대로 category는 유형으로 정리), `ProgramForm`(program_group), `TabForm`(type), 온라인 리그 status. `SeasonForm`("봄 (spring)" 패턴)을 표준으로.
- 프로그램 `status`: free-text Input → 한글 Select(recruiting/ongoing/closed/completed). **레거시 데이터 정규화 선행**(기존 "모집 중" 등 한글 자유값을 표준 키로 매핑; 미매핑 시 재저장으로 값이 덮이지 않도록).
- **싼 입력 수정(리뷰 C4 — 같은 파일 두 번 편집 방지):** 이벤트/프로그램 시간 필드 `type="time"`, 요일은 날짜에서 자동 채움, 필수 필드 `*` 표시, 이미지 필드 썸네일 미리보기.

**검증 게이트:** 생성·수정 시 모든 선택지가 한글이고 올바른 값 저장. 기존 프로그램 상태가 정규화 후 올바른 한글 라벨로 표시.

### Phase 3 — 피드백 & 추적성 ("어디에 뜨는지") + 접근성
**목표:** 저장이 됐는지, 결과가 사이트 어디에 뜨는지 즉시 알 수 있게 한다.

- 모든 폼에 저장 성공 토스트(sonner, `role="status"`/`aria-live="polite"`). 리다이렉트조차 없는 Settings/Online League 우선.
- 모든 엔티티(목록 + 수정)에 "사이트에서 보기" 링크: 프로그램 `/programs/{slug}`, 이벤트 `/schedule/{id}`, 특수페이지 `/{slug}`, 시즌 `/series`, 리그 `/online-league`.
- **유효 노출 상태 배지(공유 술어):** `is_visible`은 켰지만 `status=hidden`/노출기간 종료 등으로 안 뜨는 이유를 공개 라우트와 **동일 함수**로 계산해 표시. 이 술어 함수는 Phase 4의 season 조건까지 수용하도록 설계(Phase 3↔4 결합 주의 — §8).
- **●/○ 가시성 점 교체(리뷰 C3 — 명시 산출물):** 색상 단독 금지. 토큰 기반 **텍스트 라벨 + `aria-label`** 배지(또는 접근명 있는 Switch).
- 실제 대시보드: 8개 섹션 카드 + 엔티티 카운트 + 임박 이벤트 + 라이브 사이트 링크. 사이드바 **그룹화 매핑 확정**: 콘텐츠(프로그램·이벤트·특수페이지) / 구조(시즌·블라인드 스트럭처) / 사이트설정(리그·설정). 명칭 §2.1대로 "이벤트" 통일.

**검증 게이트:** 저장 → 토스트 → "사이트에서 보기" 반영 확인. 숨김 이벤트가 "왜 안 뜨는지" 배지로 설명. 스크린리더로 노출 상태 전달 확인.

### Phase 4 — 시즌↔이벤트 실제 연결
**목표:** 운영자 기대("시즌 활성화 → 그 시즌 일정이 사이트에 뜸")를 안전하게 구현.

- **백필 선행(리뷰 HIGH):** 기존 이벤트에 적절한 `season_id` 채우는 멱등 마이그레이션. 사전 DB 스냅샷.
- **null 시즌 규칙:** `season_id`가 null인 이벤트는 **상시 노출(evergreen)**. 홈/일정 보드 = 활성 시즌 이벤트 ∪ null-시즌 이벤트. (필터를 그냥 켜면 미지정 이벤트가 사이트에서 사라지는 사고 방지.)
- 홈 "이번 시즌 일정"/스케줄 보드 필터링(`HomeMagazine`, `lib/data/events.ts`, 스케줄 페이지).
- 이벤트 목록에 소속 시즌 표시 + 시즌별 필터. 시즌 목록에 "N개 이벤트" 카운트.
- 죽은 시즌 필드 제거: `theme_color`, `footer_sponsor_visible`(§2.1).

**검증 게이트:** 새 시즌 활성화 시 홈/일정이 해당 시즌 + null-시즌 이벤트로 구성. **null `season_id` 이벤트가 사라지지 않는지** 명시 확인.

### Phase 5 — 프로그램 설명 구조화 블록 에디터 (가장 큼, 손실 방지)
**목표:** raw HTML 붙여넣기를 없애고, 운영자가 블록 단위로 편집하되 **기존 콘텐츠를 손실 없이** 보존.

- **블록 모델(§1.4 인벤토리 기준 확정):** `image | paragraph | list | heading | raw`.
  - `image` { src, alt } — alt **필수(WCAG 1.1.1)**, 업로드 재사용.
  - `paragraph` { inline runs } — 인라인 런은 `text | bold | link`(굵게·링크 보존; 평문 금지).
  - `list` { items: inline runs[] } — `ul/li` 매핑, 항목별 굵은 글머리 보존.
  - `heading` { level, text } — 표본 미관측이나 sanitize 허용 → 안전 포함.
  - `raw` { html } — 변환 불가 잔여를 담는 이스케이프 블록(안전망; 인벤토리상 거의 불필요할 전망).
- 인벤토리는 §1.4에서 표본 수집 완료. 변환기 구현 시 전수(23개) 재확인.
- 데이터 모델: 프로그램에 **새 jsonb 컬럼 추가(additive)**, 기존 `description`(text)은 **유지**(롤백 가능).
- 에디터: Phase 1의 `useRepeatableRows` 위에 **별도 블록 에디터 컴포넌트**(타입 선택 + 타입별 UI; 이미지 블록은 업로드 재사용). `RepeatableFieldEditor`를 늘리지 않음.
- 공개 렌더러: `app/(site)/programs/[slug]/page.tsx`를 블록 기반 렌더로 교체하되 **빈 블록이면 레거시 `description`을 기존 `marked`/`sanitizeHtml` 경로로 폴백**(가역적 컷오버).
- 마이그레이션: 순수 SQL 아님 → **멱등·additive·가역 Node 스크립트**. 스테이징 DB가 없으므로 **DB 덤프/브랜치에서 드라이런** 후 적용(prod 직접 금지). 레거시 컬럼은 렌더 검증 완료 전까지 보존.

**검증 게이트:** 기존 프로그램 전수 — 마이그레이션 후 공개 페이지 비교(굵게/링크/리스트/이미지 손실 0). 신규 블록 추가/정렬/이미지 업로드. 빈 블록 → 레거시 폴백.

### Phase 6 — 사용성 통합 검토 & 잔여 스윕
- 전 단계 완료 후 어드민 전체를 운영자 관점으로 재조사(QA + product). Phase 0 백로그 잔여분 + 신규 마찰 정리.
- 횡단 폴리시: 블라인드 스트럭처 "없음" 옵션, 폼 섹션 그룹화, 로딩 상태(`loading.tsx`), 설명 렌더 계약(프로그램/이벤트/특수페이지) 통일 검토.

## 5. 범위 밖 (Out of Scope) & 대안

- 탭의 공개 헤더 연동(`Header.tsx`를 서버 컴포넌트화해 `getVisibleTabs` 렌더) — 별도 작업. 이번엔 숨김만.
- 어드민 신규 인증/권한 모델 변경(현재 `requireAdmin` = 인증된 모든 사용자 유지).
- 공개 사이트의 비(非)어드민 연관 리디자인.

### 5.1 기각된 대안: 마크다운 에디터
두 리뷰어는 마크다운 에디터(+붙여넣기 정제+미리보기)가 마이그레이션·렌더러 재작성 없이 더 낮은 위험으로 raw-HTML-붙여넣기 문제를 해결한다고 제안했다. 그러나 **기각**한다: (1) 대상 사용자가 비개발자라 마크다운 문법 학습 부담이 블록 UI보다 큼(사용자 결정), (2) §1.4 인벤토리상 실제 콘텐츠 구조가 규칙적·소규모라 블록 변환 위험이 당초 우려보다 낮음. 리뷰가 지적한 손실 위험은 블록 모델에 **인라인 굵게·링크 보존 + `raw` 이스케이프 + 빈 블록 레거시 폴백 + 가역 additive 마이그레이션**을 넣어 완화한다.

## 6. 리스크 & 완화

| 리스크 | 완화 |
|--------|------|
| 공유/운영 Supabase 데이터 손상 (스테이징 없음) | Phase 4 백필·Phase 5 변환 전 `pg_dump`/Supabase 브랜치 스냅샷. 마이그레이션은 멱등·additive·가역. prod 직접 드라이런 금지 |
| 라벨 맵 단일화 시 공개 사이트 회귀 | 기존 export 유지, 공개 컴포넌트 스냅샷/라벨 테스트 |
| 구조화 블록 마이그레이션으로 기존 설명 손실 | 태그 인벤토리 완료(§1.4: img/p/strong/ul·li/br 규칙적), 인라인 마크 보존 + `raw` 이스케이프, 빈 블록 레거시 폴백, 변환기 전수 테스트 |
| Phase 4 필터로 null-시즌 이벤트 소실 | evergreen 규칙 + 백필 + 빈 일정 테스트 |
| Phase 2 status Select 전환으로 레거시 값 고아 | 정규화 선행 + 매핑 테스트 |
| 단일 행 테이블(site_config·online_league) 동시 편집 클로버 | last-write-wins 인지(현 구조 유지), 필요 시 후속 과제로 낙관적 잠금 |
| 단계 간 결합(Phase 3 노출 술어 ↔ Phase 4 시즌 조건) | 술어 함수를 처음부터 season 수용형으로 설계, Phase 4에서 갱신 |

## 7. 작업 순서 요약

```
Phase 0  사용성 베이스라인 ✅ 완료
Phase 1  데이터 유실 방지 + 안전장치   (useRepeatableRows + RepeatableFieldEditor)
Phase 2  전체 한글화 + 싼 입력 수정
Phase 3  피드백 & 추적성 + 접근성(●/○, 토스트)
Phase 4  시즌↔이벤트 연결 (백필 + evergreen 규칙)
Phase 5  설명 블록 에디터 (확장 모델 + 가역 마이그레이션)
Phase 6  사용성 통합 검토 & 잔여 스윕
        ↑ 각 단계 끝마다 사용성 검증 게이트 + 자동화 테스트(§8)
```

## 8. 테스트 전략 (단계별 필수 커버리지)

기존 스위트는 순수 jsdom 단위(`vitest run`, DB 미접근). 신규 테스트도 **순수 헬퍼 추출 후 단위 테스트**로 DB 의존 회피.

- **Phase 1:** form↔jsonb (de)serialization 순수 헬퍼 **왕복(round-trip)** 테스트 — `gallery/info_cards/note_list/steps/links/today_leagues/footer_sponsors`: 타입드 행 → 정확한 jsonb, 빈 에디터 → `[]`/`{}`, **레거시/부분 형태 관용적 역직렬화(필드 무손실)**. `RepeatableFieldEditor` 추가/삭제/정렬 렌더 테스트. AlertDialog: 확인 전 삭제 차단.
- **Phase 2:** 공개 소비자(`StatusBadge`/`ProgramCard`/프로그램 목록)가 맵 단일화 후에도 올바른 한글 렌더(스냅샷/라벨 테스트). `programs.status` 레거시 한글값 → 표준 키 매핑 테스트.
- **Phase 3:** "유효 노출" 술어 함수가 공개 라우트와 동일 함수임을 단위 테스트(is_visible off / status=hidden / 노출기간 만료 각각의 사유 반환).
- **Phase 4:** `getEvents` 시즌 필터를 **null `season_id`·비활성 시즌 포함 픽스처**로 테스트, evergreen 규칙 단언. 백필 스크립트 멱등성.
- **Phase 5:** HTML→블록 변환기를 **실제 Framer 픽스처**(`<ul><li data-preset-tag>`, `<strong>`, `<a>`, `<img>`)로 단위 테스트(콘텐츠 무손실). 빈 블록 → 레거시 `description` 폴백 렌더 테스트. 블록 (de)serialize 왕복.
