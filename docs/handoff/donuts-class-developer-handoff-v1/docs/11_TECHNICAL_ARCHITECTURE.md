# 11. Technical Architecture Recommendation

## Recommended deployment shape
- Web: Next.js (App Router) / React
- API: Next.js Route Handlers or separate Node backend
- DB: PostgreSQL
- ORM: Prisma / Drizzle 등 팀 표준
- Auth: server session 또는 secure JWT + refresh strategy
- Storage: S3-compatible object storage
- Scheduled jobs: Vercel Cron / queue / worker
- Timezone business rules: `Asia/Seoul`

특정 스택은 확정 요구사항이 아니며 개발팀 표준이 우선이다.

## Frontend boundaries
권장 route:
- `/` member home
- `/class`
- `/club`
- `/partners`
- `/my`
- `/leader/class`
- `/leader/club`
- `/admin/*` — 실서비스 별도 관리자 영역

### Components
- AppShell / BottomNav
- MemberProfileCard
- ClassProgressTimeline
- SessionDetail
- AttendanceRoster
- MeetingCard
- MeetingDetail
- MeetingEditor
- ApplicationStatus
- PartnerCard
- XPCard
- DailyLearningCard
- QuizRunner
- LearningComplete

## Backend services
- AuthService
- MembershipService
- ClassService
- AttendanceService
- ClubService
- MeetingService
- PartnerService
- XPService
- LearningService
- MediaService
- AuditService

## Transaction boundaries
### 가입 승인
한 transaction에서:
1. signup request 상태 검증
2. users.status=ACTIVE
3. school membership 반영
4. club_membership upsert
5. class_membership upsert
6. 승인 로그

### 모임 신청
한 transaction에서:
1. meeting row lock 또는 atomic capacity check
2. application_enabled / application_closed / completed 검증
3. visible/eligible 검증
4. 현재 APPLIED 수 < capacity 검증
5. meeting_application upsert

### 클래스 완료 / XP
1. session state 검증
2. attendance_locked 확인
3. session COMPLETED
4. 출석 회원마다 xp_transactions insert with unique idempotency key
5. 중복 충돌은 무시 또는 기존 transaction 반환

### Daily learning complete
1. assignment 모든 문항 답변 여부
2. status COMPLETED
3. xp transaction insert
4. streak update
한 transaction으로 처리 권장.

## Scheduled jobs
### Meeting archival
매시간 또는 10분 단위:
`completed_at IS NOT NULL AND archive_at <= now() AND archived=false`
→ archived=true

삭제가 아니라 archive이므로 운영기록 보존.

### Daily learning
KST 날짜 기준:
- 다음날 lesson publish
- 필요 시 daily_assignments lazy-create 가능
  - 사용자가 접속할 때 그날 assignment 생성
- full pre-generation은 회원 수가 크지 않을 때도 가능

## Security
- password: Argon2id/bcrypt
- phone masking in admin list where appropriate
- consent version 저장 권장
- file MIME/size validation
- URL allowlist/validation
- admin actions audit
- leader permissions always entity scoped
- rate limit login/signup/quiz submission
- CSRF strategy if cookie auth

## Observability
event names 권장:
- signup_submitted
- signup_approved
- login_success
- mode_selected
- class_session_started
- attendance_locked
- class_session_completed
- meeting_created
- meeting_applied
- meeting_cancelled
- meeting_completed
- daily_learning_started
- daily_learning_completed
- xp_awarded

## MVP performance
회원 규모가 수백~수천 명 수준이면 단일 PostgreSQL + stateless web 서버로 충분.
XP 총합은 초기에는 SUM ledger로도 가능하나, 홈 조회가 많아지면 cached balance를 transactionally 관리.
