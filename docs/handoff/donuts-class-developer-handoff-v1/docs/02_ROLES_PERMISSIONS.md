# 02. Roles & Permissions

## Role model
권한은 `사용자 역할 1개`가 아니라 `계정 + 할당` 구조로 구현하는 것을 권장한다.

- ADMIN: 별도 관리자 계정
- MEMBER: 모든 승인 회원의 기본 권한
- CLASS_LEADER: 특정 class_id에 대한 리더 할당
- CLUB_LEADER: 특정 club_id에 대한 리더 할당

한 회원이 CLASS_LEADER와 CLUB_LEADER를 동시에 가질 수 있다.

## Login behavior
1. 계정 인증
2. 서버에서 권한/할당 조회
3. 일반회원만 있으면 바로 회원뷰
4. 클래스장 또는 동아리장 할당이 있으면 모드 선택:
   - 회원뷰
   - 클래스장 관리뷰
   - 동아리장 관리뷰
5. ADMIN은 별도 관리자 콘솔로 이동

## Permission matrix
| 기능 | 회원 | 클래스장 | 동아리장 | 관리자 |
|---|:---:|:---:|:---:|:---:|
| 회원뷰 | O | O | O | 선택사항 |
| 가입신청 | O | O | O | O |
| 자기 프로필 열람 | O | O | O | O |
| 회원 승인 | X | 담당 클래스 신청자 | 담당 동아리 신청자 | 전체 |
| 회원 정보/소속 수정 | X | X | X | 전체 |
| 회원 삭제 | X | X | X | O |
| CLASS 생성/수정/삭제 | X | X | X | O |
| 클래스장 지정 | X | X | X | O |
| 담당 클래스 회차 관리 | X | O | X | 권장 O |
| 클래스 시작/시작취소 | X | O | X | 권장 O |
| 클래스 출석 체크/잠금 | X | O | X | 권장 O |
| 클래스 완료 | X | O | X | 권장 O |
| CLUB 생성/수정/삭제 | X | X | X | O |
| 동아리장 지정 | X | X | X | O |
| 모임 생성 | X | X | 담당 동아리 | O |
| 모임 수정/삭제 | X | X | 본인 생성 모임 | 전체 |
| 게스트/정원/신청 ON-OFF | X | X | 본인 생성 모임 | 전체 |
| 신청자 목록 열람 | 본인 신청만 | X | 담당/본인 모임 | 전체 |
| 모임 완료 | X | X | 본인 생성 모임 | 전체 |
| HOT 지정 | X | X | X | O |
| PARTNERS CRUD/순서 | X | X | X | O |
| XP 조회 | 본인 | 본인 | 본인 | 전체 조회 권장 |
| XP 수동 조정 | X | X | X | 권장 O + 감사로그 |
| 일일학습 응시 | O | O | O | 선택 |
| 퀴즈 콘텐츠 관리 | X | X | X | 관리자/콘텐츠 운영자 |

## Server-side enforcement
**TO BUILD**
- 모든 mutation API는 JWT/session의 실제 사용자와 권한을 서버에서 재확인
- 클라이언트에서 `currentMode`를 조작해도 권한 상승이 되면 안 됨
- CLASS_LEADER: class_leaders 테이블 기반
- CLUB_LEADER: club_leaders 테이블 기반
- ADMIN: 별도 admin account/role
- 승인 API는 신청자가 요청한 class_id/club_id와 리더의 담당 범위를 검증
