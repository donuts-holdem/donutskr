# 04. UI & State Flows

## A. Signup
`구글 신청폼 → 현장방문 → 웹 가입신청 → 승인대기 → 담당자 승인 → 로그인`

가입신청 완료 화면:
- 승인대기 배지
- 이름 / 아이디
- `현장에서 담당 운영진의 승인을 받으면 로그인할 수 있습니다.`

## B. Login
데모: 관리자/동아리장/클래스장/일반회원 4카드.
실서비스:
- 아이디/비밀번호만 입력
- 서버 권한 조회
- 리더 권한 없음 → 회원 홈
- 리더 권한 있음 → 모드 선택

### Mode Choice
예: 이민찬
- `동아리장 관리뷰`
- `회원뷰`

예: 클래스+동아리장 동시 권한
- `클래스장 관리뷰`
- `동아리장 관리뷰`
- `회원뷰`

## C. Member Home
- DO:NUTS 프로필
- 내 클래스
- 이번주/예정 모임
- **TO BUILD:** XP 카드
- **TO BUILD:** 오늘의 학습 카드

## D. CLASS Member
- 클래스명
- 요일/시간/장소
- 회차 타임라인
- 각 회차: 번호 / 제목 / 설명 / 상태
- 클릭 시 상세
- 출석 여부 표시

## E. CLASS Leader
1. 담당 클래스 목록
2. 클래스 선택
3. 회차 목록
4. 회차 관리 상세
   - 시작
   - 시작 취소
   - 모임 취소/해제
   - 출석 체크
   - 출석 잠금/수정
   - 완료

상태 전이:
- SCHEDULED → IN_PROGRESS → COMPLETED
- IN_PROGRESS → SCHEDULED (시작 취소)
- cancelled는 별도 boolean

## F. CLUB Member
목록 정렬:
1. HOT
2. 날짜/시간
3. 완료 모임은 24시간 내에서만 노출

카드:
- 날짜
- 그 아래 시간
- 학교모임/오픈모임
- 주최
- 제목
- 장소
- 신청상태
- 신청자/정원

상태 라벨:
- ON
- ✓ 신청완료
- OFF
- 마감

## G. Meeting Detail
- 이름
- 주최
- 날짜
- 시간
- 장소
- 설명
- 오픈/동아리 모임
- 정원
- 신청상태
- 참가신청/취소

동아리장/관리자는 추가:
- 신청자 명단
- 신청 ON/OFF
- 신청 마감/해제
- 수정
- 삭제
- 모임 완료
- 관리자는 HOT

## H. Meeting complete
1. `모임 완료` 클릭
2. 팝업:
   - `완료 처리하면 참가신청이 OFF 됩니다.`
   - `24시간 뒤 일반 목록에서 삭제됩니다.`
   - `DB 기록은 유지됩니다.`
3. confirm
4. completed_at 저장
5. application_enabled=false
6. archive_at=completed_at+24h
7. background job이 archive 처리

## I. PARTNERS
- 정렬된 카드 목록
- 클릭 → URL 이동
- 관리자: drag/reorder 또는 ↑↓
- 편집
- 삭제모드

## J. XP / Daily learning
상세 `05_XP_DAILY_LEARNING.md`.
홈에:
- 현재 XP
- 오늘 획득 XP
- 연속 학습 일수
- `오늘의 학습` CTA
