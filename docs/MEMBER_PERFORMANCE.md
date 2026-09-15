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

## Controlled correction

First change only the existing deployment's function region to `icn1`. The
database, authentication checks, RLS, runtime and feature behavior stay intact.
Run the same browser measurements on the deployed change before deciding whether
any query changes are necessary. No new database or service is provisioned.

Additional read-path findings to assess after the region correction:

- Proxy and the member DAL both fetch the Auth user.
- Member permission and profile reads are sequential.
- Home and CLASS request full course detail, including unused attendance data.
- Public meeting lists fetch operator assignments and operator club choices.

Private timing evidence:
`/private/tmp/donuts-reference-audit/member-performance/`.
