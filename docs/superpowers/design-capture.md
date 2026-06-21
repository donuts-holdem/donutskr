# DO:NUTS 라이브 디자인 캡처 (Task 5)

> 캡처일: 2026-06-20. 방법: Claude-in-Chrome 확장으로 라이브 DOM의 **computed style** 직접 추출.

## ⚠️ 두 개의 별개 사이트가 존재

| 사이트 | URL | 테마 | 스택 | 역할 |
|---|---|---|---|---|
| **메인 디렉토리** | `do-nuts.kr/` 외 `/programs/*` | **화이트** 미니멀 | Framer (cross-origin iframe + SSR) | 전체 프로그램/모임 디렉토리 |
| **시리즈 마이크로사이트** | `do-nuts.kr/series` (SPA, URL 불변) | **다크 + 골드 + 코럴** | 자체 빌드(`<main>`, same-origin) | 시즌 일정·리더보드·온라인리그·챌린지·가입신청 |

**§1~4는 메인(화이트) 사이트, §6은 시리즈(다크) 마이크로사이트.** 재구축 CMS의 핵심 스키마(seasons/events/blind_structures/online_league/leaderboard/special_pages)는 **시리즈 사이트(§6)** 에 그대로 대응한다.
메인 사이트의 렌더 로고/이미지는 cross-origin `framer.com` iframe이라 **브랜드 핑크는 시각 추정값**.

## 1. 컬러 토큰 (실측)

| 역할 | 값 | RGB | 근거(실측 텍스트 노드) |
|---|---|---|---|
| `--color-text` 주 텍스트 | `#131518` | rgb(19,21,24) | 로고 "DO:NUTS", 섹션 제목 "🔥HOT 프로그램", 카드 제목 |
| `--color-text-secondary` 보조/상태 | `#394047` | rgb(57,64,71) | "모집 중 / 55 명" 상태 라인 |
| `--color-text-muted` 음소거/캡션 | `#5F6A76` | rgb(95,106,118) | 검색 placeholder, 카테고리 라벨, 날짜, 지역 |
| `--color-bg` 배경 | `#FFFFFF` | rgb(255,255,255) | 페이지/카드 배경 |
| `--color-border` 보더 | `#E5E7EB` | rgb(229,231,235) | 카드 구분선 (Tailwind gray-200와 동일) |
| `--color-accent` 브랜드 핑크 ⚠️ | `#FF2D8E` *(시각 추정)* | ~rgb(255,45,142) | 로고 조리개 아이콘의 강조 세그먼트 |

⚠️ **브랜드 핑크는 확정 필요** — iframe 캔버스라 정확 hex를 샘플 못 함. 공식 브랜드 hex 또는 로고 SVG/PNG 에셋을 받으면 교체.

## 2. 타이포그래피 (실측)

- **폰트 패밀리:** `Inter` (주). 보조 로드: IBM Plex Sans, Work Sans.
  - Tailwind: `fontFamily.sans = ['Inter', 'system-ui', 'sans-serif']`, `<html lang="ko">`엔 한글 폴백(예: Pretendard/Apple SD Gothic Neo) 추가 권장.
- **letter-spacing:** 24px 대제목에 `-0.5px`, 그 외 `normal`.
- **line-height:** 대략 1.4–1.5 일관.

| 역할 | size | weight | line-height | letter-spacing | color |
|---|---|---|---|---|---|
| 로고 / 섹션 헤딩 | 24px | 600 | 33.6px (1.4) | -0.5px | #131518 |
| 카드 제목 | 18px | 600 | 27px (1.5) | normal | #131518 |
| 내비 항목 (카테고리별 보기) | 16px | 500 | 24px | normal | #131518 |
| 카테고리 라벨 | 16px | 400 | 24px | normal | #5F6A76 |
| 상태 / 인원수 | 16px | 400 | 24px | normal | #394047 |
| 날짜 / 지역 | 14px | 400 | 21px (1.5) | normal | #5F6A76 |

타입 스케일 요약: **14 / 16 / 18 / 24**, weight **400 / 500 / 600**.

## 3. 형태 토큰 (실측)

- **border-radius:** `8px` 지배적 (카드·썸네일·검색창). 보조 10px / 15px 소량.
- **box-shadow (카드):** `0 2px 4px rgba(0,0,0,.1), 0 1px 0 rgba(0,0,0,.05)` — 매우 미묘한 엘리베이션.
- **검색창:** radius 8px, 흰 배경, 1px 연회색 보더, 좌측 검색 아이콘 + placeholder #5F6A76.

## 4. 페이지 인벤토리 (라이브 전수, sitemap 기준 22페이지)

> 2026-06-20 기준 do-nuts.kr의 모든 페이지를 방문해 캡처. 디자인 아키타입은 **4종**으로 수렴.

### 아키타입 A — 홈 `/`
- 고정 헤더: 좌 로고(아이콘+워드마크) · 중앙 검색창 · 우 "카테고리별 보기" 드롭다운.
- 중앙 단일 컬럼(최대폭 ~1090px). 섹션 = 이모지 헤딩 + 카드 세로 리스트.
- 섹션: "🔥HOT 프로그램"(5개) → "🔍모든 프로그램"(상위 5 + "모두 보기"). 푸터에 회원수 카운트.

### 아키타입 B — 프로그램 목록 `/programs`
- 큰 히어로 "모든 프로그램"(~64px) + 부제.
- **2단 레이아웃:** 좌 = 프로그램 리스트(+ "더 보기"), 우 = **"제휴 파트너" 사이드바**(포커루루 · 맥스홀덤 라운지 · DO:LAB — 로고+이름).

### 아키타입 C — 프로그램 상세 `/programs/<slug>` (풀 템플릿)
- 히어로: 카테고리 라벨 + 큰 제목(~64px) + 상태("모집 중 / N 명", 지역).
- 본문 2단: 좌 = **포스터 이미지** + **이모지 불릿 설명**(🏆📅📍👥👏👍 …), 우 = **담당자 카드**(아바타 사진 · 이름 · 역할 · 다크 CTA 버튼).
- 하단: "🔥HOT 프로그램" 관련 프로그램 리스트(동일 카드 컴포넌트).

### 아키타입 D — 이미지/에셋 페이지
- `/images` 및 일부 플레이스홀더 프로그램 페이지. 텍스트 없이 포스터·로고 이미지만. (시즌 히어로 포스터, 스폰서 로고가 여기 위치.)

### 공통 컴포넌트 — 프로그램 카드(행 형태)
- 좌측 정사각 썸네일(~48px, radius 8px) + 우측 텍스트블록.
  - 1행: 카테고리 라벨(음소거) … 우측 상태 "모집 중 / N 명"
  - 2행: 카드 제목(18/600) … 우측 날짜·지역(14/음소거)
- 카드 사이 얇은 구분선(#E5E7EB), 행 높이 ~64–72px.

### 전체 페이지 목록 & 스키마 매핑용 변형값

| 경로 | 아키타입 | 카테고리 | 상태 | 역할 | CTA 라벨 |
|---|---|---|---|---|---|
| `/` | A 홈 | — | — | — | — |
| `/programs` | B 목록 | — | — | — | 더 보기 |
| `/images` | D 에셋 | — | — | — | — |
| `/programs/series` 도너츠 시리즈 | C | 포커 대회 | 모집 중 | 담당자 | 상세 정보 |
| `/programs/donutslab` 도너츠 홀덤연구소 | C | 커뮤니티 | 모집 중 | 담당자 | 바로가기(코드 7777) |
| `/programs/wpl-홀덤-마스터스` | C | 포커 대회 | 모집 중 | 담당자 | 신청 및 문의 |
| `/programs/donuts-seoul-east` 외대 주간 | C | 포커 모임 | 모집 중 | 호스트 | 신청 및 문의 |
| `/programs/donuts-socialstrategygame` | C | 소셜전략게임 | 모집 중 | 담당자 | 신청 및 문의 |
| `/programs/문래-동호회-원페어` | C | 포커 모임 | 모집 중 | 담당자 | 신청 및 문의 |
| `/programs/서울대-동아리-atc` | C | 포커 모임 | 모집 중 | 담당자 | 신청 및 문의 |
| `/programs/부산-동호회-부.울.경` | C | 포커 모임 | 모집 중 | 담당자 | 신청 및 문의 |
| `/programs/신림-동호회-에어라인` | C | 포커 모임 | 모집 중 | 담당자 | 신청 및 문의 |
| `/programs/도너츠-포커-클래스-26-1기` | C | 포커 모임 | **모집 완료** | 호스트 | 신청 및 문의 |
| `/programs/도너츠-서울-gg데이` | C | 포커 모임 | 모집 중 | 호스트 | 신청 및 문의 |
| `/programs/도너츠-신림-홀덤-세션` | C | 포커 모임 | 모집 중 | 호스트 | 신청 및 문의 |
| `/programs/do-lab` | D 빈/이미지 | — | — | — | — |
| `/programs/맥스홀덤-라운지` | D 빈/이미지(제휴) | — | — | — | — |
| `/programs/포커루루` | D 빈/이미지(제휴) | — | — | — | — |
| `/programs/수원-동호회-레귤러` | D 빈/이미지 | — | — | — | — |
| `/programs/도너츠-퀴즈-주니어` | D 빈/이미지 | — | — | — | — |
| `/programs/도너츠-부산대-홈게임` | D 빈/이미지 | — | — | — | — |
| `/programs/도너츠-서울-딜러팀` | D 빈/이미지 | — | — | — | — |

**스키마 매핑 시사점:**
- `category` enum 후보: 포커 대회 / 포커 모임 / 커뮤니티 / 소셜전략게임.
- `status`: 모집 중 / 모집 완료 (현행 스키마 `event_status`로 표현).
- 담당자 카드 → `events`에 담당자(이름·역할·아바타·CTA 라벨·링크) 필드 필요. **역할은 "담당자/호스트" 가변** → `text` 권장.
- `button_label`(상세 정보/바로가기/신청 및 문의) + `entry_link` 그대로 매핑.
- 설명은 이모지 불릿 리치텍스트 → `description`(markdown/text).
- 빈 플레이스홀더 7개는 미완성 페이지로, 재구축 시 동일 상세 템플릿으로 채우거나 제휴 파트너는 외부링크 탭으로 처리.

## 5. 에셋 (확정 필요)

- **로고:** 조리개/도너츠형 링 아이콘(블랙 세그먼트 + 핑크 강조 1) + "DO:NUTS" 워드마크. → SVG/PNG 원본 필요.
- 프로그램 썸네일 이미지들은 콘텐츠(추후 Supabase 시드, Task 14)로 처리.

## 6. 시리즈 마이크로사이트 `/series` (다크 테마 — 재구축 핵심)

> SPA(클라이언트 라우팅, URL은 `/series` 고정). 자체 빌드 `<main>`, same-origin → 토큰 실측 가능.
> 헤더 내비 = **일정 · 리더보드 · 온라인 리그 · 챌린지 이벤트 · 가입신청** (전부 `<button>` JS 라우팅).

### 6.1 다크 테마 토큰 (실측)

| 토큰 | 값 | 용도 |
|---|---|---|
| 배경 베이스 | `#0A0908` (rgb 10,9,8) | 페이지 배경(near-black) |
| 배경 글로우 | `radial-gradient(circle at 86% 12%, rgba(255,229,138,.18), transparent 34%)` + 벚꽃핑크 `rgba(243,183,199,.11)` linear | 스프링 시즌 장식(시즌별 가변 추정) |
| 텍스트 주 | `#FFFFFF` | 제목·본문 |
| 텍스트 음소거 | `rgba(255,255,255, .75 / .62 / .52 / .44)` | 부제·메타 단계별 |
| **골드 액센트** | `#FFE58A` (rgb 255,229,138) | pill 배지, 섹션 헤딩("포커 페스티벌"), 히어로 골드 타이틀 |
| **코럴 CTA 그라데이션** | `linear-gradient(90deg, #D94B45, #F08B6F)` | 참가하기·일정확인·순위 배지(01~03) |
| 카드 글래스 | `rgba(255,255,255,.04)` / 다크글래스 `rgba(10,9,8,.44)` | 카드 배경 |
| 라운드 | pill `999px`, 카드 `20~34px` | 메인(8px)보다 훨씬 둥글다 |
| 폰트 | `Inter` (+ Wanted Sans 보조) | — |

공통 패턴: 섹션마다 **영문 소문자 라벨(골드, letter-spacing 넓게) + 한글 큰 제목(흰색)** + 부제. pill 배지는 골드 배경/다크 텍스트.

### 6.2 하위 페이지 (스키마 매핑)

**(a) `/series` 홈** — 히어로(골드 pill "DONUTS SERIES 2026 · SPRING SEASON" + 골드 타이틀 + 브레이슬릿 이미지 + CTA 2개[코럴 "일정 확인하기" / 아웃라인 "가입 신청하기"]) → 다크 카드 3개(SCHEDULE/LEADERBOARD/ONLINE LEAGUE) → 푸터(OFFICIAL SPONSOR: SUPER CUP, POKER LAB / © Donuts Poker Club). → `seasons`(hero_text/sub_text/badge_text/hero_image/theme_color/footer_sponsor).

**(b) 일정 (SCHEDULE)** → `events` + `event_category`. **카테고리 섹션 = enum 그대로:**
- **포커 페스티벌**(festival) / **확정 이벤트**(confirmed) / **예정 이벤트**(upcoming) / **완료 이벤트**(completed). 각 섹션에 헤딩(골드)+설명.
- **이벤트 카드:** 번호 배지(코럴, 01~20) · 날짜+요일 · 장소 · 제목 · `Start`/`End`(또는 `Regi. End`) · `Entry`(포인트 "10,000 Pt") · 상태 버튼(`완료된 이벤트` 비활성 / `참가하기` 코럴). 펼침 화살표.
- 예정/완료 이벤트는 번호+날짜만 collapsed.

**(c) 이벤트 펼침 → BLIND STRUCTURE** → `blind_structures` + `blind_structure_rows`:
- 헤더 "DETAIL INFO · {날짜}", `Starting Stack : 50,000 (250BB)`, 게임 노트(스테이지 설명).
- 표 컬럼 **SB | BB | Ante (BB) | Time**. **Ante 칸에 `PLO` 텍스트 출현 → `sb/bb/ante = text` 제약 검증됨.**
- 행 타입: 레벨 / `Break 10분` / `Break & 100 Chip Remove` / `Break & Reg.End`(= break_name) / 마지막 레벨 Time `∞`.

**(d) 리더보드 (LEADERBOARD)** → `site_config.leaderboard_*`:
- 2단: **개인순위(PLAYER RANKING) / 대학순위(UNIVERSITY RANKING)**, 행 01~05(상위 3 코럴 배지, 4~5 다크).
- 빈 상태 "리더보드 데이터를 불러오는 중입니다." + "-" → 외부 API(`leaderboard_api_url`)에서 로드.

**(e) 온라인 리그 (ONLINE LEAGUE)** → `online_league_settings`:
- **HOW TO JOIN 참가 방법**(펼침, `join_guide`/`steps`) + **TODAY LEAGUE 오늘의 리그**(`today_leagues`).
- 현재 빈 상태 "**온라인 리그 개편중**" + 모니터 아이콘 + "온라인 리그 문의하기" → **`league_status = 'revamping'` 값 검증됨.**

**(f) 챌린지 이벤트 (CHALLENGE EVENT)** → `special_pages` (= `[tabSlug]` 동적 페이지):
- 히어로 카드: 큰 골드 타이틀("SUPER CUP CHALLENGE") + 설명 + 정보행 `DATE`(date/start_time) · `VENUE`(venue/address) · `DETAIL INFO`(플레이어 가이드, 펼침 = info_cards) · `JOIN`(이벤트 참가하기 코럴, cta_label/entry_link).
- 하단 갤러리 포스터 이미지들(`gallery`).

**(g) 가입신청 (SIGN UP)** → **외부 구글폼** `forms.gle/6kBtHMZNZJLjn8up6` (새 탭). → `site_config.signup_link` + `signup_new_tab=true`. 내부 페이지 아님.

### 6.3 시리즈 사이트 에셋
- 로고: 화이트 워드마크 "DONUTS"(조리개 아이콘 골드/핑크) — 다크 배경용.
- 시즌 히어로: "DONUTS CHAMPION" 골드 브레이슬릿, 벚꽃(스프링) 모션 그래픽.
- 스폰서 로고: SUPER CUP, POKER LAB, Moitto(메인 `/images`에도 존재).

## 7. 전체 경로 인벤토리 (sitemap 누락분 포함 — probing으로 확정)

> sitemap.xml은 Framer 페이지만 포함하고 **커스텀 SPA/특수 페이지를 누락**한다. 약 190개 후보 경로를 fetch probing(200/404 구분되는 정직한 서버)하여 아래를 확정. 공개 admin/login/tools 페이지는 **없음**(= `/admin` CMS는 신규 구축).

### 카테고리 탭 (= `navigation_tabs`, "카테고리별 보기" 드롭다운)
| 라벨 | 경로 | 아키타입 | 비고 |
|---|---|---|---|
| 모두 보기 | `/programs` | B 화이트 목록 | 전체 |
| 포커 프로그램 | `/poker` | B | "모든 포커 프로그램" 히어로 + 포커 카테고리 필터 |
| 소셜 프로그램 | `/social` | B | "모든 소셜 프로그램", 푸터에 소셜아이콘(카카오채널·인스타·디스코드) |
| 기타 프로그램 | `/others` | B | 현재 프로그램 0개(빈 상태) |

→ `navigation_tabs`: key=poker/social/others, type=internal(목록 필터), 카테고리별 히어로 텍스트.

### 특수 페이지 / 커스텀 마이크로사이트 (sitemap 외, `<main>` 자체 빌드 또는 별도 테마)
| 경로 | 제목 | 테마 | 스키마 | 비고 |
|---|---|---|---|---|
| `/series` | 도너츠 시리즈 | 다크+골드+코럴 | seasons+events+blind+league+leaderboard | §6, 핵심 |
| `/challenge` | 도너츠 슈퍼컵 챌린지 | 다크+골드 | `special_pages` + 연결 이벤트 | 히어로(DATE/VENUE/JOIN) + **새틀라이트 일정**(이벤트 01~04, 장소 양재빌딩5F, **Buy-in ₩50,000** — 원화 표기, `/series`는 "Pt") |
| `/lab` | 도너츠 홀덤연구소 (DONUTS HOLD'EM LAB) | **버건디/마룬 + 핑크** | (P0 범위 밖 추정) | 콘텐츠/툴 허브: 토너먼트 시뮬레이터 · 주간 퀴즈 · 포커 성향 테스트 3카드. Framer 페이지 |

**참고:** `/challenge`의 챌린지 이벤트는 `/series` 내 "챌린지 이벤트" 탭에도 임베드됨(동일 히어로, 단 `/challenge` 독립 페이지엔 새틀라이트 일정까지 풀로 존재). → 특수페이지를 `[tabSlug]`로 라우팅하고 시즌 내비에도 노출하는 구조.

### 누락/빈 페이지
- `/programs/*` 중 7개(do-lab·맥스홀덤·포커루루·수원레귤러·퀴즈주니어·부산대홈게임·서울딜러팀)는 이미지/빈 플레이스홀더(§4).
- `/lab`의 시뮬레이터/퀴즈/성향테스트는 인터랙티브 툴 → **P0 범위 밖**으로 보임(재구축 스코프 확인 필요).

## Open items (사용자 확인 필요)
1. **메인 사이트 브랜드 핑크** 정확 hex (현재 추정 `#FF2D8E`) — 화이트 로고의 강조색. (시리즈 다크 사이트의 골드 `#FFE58A`/코럴 `#D94B45→#F08B6F`는 실측 확정.)
2. **로고 에셋 원본**(SVG 선호) — 화이트용/다크용 둘 다.
3. **폰트:** 시리즈 사이트가 한글에 **Wanted Sans**, 라틴에 **Inter** 사용 확인. 재구축도 `Inter + Wanted Sans` 조합으로 갈지 확정(현 권장). 메인은 IBM Plex Sans/Work Sans도 일부 사용.
4. **시즌 테마색**: 현재 스프링 = 골드 글로우 + 벚꽃 핑크. `seasons.theme_color`/`season_code`로 시즌별 가변 — summer/autumn/winter 디자인이 별도로 있는지(있으면 캡처 필요).
5. **`/lab`(홀덤연구소) 범위**: 시뮬레이터/퀴즈/성향테스트 인터랙티브 툴이 P0 재구축 대상인지, 아니면 외부 링크/후순위인지.
6. **다른 독립 페이지 추가 여부**: probing으로 `/series·/challenge·/lab·/poker·/social·/others`까지 확정했으나, 비공개/미링크 URL이 더 있으면 알려줄 것.
