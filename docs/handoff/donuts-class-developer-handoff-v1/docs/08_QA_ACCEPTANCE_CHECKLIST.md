# 08. QA / Acceptance Checklist

## Auth / signup
- [ ] username 중복 제출이 DB 레벨에서도 차단
- [ ] 비밀번호/확인 불일치 차단
- [ ] 개인정보 동의 미체크 제출 차단
- [ ] 기타 학교 입력 검증
- [ ] PENDING 계정 로그인 차단
- [ ] 승인 후 로그인 가능
- [ ] 클래스장/동아리장 계정은 관리뷰/회원뷰 선택 가능
- [ ] 일반회원이 URL 직접 입력으로 관리자 API 호출 불가

## Members
- [ ] 관리자 50명 seed와 별도 계정
- [ ] 이민찬/조용훈은 회원 목록에 존재
- [ ] 한승목은 회원 목록에 없음
- [ ] 필터/검색
- [ ] 회원 수정/삭제
- [ ] leader assignment 제거 시 즉시 관리 권한 반영

## Classes
- [ ] 같은 요일 A/B 자동명
- [ ] 수동 이름 수정 가능
- [ ] 리더 최소 1명 검증
- [ ] 1~12 회차
- [ ] 제목/설명
- [ ] 시작 → 진행
- [ ] 시작취소 → 예정
- [ ] 취소/해제
- [ ] 출석 체크
- [ ] 출석 잠금 후 수정 불가
- [ ] `출석 수정` 후 수정 가능
- [ ] 완료 상태
- [ ] 출석 XP 중복 지급 없음

## Clubs
- [ ] logo upload
- [ ] leader required
- [ ] 새 CLUB이 가입신청 선택지에 등장

## Meetings
- [ ] 관리자 생성 host=DONUTS 고정
- [ ] 동아리장 생성 host=담당 club
- [ ] 동아리장이 타인이 만든 일정 수정 불가
- [ ] applicationEnabled 기본 true
- [ ] ON → OFF 변경 시 applicant rows 유지
- [ ] OFF → ON 복구 시 applicant rows 그대로 표시
- [ ] 신청 확인 팝업
- [ ] 신청취소 확인 팝업
- [ ] capacity race condition 차단
- [ ] 정원 도달 시 마감
- [ ] 수동 신청마감 시 마감
- [ ] 완료 후 OFF
- [ ] 완료 확인 팝업에 24시간/archive 안내
- [ ] 24시간 후 활성목록 제거
- [ ] DB/history에서 기록 유지
- [ ] HOT 최상단
- [ ] 날짜 아래 시간
- [ ] 완료 전 ON/OFF/신청완료 상태 정확

## Partners
- [ ] logo/url
- [ ] reorder
- [ ] deletion mode
- [ ] public order identical to admin order

## XP
- [ ] 클래스 attendance source 당 1회
- [ ] daily assignment 당 1회
- [ ] refresh/retry로 중복 없음
- [ ] ledger 합계와 화면 합계 일치
- [ ] 보정 transaction 감사 가능

## Daily Learning
- [ ] 하루 1 assignment
- [ ] 5문항 모두 완료해야 completion
- [ ] 문제마다 정답 하나
- [ ] 즉시 해설
- [ ] 완료 XP 1회
- [ ] Asia/Seoul 날짜 기준
- [ ] streak 업데이트
- [ ] 이전 학습 내역 조회
