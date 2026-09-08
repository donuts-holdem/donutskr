# 07. Implementation Roadmap

## Phase 0 — Freeze prototype
- 현재 `prototype/index.html`을 UI reference로 보존
- 실서비스 소스에 그대로 확장하지 말고 컴포넌트/백엔드 구조로 재작성 권장

## Phase 1 — Foundation
- Next.js/React 또는 팀 표준 프레임워크
- DB
- Auth
- object storage
- migrations
- audit logs
- server-side RBAC

## Phase 2 — Membership
- 가입신청
- username unique
- 개인정보 동의
- pending
- 관리자/클래스장/동아리장 승인
- 회원 소속 수정

## Phase 3 — Classes
- class CRUD
- automatic name suggestion
- leader assignment
- sessions 1~12
- state transitions
- attendance lock/edit
- class attendance XP hook 준비

## Phase 4 — Clubs & Meetings
- club CRUD/logo
- meeting CRUD
- admin DONUTS host
- club leader host
- application ON/OFF
- guest
- capacity
- close
- applications
- HOT
- complete
- archive job + history

## Phase 5 — Partners
- CRUD/logo/url/order

## Phase 6 — XP MVP
- xp ledger
- class attendance XP
- MY/Home XP displays
- admin adjustment with reason/audit

## Phase 7 — Daily Learning MVP
- question bank
- lesson/assignment
- 5-question daily GTO quiz
- explanation
- completion XP
- streak
- today card
- learning history

## Phase 8 — Analytics / Operations
- signup funnel
- attendance
- meeting application rate
- daily learning DAU
- completion rate
- quiz correctness by category
- XP weekly activity
- streak retention

## Background jobs
- completed meeting archive after 24h
- daily learning assignment publish/rollover
- streak update/verification
- optional notifications later
