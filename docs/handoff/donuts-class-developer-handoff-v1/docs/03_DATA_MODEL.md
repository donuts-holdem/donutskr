# 03. Recommended Data Model

아래는 실서비스용 권장 구조다. 현재 HTML의 localStorage 객체를 그대로 DB 스키마로 사용하지 않는다.

## Core tables
### users
- id UUID PK
- username UNIQUE NOT NULL
- password_hash NOT NULL
- name
- phone
- school_id nullable
- other_school_name nullable
- status: PENDING / ACTIVE / SUSPENDED / WITHDRAWN
- consented_at
- created_at / updated_at

### admins
- user/account 별도 운영 가능
- 실서비스에서는 관리자 계정을 일반 users와 분리하거나 `system_roles`로 분리
- 한승목 데모 관리자는 회원 50명에 포함되지 않음

### schools
- id
- name
- active
- sort_order

### clubs
- id
- name
- school_id
- description
- logo_url
- created_at / updated_at

### club_memberships
- user_id
- club_id
- joined_at
- active

### club_leaders
- club_id
- user_id
- assigned_by_admin_id
- assigned_at

### classes
- id
- name
- place
- weekday
- start_time
- active
- created_at / updated_at

### class_memberships
- user_id
- class_id
- joined_at
- active

### class_leaders
- class_id
- user_id
- assigned_by_admin_id
- assigned_at

### class_sessions
- id
- class_id
- session_no
- title
- description
- status: SCHEDULED / IN_PROGRESS / COMPLETED
- cancelled boolean
- attendance_locked boolean
- started_at
- completed_at
- updated_at

### class_attendance
- session_id
- user_id
- attended boolean
- checked_by
- checked_at
- UNIQUE(session_id, user_id)

## Signup
### signup_requests
권장: users.status=PENDING에 통합할 수도 있으나 승인 이력 분리를 위해 별도 테이블이 편하다.
- id
- user_id
- requested_school_id / requested_other_school
- requested_club_id nullable
- requested_class_id
- status
- approved_by
- approved_at
- rejected_at
- notes

## Meetings
### meetings
- id
- host_type: DONUTS / CLUB
- host_club_id nullable
- created_by_user_id nullable
- created_by_admin_id nullable
- title
- date
- time
- place
- description
- guest_allowed
- application_enabled default true
- application_closed default false
- capacity nullable
- hot default false
- completed_at nullable
- archive_at nullable = completed_at + 24h
- archived boolean default false
- created_at / updated_at

### meeting_applications
- meeting_id
- user_id
- status: APPLIED / CANCELLED
- applied_at
- cancelled_at
- UNIQUE(meeting_id, user_id)

중요: `application_enabled=false`로 변경해도 meeting_applications 행을 삭제하지 않는다.

### meeting_history / audit
별도 테이블을 만들거나 meetings를 soft archive한다.
실제 요구사항은 `활성 목록에서만 24시간 후 제거`, DB 기록은 유지이다.

## Partners
### partners
- id
- name
- description
- logo_url
- url
- sort_order
- created_at / updated_at

## XP / learning
상세는 `05_XP_DAILY_LEARNING.md`.

### xp_transactions
- id
- user_id
- source_type: CLASS_ATTENDANCE / DAILY_LEARNING / ADMIN_ADJUSTMENT
- source_id
- amount
- reason
- created_at
- created_by nullable
- idempotency_key UNIQUE

### learning_lessons
- id
- date_key
- title
- description
- status
- published_at

### quiz_questions
- id
- lesson_id nullable
- category
- difficulty
- prompt
- explanation
- active

### quiz_options
- id
- question_id
- option_key
- content
- is_correct

### daily_assignments
- id
- user_id
- date_key
- lesson_id
- status: ASSIGNED / STARTED / COMPLETED
- completed_at
- xp_awarded

### quiz_attempts
- id
- assignment_id
- question_id
- selected_option_id
- is_correct
- answered_at

### learning_streaks
계산형으로 처리하거나 materialized 상태 저장:
- user_id
- current_streak
- longest_streak
- last_completed_date

## Media
로고 업로드는 DB에 base64로 저장하지 말고 object storage(S3/Supabase Storage 등)에 저장하고 URL만 DB에 보관.
