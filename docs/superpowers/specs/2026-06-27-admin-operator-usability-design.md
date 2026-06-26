# DO:NUTS 어드민 운영자화(化) — 설계 문서

- **작성일:** 2026-06-27
- **브랜치:** `feat/schedule-editorial-redesign` (별도 작업 브랜치 권장)
- **상태:** 설계 확정 대기 (리뷰: designer + QA subagent)

## 1. 배경 / 문제 정의

`/admin`은 8개 섹션의 CRUD가 구현되어 있으나, **개발자용 테이블 편집기**처럼 동작해 비개발자(한국어) 운영자가 쓰기 매우 어렵다. 정적 코드 감사(QA + product 관점)와 **라이브 브라우저 조작 조사**(운영자 시나리오 직접 수행)로 다음을 확인했다.

### 1.1 라이브 사용성 조사 결과 (Phase 0 산출물 — 이미 수행 완료)

실제 어드민에 로그인해 화면을 조작하며 확인한 마찰점:

| # | 화면 | 확인된 문제 |
|---|------|------------|
| L1 | 대시보드 `/admin` | 사이드바 8개 섹션 중 카드 2개(시즌·이벤트)만 노출. 같은 기능을 사이드바 "일정" vs 카드 "이벤트 관리"로 다르게 호칭. 운영 현황(카운트·임박 이벤트·라이브 링크) 전무. |
| L2 | 이벤트 생성 | 카테고리 드롭다운 `festival/confirmed/upcoming/completed`, 상태 `scheduled` 등 **영어**. "festival"(유형)과 상태값이 한 드롭다운에 섞여 의미 불명확. 시간 필드가 `예: 14:00` 자유텍스트(`type="time"` 아님). 회차·이벤트타입·요일 자유텍스트, 요일은 날짜에서 자동 안 채워짐. |
| L3 | 프로그램 수정 | 설명란에 Framer에서 복사한 **raw HTML 덩어리**(`<img src><p dir="auto"><strong>…<ul><li data-preset-tag>`)가 그대로 들어 있어 사람이 손볼 수 없음. 카테고리="커뮤니티"(자유텍스트) vs 그룹="poker"(영어 드롭다운) 혼재. 상태="모집 중" 자유 입력(고정 어휘여야 함). 커버 이미지 = URL 문자열, 썸네일 없음. |
| L4 | 프로그램 목록 | 그룹 컬럼 poker/social/others **영어**. HOT·제휴·노출 = ●/○ 점만(텍스트·aria 없음, 켜짐/꺼짐 모호, 스크린리더 불가). |
| L5 | 특수페이지 수정 | 필드 라벨에 문자 그대로 **"갤러리 (JSON 배열)", "정보 카드 (JSON 배열, 예: [{\"label\":\"\",\"value\":\"\"}])", "노트 목록 (JSON 배열)"**. 노트 목록은 모든 항목이 한 줄 JSON으로 뭉쳐 편집 불가. 오타 1개면 저장은 "성공"하나 내용 조용히 전체 삭제. |
| L6 | 시즌 목록 | 코드 `spring` **영어**. 이 시즌이 `/series`에 노출된다는 안내·"사이트에서 보기" 링크 전무. 삭제 버튼이 확인 절차 없이 인접. |
| L7 | 공통 | 저장 후 성공 메시지 없음, "사이트에서 보기" 링크 없음, 삭제 확인 없음, 한글 에러 바운더리 없음. |

### 1.2 정적 감사로 추가 확인된 구조적 문제

- **고아 탭 섹션:** `navigation_tabs` CRUD가 풀로 존재하나 공개 헤더(`components/site/Header.tsx`)는 하드코딩 배열이라 어떤 탭도 렌더되지 않음. `lib/data/tabs.ts`의 `getVisibleTabs` 등을 공개 컴포넌트가 import하지 않음.
- **가짜 시즌↔이벤트 관계:** 이벤트 폼에서 `season_id`를 지정하지만 공개 사이트 어디서도 `season_id`로 이벤트를 필터링하지 않음. 시즌 활성화는 `/series` 문구만 바꿈. 죽은 시즌 필드: `theme_color`, `footer_sponsor_visible`.
- **silent 데이터 유실:** `parseJson`류 헬퍼(`specialPages.ts:9-11`, `onlineLeague.ts:8-10`, `siteConfig.ts:9-11`)가 파싱 실패 시 빈 값으로 fallback → 운영자 오타가 콘텐츠를 조용히 삭제.

## 2. 확정된 제품 결정 (사용자 승인)

1. **범위:** 감사 전체를 **단계적**으로 수행.
2. **시즌↔이벤트:** 실제로 **연결**(활성 시즌의 이벤트만 홈/일정에 노출되도록 `season_id` 필터링).
3. **탭 섹션:** 헤더 연동은 별도 대형 작업이므로 **지금은 숨김**(라우트 유지, 사이드바/대시보드에서 제거).
4. **설명 편집:** **구조화 블록 에디터**(자유 마크다운/HTML 대신 반복 가능한 제목/문단/이미지 블록).

## 3. 기존 자산 (재사용 대상, 새로 만들지 말 것)

- 한글 라벨 맵이 이미 존재:
  - `lib/program-display.ts` → `PROGRAM_STATUS_LABELS`(recruiting/ongoing/closed/completed → 모집중/진행중/마감/종료), `PROGRAM_CATEGORIES`(poker/social/others → 포커/소셜/기타).
  - `components/schedule/StatusBadge.tsx` → `LABEL`(EventStatus → 예정/확정/진행중/레지마감/완료/취소/숨김). 타입은 `lib/types.ts` `EventStatus`.
  - `components/league/LeagueStatusBlock.tsx` → 리그 상태 한글 타이틀.
- 프로그램 설명은 `app/(site)/programs/[slug]/page.tsx`에서 `marked.parse()` + `sanitizeHtml`로 렌더(img/h1/h2 허용). 이벤트·특수페이지 설명은 `whitespace-pre-line` 평문 렌더(계약이 다름 — 통일 검토).
- 이미지 업로드 플로우: `lib/upload.ts`의 `uploadIfPresent`.
- 어드민 UI는 shadcn 프리미티브(`components/ui/*`). admin에서 input/button 직접 제작 금지.

## 4. 단계별 설계

각 단계는 **독립적으로 머지 가능**하며, 끝에 **사용성 검증 게이트**(브라우저로 운영자 시나리오 수행 → 마찰 발견 → 수정 → 재검증)를 둔다.

### Phase 0 — 사용성 베이스라인 ✅ 완료
§1.1의 라이브 조사로 완료. 산출물 = 위 마찰점 표 + 정적 감사 백로그.

### Phase 1 — 데이터 유실 방지 + 안전장치 (최우선)
**목표:** 운영자 실수로 콘텐츠가 사라지지 않게 하고, 위험 동작에 가드를 건다.

- `components/admin/RepeatableFieldEditor.tsx` (신규, 재사용 공통 컴포넌트): 행 추가/삭제/정렬 + 행별 타입드 입력. variant: `string[]`(노트), `{label,value}[]`(정보 카드), `{name,logo}[]`(스폰서), 이미지 URL 배열(+업로드).
- raw JSON textarea 교체:
  - 특수페이지 `gallery`/`info_cards`/`note_list` (`components/admin/SpecialPageForm.tsx`, `app/admin/actions/specialPages.ts`).
  - 온라인 리그 `steps`/`links`/`today_leagues` (`app/admin/(protected)/online-league/page.tsx`, `actions/onlineLeague.ts`).
  - 푸터 `footer_sponsors` (`app/admin/(protected)/settings/page.tsx`, `actions/siteConfig.ts`).
- 액션의 silent try/catch fallback 제거 → 구조화 입력을 서버에서 직렬화(파싱 실패 경로 자체를 없앰). 기존 jsonb 컬럼 형태 유지(스키마 변경 없음).
- `app/admin/error.tsx` 한글 에러 바운더리 신규.
- 삭제 확인 다이얼로그(`components/admin/DeleteButton.tsx` → shadcn AlertDialog).
- 고아 탭 섹션 숨김: 사이드바(`layout.tsx`)·대시보드에서 제거. 라우트·액션은 유지.

**검증 게이트:** 특수페이지에서 카드/노트 추가·삭제·정렬 후 저장 → 공개 페이지 반영 확인. 일부러 비우고 저장 → 기존 데이터 보존 확인.

### Phase 2 — 전체 한글화
**목표:** 운영자가 모든 enum을 한국어로 읽고 고른다.

- 라벨 맵을 단일 소스로 정리: 어드민 select/목록과 공개 사이트가 같은 맵 공유. 흩어진 맵을 `lib/labels.ts`(또는 기존 파일 확장)로 모으되 기존 export 유지.
- 목록 한글화: 이벤트 카테고리/상태(`events/page.tsx`), 프로그램 그룹(`programs/page.tsx`), 시즌 코드(`seasons/page.tsx`).
- 드롭다운 한글화: `EventForm`(category/status), `ProgramForm`(program_group), `TabForm`(type), 온라인 리그 status. `SeasonForm`(이미 "봄 (spring)" 패턴)을 표준으로 따름.
- 프로그램 `status`: free-text Input → 한글 Select(recruiting/ongoing/closed/completed).
- 이벤트 "카테고리" 필드의 의미 정리(유형 vs 상태 혼재) — 의미 재정의 또는 라벨 명확화.

**검증 게이트:** 이벤트/프로그램 생성·수정 시 모든 선택지가 한글로 보이고 올바른 값이 저장되는지 확인.

### Phase 3 — 피드백 & 추적성 ("어디에 뜨는지")
**목표:** 저장이 됐는지, 결과가 사이트 어디에 뜨는지 즉시 알 수 있게 한다.

- 모든 폼에 저장 성공 토스트(`useActionState` 기반). 리다이렉트조차 없는 Settings/Online League 우선.
- 모든 엔티티(목록 + 수정)에 "사이트에서 보기" 링크: 프로그램 `/programs/{slug}`, 이벤트 `/schedule/{id}`, 특수페이지 `/{slug}`, 시즌 `/series`, 리그 `/online-league`.
- 유효 노출 상태 배지: `is_visible`은 켰지만 `status=hidden`/노출기간 종료 등으로 안 뜨는 이유를 공개 라우트와 **동일 술어**로 계산해 표시.
- 실제 대시보드: 8개 섹션 카드 + 엔티티 카운트 + 임박 이벤트 + 라이브 사이트 링크. 사이드바 그룹화(콘텐츠/구조/사이트설정), 명칭 통일(일정↔이벤트 등).

**검증 게이트:** 저장 → 토스트 확인 → "사이트에서 보기"로 실제 반영 확인. 숨김 이벤트가 "왜 안 뜨는지" 배지로 설명되는지 확인.

### Phase 4 — 시즌↔이벤트 실제 연결
**목표:** 운영자의 기대("시즌 활성화 → 그 시즌 일정이 사이트에 뜸")를 실제로 구현.

- 홈 "이번 시즌 일정"/스케줄 보드를 활성 시즌의 `season_id`로 필터링(`HomeMagazine`, `lib/data/events.ts`, 스케줄 페이지).
- 이벤트 목록에 소속 시즌 표시 + 시즌별 필터. 시즌 목록에 "N개 이벤트" 카운트.
- 죽은 시즌 필드 정리: `theme_color`, `footer_sponsor_visible` 제거 또는 연동(구현 시 결정).

**검증 게이트:** 새 시즌 활성화 시 홈/일정 보드가 해당 시즌 이벤트로 바뀌는지 확인.

### Phase 5 — 프로그램 설명 구조화 블록 에디터 (가장 큼)
**목표:** raw HTML 붙여넣기를 없애고, 운영자가 블록 단위로 설명을 편집.

- 데이터 모델: 프로그램 `description`(현재 마크다운/HTML 텍스트)을 구조화 블록(`{type:'heading'|'paragraph'|'image', ...}[]`)으로 전환. jsonb 컬럼 추가 + 마이그레이션(기존 HTML → 블록 변환 또는 단발성 변환 스크립트).
- 에디터: Phase 1의 `RepeatableFieldEditor` 확장(블록 타입 선택, 이미지 블록은 업로드 재사용).
- 공개 렌더러: `app/(site)/programs/[slug]/page.tsx`를 블록 기반 렌더로 교체(기존 `marked`/`sanitizeHtml` 경로 대체 또는 블록→안전 HTML).
- **위험 큼:** 기존 데이터 마이그레이션 + 공개 렌더 변경 → 마지막에, 충분한 검증과 함께.

**검증 게이트:** 기존 프로그램들의 설명이 마이그레이션 후 공개 페이지에서 깨지지 않는지 전수 확인. 새 블록 추가/정렬/이미지 업로드 동작 확인.

### Phase 6 — 사용성 통합 검토 & 잔여 스윕
- 전 단계 완료 후 어드민 전체를 운영자 관점으로 재조사(QA + product). Phase 0 백로그 잔여분 + 신규 마찰 정리.
- 횡단 폴리시 흡수: 필수 필드 `*` 표시, 이미지 썸네일 미리보기, 시간 `type="time"`, 블라인드 스트럭처 "없음" 옵션, 폼 섹션 그룹화, 로딩 상태(`loading.tsx`).

## 5. 범위 밖 (Out of Scope)

- 탭의 공개 헤더 연동(`Header.tsx`를 서버 컴포넌트화해 `getVisibleTabs` 렌더) — 별도 작업. 이번엔 숨김만.
- 어드민 신규 인증/권한 모델 변경(현재 `requireAdmin` = 인증된 모든 사용자 유지).
- 공개 사이트의 비(非)어드민 연관 리디자인.

## 6. 리스크 & 완화

| 리스크 | 완화 |
|--------|------|
| 공유/운영 Supabase 데이터 손상 | 작업 브랜치 + 마이그레이션 사전 백업, Phase 5 변환은 드라이런 후 적용 |
| 라벨 맵 단일화 시 공개 사이트 회귀 | 기존 export 유지, 테스트로 공개 컴포넌트 스냅샷 보호 |
| 구조화 블록 마이그레이션으로 기존 설명 깨짐 | 전수 검증 게이트, 롤백 가능한 컬럼 추가 방식 |
| 단계 간 의존(공통 컴포넌트) | Phase 1에서 `RepeatableFieldEditor`를 먼저 확립 |

## 7. 작업 순서 요약

```
Phase 0  사용성 베이스라인 ✅ 완료
Phase 1  데이터 유실 방지 + 안전장치
Phase 2  전체 한글화
Phase 3  피드백 & 추적성
Phase 4  시즌↔이벤트 연결
Phase 5  설명 블록 에디터 (마이그레이션)
Phase 6  사용성 통합 검토 & 잔여 스윕
        ↑ 각 단계 끝마다 사용성 검증 게이트
```
