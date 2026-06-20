# DO:NUTS 페이지 관리자화 — P0 설계서

- 작성일: 2026-06-20
- 대상: `do-nuts.kr` (도너츠 시리즈 포커/홀덤 운영 사이트)
- 출처 요구사항: `donuts_requirements_do-nuts_kr.pdf` (2026-06-19)
- 범위: **P0 — 공개 메인 사이트 리뉴얼 + 운영 어드민 CMS**
- 선행 문서: `2026-06-17-donuts-site-rebuild-design.md` (programs-only 초안) — 본 설계서가 **대체(supersede)** 한다.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 범위 | P0 메인 사이트 + 어드민 (홀덤연구소·실시간 타이머는 후속) |
| 스택 | Next.js 16 (App Router) + React 19 + TS + Tailwind + Supabase + Vercel |
| 기존 플랜 | 2026-06-17 programs-only 스펙은 폐기, PDF 기준 재설계 |
| 도너츠 타이머 | 동아리 부원 자체 개발. P0는 **스키마 필드(`timer_event_id`, `timer_event_url`)만 예약**, 연동은 별도 후속 스펙 |
| 관리자 인증 | Supabase Auth **이메일+비밀번호 단일 관리자** (공개 가입 없음) |
| 디자인 | **현재 Framer 사이트를 그대로 재현** (브라우저 확장으로 토큰/에셋 캡처) |
| 네비게이션 구조 | **하이브리드(C)** — 핵심 페이지는 고정 라우트, 상단 메뉴 노출/순서/기간은 DB 제어, 후원/챌린지는 동적 템플릿 |

## 1. 배경 & 목표

현재 도너츠 시리즈 페이지는 일정, 탭, 온라인 리그 안내, 챌린지 이벤트, 참가 링크, 장소, 블라인드 스트럭처 등이 프론트엔드 코드(또는 Framer)에 직접 정의되어 있다. 운영자가 일정 변경·이벤트 추가·시즌 변경·후원 탭 추가를 할 때마다 개발자가 코드를 고치고 배포해야 한다.

목표: 도너츠 운영진이 **관리자 페이지에서 주요 콘텐츠를 직접 추가·수정·삭제·노출 제어**할 수 있도록 구조를 개편한다. 단순 텍스트 어드민이 아니라 일정 CMS, 시즌 테마 관리, 탭 관리, 온라인 리그 상태 관리, 후원/챌린지 템플릿 관리를 포함한 **도너츠 운영 전용 CMS**로 설계한다. 단, PDF가 경계한 "완벽한 범용 CMS"가 아니라 운영 흐름에 맞춘 전용 CMS를 지향한다.

원칙:
- 공개 페이지의 **디자인과 UX는 최대한 유지**하고, 데이터 소스만 코드 상수 → API/DB 기반으로 바꾼다.
- 삭제는 실제 삭제보다 `deleted_at` 기반 소프트 삭제를 기본으로 한다.
- 일정 관리는 도너츠 운영에서 가장 자주 발생하므로 **일정 관리 UX를 최우선**으로 편하게 만든다.

## 2. 기술 스택

- **Next.js 16 (App Router) + React 19 + TypeScript** — 형제 프로젝트 `udfnd`/`cuayo`와 동일 버전대
- **Tailwind CSS ^3.4** — 디자인 토큰(색/폰트/spacing) 중심
- **Supabase** — Postgres(데이터) + Auth(관리자 로그인) + Storage(이미지)
- **배포: Vercel** — Supabase 연동, ISR + on-demand revalidate
- 테스트: Vitest
- 언어: 한국어 단일 (`<html lang="ko">`)

## 3. 도메인 / 서비스 경로 (PDF 2절)

| 구분 | 경로 |
|---|---|
| 공개 메인 | `https://do-nuts.kr` |
| 관리자 | `https://do-nuts.kr/admin` (인증 필수, robots disallow) |
| 공개 API | `https://do-nuts.kr/api/public/*` |
| 관리자 변경 | 주로 Next.js Server Actions로 처리, 필요 시 `/api/admin/*` |
| 홀덤연구소 | (후속) `lab.do-nuts.kr` 별도 앱 — 본 P0 범위 밖 |

## 4. 전체 아키텍처

- **단일 Next.js 앱**: `/`(공개) + `/admin`(운영)을 한 앱에 둔다(별도 앱 분리 안 함).
- **공개 페이지**: Server Component에서 Supabase 조회 후 **ISR**. 관리자가 콘텐츠를 저장하면 **on-demand revalidate**로 관련 페이지만 재생성.
- **관리자 페이지**: `/admin`, Next.js middleware로 인증 가드. 변경은 Server Actions.
- **렌더링 전략**: 공개 페이지는 정적 사이트급 속도 + SEO. 페이지별 메타데이터, `sitemap.xml`, `robots.txt`.
- **저장소**: 포스터/로고/배경/썸네일은 Supabase Storage `media` 버킷.

```
donuts/
  app/
    (public)/
      page.tsx                  # 홈 /
      schedule/page.tsx         # 일정 목록 /schedule
      schedule/[id]/page.tsx    # 이벤트 상세 /schedule/[id]
      online-league/page.tsx    # 온라인 리그 /online-league
      leaderboard/page.tsx      # 리더보드 /leaderboard
      [tabSlug]/page.tsx        # 후원/챌린지 동적 special_pages
    admin/
      login/page.tsx
      layout.tsx                # 인증 가드 셸
      page.tsx                  # 대시보드
      seasons/...               # 시즌 CRUD
      events/...                # 일정/이벤트 CRUD
      blind-structures/...      # 스트럭처 에디터
      online-league/page.tsx    # 온라인 리그 상태/콘텐츠
      tabs/...                  # 탭 관리
      special-pages/...         # 후원/챌린지 템플릿
      settings/page.tsx         # site_config (가입신청/리더보드/푸터)
      actions.ts                # server actions
    api/
      public/...                # 공개 read API (필요 범위)
      revalidate/route.ts       # on-demand revalidate
    sitemap.ts / robots.ts
  components/{site, schedule, season, league, special, admin}/...
  lib/
    supabase/{server,browser,middleware}.ts
    data/*.ts                   # 타입드 데이터 액세스 레이어
    types.ts
  middleware.ts                 # /admin 인증
  supabase/
    migrations/*.sql            # 스키마 + RLS
    seed.sql                    # 라이브 사이트 기반 초기 데이터
  test/...
  tailwind.config.ts / globals.css
```

## 5. 데이터 모델 (P0 핵심 테이블)

PDF 13절 데이터 모델 중 P0에 필요한 테이블만 포함한다. (타이머 스냅샷/결과, 회원, 홀덤연구소, audit_logs 등은 후속 스펙.)

공통 규칙:
- 모든 테이블 `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, 수정 추적용 `updated_at`.
- 소프트 삭제 대상 테이블은 `deleted_at timestamptz null`.
- RLS: 공개 read(익명 SELECT, 단 `deleted_at is null` + 노출 조건) 허용 / write(INSERT/UPDATE/DELETE)는 인증된 관리자만.

### 5.1 `seasons` — 시즌제 디자인
| 필드 | 타입 | 설명 |
|---|---|---|
| name | text | 예) 2026 스프링 시즌 |
| code | enum | spring / summer / autumn / winter |
| year | int | 연도 |
| start_date / end_date | date | 시즌 기간 |
| is_active | boolean | 활성 시즌 (전역 1개) |
| hero_text / sub_text / badge_text | text | 히어로/서브/배지 문구 |
| hero_image / bg_image | text | 대표/배경 이미지 URL |
| theme_color | text | 테마 색상 |
| footer_sponsor_visible | boolean | 푸터 스폰서 노출 |

요구사항: 활성 시즌 변경 시 메인 디자인/문구 즉시 반영(revalidate), 기존 시즌 데이터 보존, 시즌 디자인 없으면 기본 디자인으로 fallback.

### 5.2 `events` — 일정/이벤트 (핵심)
| 필드 | 타입 | 설명 |
|---|---|---|
| season_id | uuid fk | 시즌 연결 |
| round | int/text | 회차 |
| title | text | 이벤트명 |
| event_type | text | 클래식/잭팟/쇼다운/3-Bullet/챔피언십/NLH-PLO 믹스드 |
| date / weekday | date / text | 날짜·요일 |
| location / address | text | 장소·주소 (P0는 inline, 프리셋은 P1) |
| start_time / reg_close_time / end_time | time | 시작/레지마감/종료 |
| buy_in | text | 참가비 |
| entry_link / button_label | text | 참가 링크·버튼 문구 |
| description | text(md) | 상세 설명 |
| poster_image / sponsor_logo | text | 포스터·스폰서 로고 URL |
| category | enum | 포커페스티벌 / 확정 / 예정 / 완료 |
| status | enum | 예정 / 확정 / 진행중 / 레지마감 / 완료 / 취소 / 숨김 |
| is_visible | boolean | 노출 여부 |
| sort_order | int | 노출 순서 |
| blind_structure_id | uuid fk null | 블라인드 스트럭처 연결 |
| timer_event_id / timer_event_url | text null | **예약 필드** (타이머 후속 연동) |
| deleted_at | timestamptz null | 소프트 삭제 |

상태 규칙: P0는 관리자가 수동으로 상태 설정. (날짜/타이머 기반 자동 상태 변경은 후속.)

### 5.3 `blind_structures` / `blind_structure_rows` — 스트럭처 에디터
- `blind_structures`: `name, is_template(boolean), event_type(text null)`
- `blind_structure_rows`: `structure_id fk, row_type enum(level/break/stage), level_no int null, sb text null, bb text null, ante text null, duration int null, break_name text null, break_minutes int null, stage_note text null, sort_order int`

요구사항: 행 추가/삭제/순서 변경, 기존 스트럭처 복제, 템플릿 저장, 이벤트별 커스텀. **PLO처럼 Ante 칸에 텍스트 허용**(그래서 sb/bb/ante는 text).

### 5.4 `navigation_tabs` — 상단 메뉴 제어
| 필드 | 설명 |
|---|---|
| name / key | 탭명 / 탭 키 |
| type | internal(고정 라우트) / external(외부 링크) / special(동적 페이지) |
| slug / external_url | special일 때 slug, external일 때 URL |
| is_visible / sort_order | 노출 여부 / 순서 |
| mobile_visible | 모바일 노출 |
| start_show_date / end_show_date | 기간 노출 (지나면 자동 숨김) |
| home_card_visible / home_card_title / home_card_desc / home_card_cta | 홈 카드 노출 및 내용 |

### 5.5 `special_pages` — 후원/챌린지 템플릿
| 필드 | 설명 |
|---|---|
| slug / label / title / description | 식별·표시 |
| date / venue / address / start_time | 일정 정보 |
| entry_link / cta_label | 참가 |
| sponsor_name / sponsor_logo | 스폰서 |
| poster / gallery(jsonb) | 대표 포스터 / 갤러리 |
| info_cards(jsonb) | DATE/VENUE/BUY-IN/STARTING STACK/ENTRY + 커스텀 항목 |
| note_list(jsonb) | NOTE 리스트 |
| blind_structure_id fk null | 블라인드 스트럭처 |
| start_show_date / end_show_date / is_visible | 기간 기반 노출 + 자동 숨김 |

### 5.6 `online_league_settings` (싱글턴)
`status enum(운영중/개편중/준비중/일시중단/숨김), tab_visible, title, description, join_guide(md), steps(jsonb), links(jsonb: 모이또/포커루루/도너츠클럽/오픈채팅), today_leagues(jsonb), notice_text, cta_label, cta_url, sheet_url`

요구사항: 상태값에 따라 공개 페이지가 운영중/개편중/준비중/일시중단/숨김으로 분기. 구글 시트 사용 시 관리자 입력 데이터가 우선되는 override 구조.

### 5.7 `site_config` (싱글턴)
가입신청(`signup_visible, signup_link, signup_new_tab, signup_button_label, signup_closed, signup_closed_text`), 리더보드(`leaderboard_tab_visible, leaderboard_api_url, leaderboard_personal_rank_visible`), 푸터 스폰서 등 자잘한 전역 설정.

## 6. 공개 사이트 라우트

| 경로 | 내용 |
|---|---|
| `/` | 홈 — 활성 시즌 히어로 + 상단 메뉴(navigation_tabs) + 홈 카드(예정/진행 이벤트, 챌린지) |
| `/schedule` | 일정 — 카테고리(페스티벌/확정/예정/완료)·상태 배지. 완료 이벤트는 클릭 가능한 상세 카드(아카이브) |
| `/schedule/[id]` | 이벤트 상세 — 장소/시간/참가비/참가링크 + 블라인드 스트럭처 테이블 (별도 페이지) |
| `/online-league` | 온라인 리그 — 상태값별 분기 |
| `/leaderboard` | 리더보드 — 외부 API URL 연결 + 노출 토글 (P0 최소) |
| `/[tabSlug]` | 후원/챌린지 동적 special_pages — 기간 노출 지나면 자동 숨김 |

공개 페이지 상태 표시 규칙(PDF 7절):
- 예정: 회차/날짜/요일/예정 + "세부 정보 미정" 안내
- 확정: 이벤트명/장소/시작·레지마감/참가비/참가링크/블라인드 스트럭처
- 진행중: `LIVE` 배지 (실시간 수치는 타이머 후속 스펙 — P0는 배지/상태만)
- 완료: `COMPLETED` 배지 + 클릭 시 상세(아카이브). P0는 관리자 입력 정적 필드까지, 타이머 최종 수치는 후속

렌더링: ISR + 페이지별 메타데이터(title/description/OG), `sitemap.xml`, `robots.txt`(`/admin` disallow).

> **타이머 의존 부분**(진행중 LIVE 실시간 앤트리/레벨, 완료 이벤트 최종 결과 수치)은 P0에서 필드만 예약하고 표시 UI는 후속 스펙으로 분리한다.

## 7. 관리자(`/admin`) 구조

PDF 4.2 공통 기능 중 P0 범위: 생성/수정/삭제(soft)/숨김/노출순서 변경/최근 수정일·수정 표시. (임시저장·발행·미리보기·변경 이력은 P1.)

| 경로 | 기능 |
|---|---|
| `/admin/login` | 이메일+비번 로그인 |
| `/admin` | 대시보드 (빠른 진입) |
| `/admin/seasons` | 시즌 CRUD + 활성 시즌 전환 |
| `/admin/events` | 일정 목록/CRUD, 카테고리·상태·노출순서, 블라인드 스트럭처 연결 |
| `/admin/blind-structures` | 스트럭처 에디터 (행 추가/삭제/순서, 복제, PLO Ante 텍스트 허용, 템플릿 저장) |
| `/admin/online-league` | 상태 전환 + 콘텐츠 |
| `/admin/tabs` | 탭 노출/순서/기간노출/홈카드 관리 |
| `/admin/special-pages` | 후원/챌린지 템플릿 CRUD |
| `/admin/settings` | site_config (가입신청/리더보드/푸터) |

- 인증: middleware로 `/admin/*` 가드, 미인증 시 `/admin/login` 리다이렉트. 관리자 계정은 Supabase 대시보드에서 수동 발급(공개 가입 없음).
- 저장 시 관련 공개 페이지 자동 revalidate.
- 이미지 업로드: Supabase Storage `media` 버킷.

### 공통 검증 (PDF 4.3, P0 범위)
날짜/시간 형식, 필수 입력값, URL 형식, 이미지 업로드 형식, 블라인드 스트럭처 행 형식 검증. (타이머 이벤트 ID 중복/연동 실패 fallback은 타이머 후속 스펙.)

## 8. 마이그레이션 (PDF 15절)

기존 코드/Framer에 박힌 데이터를 **초기 DB seed**로 이관. 마이그레이션 후 공개 페이지는 기존과 시각적으로 거의 동일해야 한다.

대상: 메뉴 탭, 현재 시즌, 장소, 참가 링크, 전체 일정(확정/예정/완료), 포커 페스티벌, 이벤트 타입별 스트럭처/안내 문구, 온라인 리그 안내·개편중 상태, 챌린지 내용·포스터, 리더보드 API 설정, 가입신청 링크, 스폰서 로고.

방법: 구현 시 **Claude 브라우저 확장으로 `do-nuts.kr` 실제 페이지를 정밀 캡처**해 값 추출 → `supabase/seed.sql`로 작성. (도너츠 타이머 과거 데이터 이관은 타이머 후속 스펙.)

## 9. 디자인 충실도

- 구현 착수 시 **Claude 브라우저 확장 연결** → 각 페이지 스크린샷 + 실제 적용 CSS(색/폰트/간격/radius/버튼/배지) 추출.
- 추출값을 `tailwind.config` 디자인 토큰 + `globals.css` CSS 변수로 정리. `docs/superpowers/design-capture.md`에 기록.
- 폰트/로고/이미지 에셋 다운로드해 프로젝트 포함(Google Fonts면 `next/font` 우선).
- 새 탭(시즌/리그/챌린지 등)도 동일 토큰으로 일관되게.
- (선택) Framer 정적 export ZIP은 `_framer-export/`에 보조 참고용으로만, 코드 재사용은 하지 않음.

## 10. 완료 기준 (PDF 17절 중 P0)

- 운영자가 관리자에서 새 시즌을 만들고 활성화하면 공개 메인에 반영된다.
- 운영자가 일정 1개를 추가하면 공개 일정 탭에 반영된다.
- 운영자가 확정 이벤트의 장소/시간/참가비/참가링크를 수정하면 공개 페이지에 반영된다.
- 운영자가 블라인드 스트럭처를 수정하면 상세 테이블에 반영된다. (PLO Ante 텍스트 허용)
- 운영자가 일정 이벤트에 타이머 이벤트 ID를 입력(저장)할 수 있다. (표시/동기화는 후속)
- 완료 이벤트를 클릭하면 상세(아카이브) 카드가 열린다.
- 운영자가 온라인 리그를 개편중/운영중으로 바꾸면 공개 페이지에 즉시 반영된다.
- 운영자가 후원/챌린지 탭을 생성하면 상단 메뉴에 추가되고, 노출 종료일이 지나면 자동 숨김된다.
- 기존 페이지의 모바일/PC 레이아웃이 깨지지 않는다.

## 11. 비범위 (P0 제외 → 후속 스펙)

- 도너츠 타이머 실시간 연동(진행중 polling/LIVE 수치, 자동/수동 동기화, 결과 수동 보정, 공개범위 설정) — 필드만 예약
- 홀덤연구소(회원 DB, 로그인, GTO 퀴즈, 토너먼트 시뮬레이터) — 별도 앱
- 관리자 권한 3단계(Super Admin/Editor/Viewer), OAuth(Google/Kakao)
- 임시저장/발행/미리보기/변경 이력/접근 로그(audit)
- 장소 프리셋, 이벤트 타입 템플릿 저장, 시즌 복제, 시즌별 디자인 토큰 자동화
- WebSocket/SSE 실시간
- 결제/예약, 다국어

## 12. 미해결 / 구현 시 확정

- `events` 등 각 테이블의 정확한 필드는 브라우저 확장으로 실제 페이지 정밀 확인 후 미세 조정
- 일정 상세를 별도 페이지(`/schedule/[id]`)로 확정 — 모달은 차후 UX 개선
- 공개 read를 Server Component 직접 조회로 할지 `/api/public/*`를 별도로 노출할지 (기본: Server Component 직접 조회, 외부 소비 필요 시 API 추가)
- 커스텀 도메인(`do-nuts.kr`) Vercel 연결 시점
