# DO:NUTS 사이트 자체 구축 설계서

- 작성일: 2026-06-17
- 대상: `do-nuts.kr` (Framer 제작 포커/홀덤 커뮤니티 사이트)
- 목표: Framer를 떠나 자체 코드베이스(Next.js + Supabase)로 재구축 후 직접 배포

## 1. 배경 & 목표

현재 `do-nuts.kr`는 Framer로 제작/호스팅되는 포커·홀덤 커뮤니티 사이트다.
프로그램(토너먼트/세션)을 Framer CMS로 관리하는 멀티페이지 구조다.

이를 떠나려는 이유:
- **코드 제어/커스터마이징** — 디자인 외 기능·로직·통합을 자유롭게 추가
- **기존 코드베이스 통합** — `udfnd`, `cuayo` 등과 동일 스택으로 통일

원칙:
- 기존 **디자인은 유지**하되 코드 구조는 깔끔하게 재구성한다.
- Framer 자동생성 코드는 재사용하지 않는다(유지보수 부적합). 게시 사이트를 정밀 참조해 새로 작성한다.

## 2. 기술 스택

- **Next.js 16 (App Router) + React 19 + TypeScript** — 기존 `udfnd`/`cuayo`와 동일 버전대
- **Tailwind CSS** — 디자인 토큰(색/폰트/spacing) 중심
- **Supabase** — Postgres(데이터) + Auth(관리자 로그인) + Storage(이미지)
- **배포: Vercel** — Supabase 연동, ISR 지원

## 3. 데이터 모델 (Supabase)

### `programs` 테이블 (초안 — 실제 사이트 정밀 확인 후 조정)

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (PK) | 기본키 |
| `slug` | text (unique) | URL 경로 (`/programs/series`) |
| `title` | text | 프로그램명 |
| `status` | text/enum | `recruiting`(모집중) / `closed`(마감) / `upcoming`(예정) |
| `is_hot` | boolean | 홈 🔥 HOT 섹션 노출 여부 |
| `member_count` | int | 참가 인원 |
| `location` | text | 지역 (문래/신림/서울 동부 등) |
| `start_date` | date | 시작일 |
| `end_date` | date | 종료일 |
| `description` | text (markdown) | 상세 설명(리치 텍스트) |
| `manager` | text | 담당 매니저명 |
| `cover_image` | text | 대표 이미지 URL (Supabase Storage) |
| `sort_order` | int | 정렬 순서 |
| `created_at` | timestamptz | 생성 시각 |

> 카테고리/태그가 실제로 쓰이면 `category` 컬럼 또는 별도 테이블 추가 검토.

### RLS (Row Level Security)
- 공개 읽기(SELECT): 익명 허용
- 쓰기(INSERT/UPDATE/DELETE): 인증된 관리자만

## 4. 공개 사이트 라우트

| 경로 | 내용 |
|---|---|
| `/` | 홈 — 🔥 HOT 프로그램 + 전체 프로그램 목록 미리보기 |
| `/programs` | 전체 프로그램 목록 (검색 / 카테고리 필터) |
| `/programs/[slug]` | 프로그램 상세 — 제목, 상태 배지, 참가 인원, 일정, 위치, 설명, 매니저, CTA, 사이드 HOT 목록 |

### 렌더링 전략
- 서버 컴포넌트에서 Supabase 조회.
- **ISR (Incremental Static Regeneration)** — 정적 사이트급 속도 + SEO.
- 관리자가 콘텐츠 변경 시 **on-demand revalidate**로 해당 페이지 재생성.

### SEO
- 페이지별 메타데이터(title/description/OG image) — Framer 사이트의 SEO 메타 이전.
- `sitemap.xml`, `robots.txt` 생성.

## 5. 관리자 UI

- 경로: `/admin` (동일 앱 내, 별도 프로젝트로 분리하지 않음)
- **Supabase Auth**로 로그인 보호 (이메일/비밀번호 또는 매직링크)
- 기능: 프로그램 **CRUD**
  - 목록 보기 / 생성 / 수정 / 삭제
  - HOT 토글, 상태 변경, 정렬
  - 대표 이미지 업로드(Supabase Storage)
- 저장 시 관련 공개 페이지 자동 revalidate

## 6. 디자인 충실도 확보

- 구현 착수 시 **Claude 브라우저 확장(claude.ai/chrome) 연결**.
- 각 페이지(홈/목록/상세) 스크린샷 + 실제 적용된 CSS(색/폰트/간격) 추출.
- 추출 값을 `tailwind.config`의 **디자인 토큰**으로 정리.
- 폰트/이미지 등 에셋 다운로드해 프로젝트에 포함.
- (선택) NoCodeExport 등으로 받은 정적 export ZIP을 `donuts/_framer-export/`에 두고 에셋/스타일 교차검증용 참고자료로만 활용. 코드 재사용은 하지 않음.

> 참고: Framer는 공식 코드 export 기능이 없으며, 제3자 도구는 정적 스냅샷(CMS 박제, 애니메이션 근사, 인터랙션 손실)만 제공하므로 보조 참고용으로만 쓴다.

## 7. 프로젝트 구조

위치: `/Users/seungmok/WebstormProjects/donuts`

```
donuts/
  app/
    (public)/
      page.tsx                # 홈
      programs/
        page.tsx              # 목록
        [slug]/page.tsx       # 상세
    admin/
      ...                     # 로그인 보호된 CRUD 화면
    api/                      # revalidate 등 필요한 라우트 핸들러
  components/                 # 공유 UI 컴포넌트
  lib/
    supabase/                 # Supabase 클라이언트(서버/클라이언트)
  styles/ tailwind 설정 등
  _framer-export/             # (선택) 참고용 에셋
  docs/superpowers/specs/     # 본 설계서
```

## 8. 비범위 (YAGNI)

- 회원가입/유저 인증(공개 사용자) — 현재 사이트에 없으므로 제외
- 결제/예약 시스템 — 제외
- 다국어 — 한국어 단일
- 별도 관리자 앱 분리 — 제외(단일 앱 내 `/admin`)

## 9. 미해결/구현 시 확정할 사항

- `programs`의 정확한 필드(카테고리/가격/외부링크 등)는 브라우저 확장으로 실제 페이지 정밀 확인 후 확정
- 검색/필터의 정확한 동작(클라이언트 필터 vs 서버 쿼리)
- 관리자 로그인 방식(이메일+비번 vs 매직링크) 최종 선택
- 커스텀 도메인(`do-nuts.kr`) Vercel 연결 시점
