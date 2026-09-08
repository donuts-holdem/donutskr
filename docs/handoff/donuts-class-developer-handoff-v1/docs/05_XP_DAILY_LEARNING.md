# 05. XP & Daily Learning Specification

> **TO BUILD — 현재 프로토타입에 아직 구현되지 않은 신규 필수 기능**

## 1. 목표
DO:NUTS CLASS를 단순 일정/출석 앱이 아니라 `매일 들어오는 포커 학습 커뮤니티 앱`으로 확장한다.

듀오링고처럼:
- 매일 짧은 학습
- 즉시 피드백
- XP 획득
- 연속 학습(streak)
- 클래스 활동과 온라인 학습이 하나의 성장 기록으로 연결

## 2. XP 획득 원칙
기본 XP 소스는 두 가지로 제한한다.
1. **클래스 참가**
2. **일일학습 완료**

클럽 일반 모임 참가, 파트너 클릭 등에는 기본적으로 XP를 주지 않는다.

## 3. Recommended initial XP values
아래 숫자는 **RECOMMENDED**이며 운영 확정값이 아니다.

| 행동 | 권장 XP |
|---|---:|
| 클래스 회차 출석 | +100 XP |
| 일일학습 1세트 완료 | +30 XP |
| 일일학습 전 문항 정답 | +10 XP 보너스 |
| 관리자 수동 조정 | ±N XP, 사유 필수 |

중요:
- 클래스장은 출석을 잠그는 시점 또는 클래스 완료 시 XP가 1회만 지급되어야 한다.
- 같은 session_id/user_id로 중복 지급 금지.
- 일일학습도 user_id/date_key당 기본 XP는 1회만 지급.
- `xp_transactions.idempotency_key` 필수.

## 4. XP 화면
### Home
프로필 카드 아래 권장:
- `TOTAL XP`
- `이번주 XP`
- `오늘 +30 XP`
- `7 DAY STREAK`
- `오늘의 학습` 버튼

### MY
- 누적 XP
- 레벨 또는 성장단계
- 최근 XP 내역
  - CLASS · 월요일 A 03회차 +100
  - DAILY · GTO Quiz +30
- 학습 streak
- 월간 활동 그래프(후순위)

## 5. Level system
**RECOMMENDED**
XP는 누적 보상이지 화폐가 아니다.

예:
- LV 1: 0
- LV 2: 300
- LV 3: 700
- LV 4: 1,200
- 이후 증가식

정확한 레벨 구간은 운영 데이터 후 조정.
초기 MVP는 레벨 없이 `누적 XP + 주간 XP + streak`만 구현해도 충분하다.

## 6. Daily Learning — MVP
### 하루 1세트
- 매일 1개의 `오늘의 학습`
- 3~5분 안에 끝나는 분량
- 권장 5문항
- GTO 기반 single-choice quiz 중심
- 완료 후 XP 지급

### 학습 시작 화면
- 오늘 날짜
- 주제
  - 예: `BTN vs BB · 30BB`
- 난이도
- 예상 소요 3분
- `학습 시작`

### 문제 화면
- 진행도 1/5
- 스팟 정보
- 선택지 4개
- 답 선택
- 즉시 정답/오답 피드백
- 짧은 해설
- 다음 문제

### 완료 화면
- 정답 수
- 획득 XP
- streak
- 틀린 문제 다시보기
- 다음날 다시 오도록 CTA

## 7. GTO quiz content format
퀴즈는 반드시 구조화 데이터로 저장.

예시 필드:
- category: PREFLOP / FLOP / TURN / RIVER / ICM
- game: NLHE
- format: MTT
- players: 6MAX / 9MAX
- stack_bb
- hero_position
- villain_position
- action_history
- hero_hand
- board
- pot
- question
- options
- correct_option
- explanation
- source/version

### 중요
MVP에서 LLM이 실시간으로 정답을 생성하게 하지 않는 것을 권장.
- 검수된 question bank를 먼저 구축
- 운영자가 문제/정답/해설을 publish
- 향후 GTO solver 데이터 연동 시 version/source 저장

## 8. Daily assignment algorithm
### MVP
- 매일 모든 회원에게 동일한 5문항 세트
또는
- 난이도 3단계 중 계정 레벨에 맞춰 한 세트

### V2
- 틀린 주제 가중
- spaced repetition
- 사용자 스택/포지션 취약점 기반 추천

## 9. Streak
**RECOMMENDED**
- 하루의 `daily_assignment COMPLETED` 시 streak 인정
- 클래스 출석만으로는 daily streak를 채우지 않음
- 자정 기준: Asia/Seoul
- 하루 미완료 시 current streak 초기화
- longest streak 보존

운영 정책에 따라 `streak freeze`는 추후 추가.

## 10. Daily Learning admin
향후 관리자/콘텐츠 운영자 기능:
- 문제 CRUD
- 정답 1개 지정
- 해설
- 카테고리/난이도 태그
- 일일 세트 구성
- 예약 공개
- 비공개
- 결과 통계
  - 응시수
  - 정답률
  - 보기별 선택률

## 11. XP integrity
XP는 절대 프론트엔드 계산 결과를 신뢰하지 않는다.
서버가 다음 조건을 검증하고 transaction을 생성:
- attendance locked/completed
- daily assignment completed
- 중복 idempotency key 없음

XP 합계:
`SUM(xp_transactions.amount)`
또는 cache column + ledger consistency check.

XP를 직접 덮어쓰는 `users.xp = 1000` 방식은 피한다.

## 12. Suggested home priority
회원 HOME 권장 순서:
1. 프로필 + Total XP
2. 오늘의 학습
3. 내 클래스/현재 회차
4. 이번주 DO:NUTS 일정
5. HOT 모임
6. 파트너

매일 접속을 유도하려면 `오늘의 학습`을 클래스 일정보다 위에 둘 수도 있다.

## 13. Acceptance criteria
- 일일학습 완료 전에는 그날 XP 미지급
- 완료 시 정확히 1회 지급
- 새로고침/재응시해도 중복 XP 없음
- 클래스 한 회차 출석 XP도 1회
- 출석 체크를 수정해 미출석으로 바꿀 경우 XP 회수 정책 필요
  - **RECOMMENDED:** 잠금 전에는 XP 미지급
  - 완료/잠금 후 수정으로 출석 취소 시 보정 transaction(-100) 기록
- 모든 XP 증감은 ledger에서 추적 가능
