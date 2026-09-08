# DO:NUTS CLASS 개발자 전달 패키지

이 패키지는 현재 HTML 데모를 실제 서비스로 재개발하기 위한 기준 문서입니다.

## 가장 먼저 읽을 문서
1. `docs/01_PRODUCT_REQUIREMENTS.md` — 확정 기능 요구사항
2. `docs/02_ROLES_PERMISSIONS.md` — 관리자/클래스장/동아리장/회원 권한
3. `docs/03_DATA_MODEL.md` — 실제 DB 권장 구조
4. `docs/04_UI_FLOWS.md` — 가입·로그인·클래스·클럽 화면 흐름
5. `docs/05_XP_DAILY_LEARNING.md` — **현재 데모에 없는 신규 필수 기능: XP + 일일 GTO 학습**
6. `docs/09_PROTOTYPE_GAP_ANALYSIS.md` — 데모와 실서비스 차이

## 포함 파일
- `prototype/index.html`: 현재 최종 데모. 디자인/UX 참고용.
- `prototype/vercel.json`: 정적 데모 배포용 설정.
- `data/seed_members.csv`: 데모 기준 회원 50명.
- `data/seed_entities.json`: 클래스/동아리/데모계정 시드.
- `schema/postgresql_schema.sql`: 실제 백엔드 개발 시 참고할 PostgreSQL 초안.

## 매우 중요
현재 `prototype/index.html`은 **localStorage 기반 프론트엔드 시연물**입니다. 실제 인증, 서버 권한 검증, DB, 파일 업로드, 중복 아이디 원자적 검증, 개인정보 보호, 자동 삭제 작업은 구현되어 있지 않습니다.

실서비스에서는 UI에서 버튼을 숨기는 것만으로 권한을 처리하지 말고, 모든 write API에서 서버 측 권한을 다시 검증해야 합니다.

## 상태 라벨
문서에서는 기능을 다음 세 단계로 구분합니다.
- **IMPLEMENTED IN PROTOTYPE**: 현재 HTML에서 UX 확인 가능.
- **TO BUILD**: 실제 서비스 개발 시 반드시 구현.
- **RECOMMENDED**: 운영 편의를 위한 권장안. 숫자/정책은 운영 확정 후 조정 가능.
