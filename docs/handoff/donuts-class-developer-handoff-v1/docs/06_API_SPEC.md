# 06. API Contract Draft

REST 예시. GraphQL/Server Actions 사용 시에도 권한/상태 전이는 동일하게 유지.

## Auth
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/signup-requests`
- GET `/api/me`
- GET `/api/me/modes`

## Membership approval
- GET `/api/signup-requests?scope=approvable`
- POST `/api/signup-requests/:id/approve`
- POST `/api/signup-requests/:id/reject`

Approve body:
```json
{
  "schoolId": "...",
  "clubId": "...",
  "classId": "..."
}
```

## Members — admin
- GET `/api/admin/members`
- PATCH `/api/admin/members/:id`
- DELETE `/api/admin/members/:id`

## Classes
- GET `/api/classes`
- POST `/api/admin/classes`
- PATCH `/api/admin/classes/:id`
- DELETE `/api/admin/classes/:id`
- PUT `/api/admin/classes/:id/leaders`
- POST `/api/classes/:classId/sessions/:sessionId/start`
- POST `/api/classes/:classId/sessions/:sessionId/revert-start`
- POST `/api/classes/:classId/sessions/:sessionId/cancel`
- POST `/api/classes/:classId/sessions/:sessionId/uncancel`
- PUT `/api/classes/:classId/sessions/:sessionId/attendance`
- POST `/api/classes/:classId/sessions/:sessionId/attendance/lock`
- POST `/api/classes/:classId/sessions/:sessionId/attendance/unlock`
- POST `/api/classes/:classId/sessions/:sessionId/complete`

## Clubs
- GET `/api/clubs`
- POST `/api/admin/clubs`
- PATCH `/api/admin/clubs/:id`
- DELETE `/api/admin/clubs/:id`
- PUT `/api/admin/clubs/:id/leaders`

## Meetings
- GET `/api/meetings`
- POST `/api/meetings`
- PATCH `/api/meetings/:id`
- DELETE `/api/meetings/:id`
- POST `/api/meetings/:id/apply`
- DELETE `/api/meetings/:id/application`
- POST `/api/meetings/:id/close-applications`
- POST `/api/meetings/:id/open-applications`
- POST `/api/meetings/:id/complete`
- PATCH `/api/admin/meetings/:id/hot`

### Meeting list query behavior
서버는 요청 사용자 기준으로 볼 수 있는 모임만 반환:
- 내 동아리 모임
- guest_allowed 오픈 모임
- DONUTS 주최 모임
- 완료 후 archive_at 전인 모임

## Partners
- GET `/api/partners`
- POST `/api/admin/partners`
- PATCH `/api/admin/partners/:id`
- DELETE `/api/admin/partners/:id`
- PUT `/api/admin/partners/order`

## XP / learning
- GET `/api/me/xp`
- GET `/api/me/xp/transactions`
- GET `/api/learning/daily`
- POST `/api/learning/daily/:assignmentId/answers`
- POST `/api/learning/daily/:assignmentId/complete`
- GET `/api/learning/history`

Admin:
- POST `/api/admin/learning/questions`
- PATCH `/api/admin/learning/questions/:id`
- POST `/api/admin/learning/lessons`
- POST `/api/admin/learning/lessons/:id/publish`

## Error conventions
- 400 validation
- 401 unauthenticated
- 403 unauthorized
- 404 not found/not visible
- 409 duplicate username / state conflict / capacity full
- 422 invalid state transition

모임 참가신청은 transaction/lock을 사용해 capacity 초과 race condition 방지.
