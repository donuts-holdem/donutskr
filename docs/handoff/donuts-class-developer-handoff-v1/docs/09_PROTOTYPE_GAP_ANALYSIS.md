# 09. Prototype Gap Analysis

## 현재 HTML 데모에서 확인 가능한 것
**IMPLEMENTED IN PROTOTYPE**
- 모바일 블랙/옐로우 UI
- 데모 역할 로그인
- 50명 seed
- ATC 15명
- 관리자/동아리장/클래스장/회원 화면
- 가입신청 UI와 승인대기
- CLASS/CLUB/MEETINGS/PARTNERS 관리 UI
- 클래스 상태/출석 UX
- 모임 신청/취소/ON-OFF/정원/HOT/완료 UX
- localStorage 상태 유지
- 완료 모임 24시간 조건의 프론트 cleanup 개념

## 실서비스에 반드시 다시 구현할 것
**TO BUILD**
- 실제 인증/session
- password hash
- 서버 RBAC
- DB
- file storage
- username DB unique index
- 전화번호/개인정보 보호
- audit log
- server-side meeting archive job
- capacity concurrency control
- real member assignment/approval transaction
- URL sanitization
- image upload validation
- CSRF/XSS/authorization hardening
- XP
- daily GTO learning
- streak
- analytics

## 현재 데모를 그대로 backend 붙여서 쓰면 안 되는 이유
- 모든 state가 브라우저 localStorage
- 관리자 역할도 클라이언트 선택
- 사용자 ID를 JS에서 변경 가능
- 권한 검증이 UI 로직 중심
- base64 이미지가 localStorage 크기 한계에 걸릴 수 있음
- 24시간 삭제가 사용자의 브라우저가 앱을 열 때 cleanup되는 방식
- real-time / multi-user sync 없음

## 구현 방향
현재 데모는 **pixel/interaction reference**로 사용하고, 실제 서비스는 컴포넌트 + API + DB 기반으로 다시 작성한다.
