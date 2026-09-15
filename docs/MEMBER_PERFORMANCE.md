# Member page latency — 2026-09-15

## Reproduction

The member loading label covers the entire pending page, including class,
meeting and learning reads. It does not measure authentication alone.
On production commit `5a93ebd`, two mobile Chrome document loads showed:

| Page | First measurement | Second measurement |
| --- | ---: | ---: |
| Home | 4,518 ms | 4,964 ms |
| CLASS | 5,307 ms | 4,828 ms |
| CLUB | 3,442 ms | 5,842 ms |
| MY | 3,832 ms | 4,056 ms |
| Partners | 2,753 ms | 2,156 ms |
| Learning | 2,765 ms | 1,741 ms |

Measurement: navigation start to the first visible main heading, using the same
existing test member at 390 × 900 on the canonical production site. These are
small-sample browser observations, not a production percentile or an SLA.
Account values, cookies and page bodies are excluded from the report.

## Confirmed deployment mismatch

The Supabase Management API reports `ap-northeast-2` (Seoul). Production responses
carry `x-vercel-id: icn1::iad1::…`, showing execution through Washington, D.C.
Vercel documents the execution-region meaning of this header and supports a
single Seoul function region through `vercel.json`.

- [Function region configuration](https://vercel.com/docs/functions/configuring-functions/region)
- [Response header definition](https://vercel.com/docs/headers/response-headers#x-vercel-id)
- [Region identifiers](https://vercel.com/docs/regions)

## Correction and measured result

Commit `3ced1a8401f5d6405f68ceb44de12fe5208da055` changes only deployment
configuration: the existing functions now run in `icn1`. No database or service
was added. GitHub production deployment `6460794480` succeeded at 23:11 KST:
<https://donutskr-onf0mgymj-donutskr.vercel.app>.

Every subsequent document response reports `icn1::icn1`. The same script,
test member and viewport produced these two-load means:

| Page | Before | Seoul | Reduction |
| --- | ---: | ---: | ---: |
| Home | 4,741 ms | 1,405 ms | 70.4% |
| CLASS | 5,068 ms | 1,408 ms | 72.2% |
| CLUB | 4,642 ms | 1,116 ms | 76.0% |
| MY | 3,944 ms | 1,156 ms | 70.7% |
| Partners | 2,455 ms | 916 ms | 62.7% |
| Learning | 2,253 ms | 900 ms | 60.1% |

Mobile menu navigation from home also improved:

| Destination | Before | Seoul |
| --- | ---: | ---: |
| CLASS | 6,360 ms | 823 ms |
| CLUB | 4,390 ms | 829 ms |
| Partners | 2,839 ms | 808 ms |
| MY | 3,336 ms | 951 ms |

The same-page HOME click is excluded because it performs no navigation. The
comparison demonstrates the deployment-region cause without changing any Auth,
member status, administrator, leadership or RLS checks. Source inspection also
identified additional round trips that could be tuned if a later measurement
justifies changing the data paths:

- Proxy and the member DAL both fetch the Auth user.
- Member permission and profile reads are sequential.
- Home and CLASS request full course detail, including unused attendance data.
- Public meeting lists fetch operator assignments and operator club choices.

These are source-level observations; identical GET requests may already be
memoized within a render. They were not changed as part of the regional fix.

## Verification

- Existing full suite on the merged change: **204 passed, 35 files**.
- Vercel configuration parsed and checked against the official supported settings;
  the actual production build and deployment succeeded.
- Canonical-production smoke: **17 member/class-leader/club-leader/anonymous page
  checks passed**, with HTTP 200, zero page errors, horizontal overflow or axe
  WCAG 2 A/AA and 2.1 AA violations.
- No implementation, dependency, migration, member data or permission changes.

Private timing and smoke evidence:
`/private/tmp/donuts-reference-audit/member-performance/` (`before.json`,
`seoul.json`, `smoke/report.json`). Timing runs finished at 23:09 and 23:12 KST.
