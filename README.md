# Deterministic Provider Adapters

This learning activity adds repeatable quote and news providers to PortfolioPilot. It builds on the authenticated portfolio and watchlist application from milestones 01–10.

## Purpose and learning goals

The prompt asks the coding agent to define `QuoteProvider` and `NewsProvider` interfaces, implement deterministic mock providers, expose data mode and freshness in the UI, and add tests that future live adapters can reuse.

A **provider** supplies market information. An **adapter** translates that provider's response into the application's own format. An **interface** describes the methods and data an adapter must provide. A **mock** supplies fictional data for development and testing.

This matters because a portfolio application must distinguish current evidence from missing, delayed or stale information. A failed live provider must never be replaced silently with fictional prices or headlines. Repeatable examples also let students test failure conditions without external accounts, credentials or unpredictable network responses.

Students will learn to:

- Keep provider-specific responses and credentials on the server, outside browser contracts.
- Describe source identifiers, timestamps, currency, delays and supported capabilities explicitly.
- Use a controllable clock instead of randomness or waiting in unit tests.
- Handle duplicates, corrections, conflicting reports and missing prices.
- Resume paginated news safely and preserve last-known timestamps during failures.
- Verify application behavior with unit, database and browser tests.

**Deterministic** means the same clock, configuration and fixture produce the same result. A **fixture** is prepared example data. A **contract test** checks shared behavior that every compatible adapter should satisfy.

## Implementation steps performed

The work followed this order. These are the actual implementation steps, not a plan for unfinished features.

### 1. Inspect the existing application and milestone requirements

The agent read `AGENTS.md`, `docs/project-state.md`, milestone 11 in `docs/project-plan.md`, and the existing configuration, API, frontend and tests. The providers package initially exported only the mode type; the frontend news page used fixed fixtures.

`git status --short` reported that this directory was not a Git repository. No commit or push was made. Installed Next.js documentation and the official Route Handler reference were checked, along with installed TanStack Query polling types. A **Route Handler** is a server function that answers an HTTP request.

### 2. Define interfaces and clock-controlled mocks

Modified [packages/providers/src/index.ts](packages/providers/src/index.ts) to add:

- `QuoteProvider`, `NewsProvider`, normalized quote/article types and capability metadata.
- `ManualClock`, which tests advance explicitly, and the normal system clock.
- `MockQuoteProvider`, `MockNewsProvider` and their shared fixture implementation.
- Typed provider errors and `selectProviders`, which rejects missing or mock adapters in live mode.

Quotes use decimal strings such as `"125.00"`, not floating-point financial calculations. Security identity includes the exchange: ACME on XNAS and ACME on XNYS are separate instruments. News includes its canonical URL, source record ID and revision.

A **canonical URL** is the stable address used to identify an article. A **cursor** requests the next page; a **checkpoint** records how far delivery has progressed. Mock checkpoints reject malformed tokens and tokens from a different schedule or scenario. They advance only through delivered records.

### 3. Require explicit mode and add browser-safe schemas

Modified `packages/config/src/server.ts` and its tests. `DATA_MODE` must now be `mock` or `live`; missing or empty values fail validation. Added `MOCK_NEWS_INTERVAL_MS`, `MOCK_START_AT` and `MOCK_SCENARIO`.

Modified `packages/contracts/src/index.ts` to validate normalized market snapshots with Zod, the project's runtime data-validation library. Raw vendor responses are not part of these browser contracts.

Updated the API and worker environment examples. Added the existing providers workspace as an API dependency and refreshed `package-lock.json` without upgrading package versions.

### 4. Add authenticated market snapshots and stale-cache behavior

Created [apps/api/lib/market-service.ts](apps/api/lib/market-service.ts) and [apps/api/app/api/market/route.ts](apps/api/app/api/market/route.ts).

`GET /api/market` authenticates the request before accessing providers and sends `Cache-Control: no-store`, so HTTP caches should not reuse its response. The service shares overlapping reads, retains twenty latest articles, coalesces duplicate source records and applies newer revisions.

On provider failure, retained values become **stale immediately** and keep their original timestamps. Without a previous successful snapshot, the result is unavailable. At this milestone, live mode returns `not_configured` because no live adapter is installed.

### 5. Connect provider snapshots to the frontend

Created `apps/web/src/market.tsx` and modified `apps/web/src/app.tsx`. The News page now reads the authenticated API rather than the fixed frontend news list. The banner, sidebar and Settings show the server-selected mode and freshness.

The browser requests a snapshot every five seconds. This is **polling**: the client periodically asks for updates. It is not provider push or a real-time upstream feed. Article rows show source, revision, publication/provider/ingestion times, synthetic status and delay. Quote samples and missing quotes are also visible.

### 6. Add tests, resolve failures and document the activity

Created:

- `packages/providers/test/provider-contract.ts`: reusable adapter checks.
- `packages/providers/test/mock.test.ts`: clock boundaries and fixture scenarios.
- `apps/api/lib/market-service.test.ts`: correction, duplicate, stale-cache, recovery and recorded-live failure checks.
- `apps/web/e2e/providers.spec.ts`: scheduled news and browser failure labels.
- `docs/lessons/11-deterministic-provider-adapters.md`: capability and teaching notes.

Updated API authentication and demo-question tests for explicit `DATA_MODE`. Database acceptance also verifies authenticated market access and unavailable live mode.

Commands run during implementation included:

```powershell
npm.cmd ci --ignore-scripts --offline
npm.cmd install --package-lock-only --ignore-scripts --offline
npm.cmd run typecheck
npm.cmd run build
npm.cmd run check:browser-boundary
npm.cmd run test
npm.cmd run test --workspace @portfolio-pilot/api
npm.cmd run test:browser --workspace @portfolio-pilot/web
```

The offline installation used an already populated npm cache. Initial Prisma generation failed because the sandbox could not update its engine cache; approved cache access resolved it. Typechecking then caught a duplicate test field, and database tests caught an older production-authentication fixture missing `DATA_MODE`. Both fixtures were corrected before passing reruns. A duplicated UTC display label was also corrected after screenshot inspection.

## Results achieved

### Supported provider capabilities

| Adapter | Delivery and timing | Pagination and checkpoint | Corrections |
| --- | --- | --- | --- |
| Mock quotes | Polling; synthetic prices with a simulated 1,000 ms delay | Batch request; fetch timestamp checkpoint, not a resumable stream | No |
| Mock news | Polling; synthetic news with a simulated 1,000 ms availability delay | Pages of 1–100 scheduled records; cursor/checkpoint resume | Same record and URL with an increased revision |
| Live | No adapter installed | Not established | Not established |

The default news interval is 30,000 ms. The first article becomes available one second after the mock schedule starts. Tests control time directly; the browser demo uses elapsed system time. Old articles can be labeled stale even while the latest snapshot fetch is healthy.

### Fixture scenarios

| `MOCK_SCENARIO` | Result |
| --- | --- |
| `ordinary` | Numbered fictional ACME news updates |
| `duplicates` | Repeated delivery of the first article; the snapshot displays that record once |
| `corrections` | Second scheduled record revises the first article, retaining its URL and publication time |
| `conflicts` | Separate articles report steady and declining demand |
| `missing_quotes` | Requested securities appear in the missing list, with no invented zero price |
| `rate_limit` | Typed failure with a clock-derived retry timestamp |
| `outage` | Typed failure with unavailable data or stale retained values |

A **rate limit** means the provider temporarily refuses further requests. **Ingestion time** records when the adapter received a record; provider and publication times describe the supplied evidence.

### Observed application behavior

Chrome verification observed `MOCK DATA`, synthetic/delayed labels, UTC provenance, new numbered headlines and the ACME/XNAS sample price of USD 125.00. Example display text:

```text
MOCK DATA · fresh · Synthetic
ACME / XNAS: USD 125.00 · Fresh · Synthetic · Delayed 1000 ms
```

The following is a shortened example of the live-unavailable fields asserted in authenticated database acceptance, not a complete API response:

```json
{
  "mode": "live",
  "status": "unavailable",
  "error": "not_configured",
  "fetchedAt": null,
  "quotes": [],
  "articles": []
}
```

Recorded-live unit fixtures verified that a rate limit preserves the previous values and timestamps while changing status to stale. This was a local test, not a call to a real market-data vendor.

### Verified check results from the implementation session

| Check | Observed result |
| --- | --- |
| Offline dependency install | Passed; 347 packages installed, zero audit vulnerabilities reported |
| Full workspace typecheck | Passed after cache permission and fixture corrections |
| Full workspace build | Passed; existing Vite directive and three Next.js Node/Edge warnings remained |
| Browser dependency boundary | Passed; browser dependency graph contained web, config and contracts |
| Initial tests without database URLs | Passed, with 18 database cases explicitly skipped |
| Full tests with dedicated database URLs | 70 passed, none skipped |
| Final API tests after two additional cases | 33 passed, giving 72 verified tests across workspaces |
| Full Chrome acceptance | Five scenarios passed in 32.7 seconds |
| Final provider-only Chrome rerun | One scenario passed in 24.7 seconds |

The provider suite passed nine tests; the snapshot suite passed five. Final targeted tests, API typechecking and frontend builds also passed after capability/display refinements. The browser scenario used real API responses for scheduled mock news, then intercepted responses to check stale and unavailable presentation. Separate database acceptance checked the real live-unavailable route. Screenshots were captured and inspected.

These results describe the earlier implementation session. This README follow-up reviewed source files and documentation; it did not rerun the application tests.

## How to run and verify

### Prerequisites

- Node.js **24.21.0** and npm **11.19.0** available in your terminal.
- The migrated and seeded local PostgreSQL database from the previous activities.
- For the exact verified acceptance setup: `portfolio_m08_verify` and `portfolio_m07_auth_verify` on `127.0.0.1:5546`.
- Google Chrome for the configured Playwright browser tests. **Playwright** automates browser interactions; **Vitest** runs the unit and integration tests.
- Free local ports 5173 for Vite and 3001 for the Next.js API.

No market-data, Claude or Entra credentials are required in mock mode. Local PostgreSQL still needs its local connection settings for sessions and portfolios. The public example password below is only for the existing local teaching databases.

If you have not completed database setup, follow [lesson 06](docs/lessons/06-database-and-seed.md), [lesson 07](docs/lessons/07-authentication-and-authorization.md) and [lesson 08](docs/lessons/08-portfolio-and-transaction-apis.md) first. Milestone 11 reused existing containers and databases; it did not create new infrastructure.

All commands below run from the repository root in PowerShell. `npm.cmd` avoids Windows execution-policy errors from the `npm.ps1` wrapper. On other shells, use `npm` and the appropriate environment-variable syntax.

### 1. Install and build

```powershell
node --version
npm.cmd --version
npm.cmd ci --ignore-scripts --offline
npm.cmd run build:types
```

If your npm cache is empty, omit `--offline` to allow package downloads. The offline command was verified here; an uncached installation was not part of this activity. `build:types` builds the shared packages and generates the Prisma client needed by the API.

### 2. Start the credential-free mock demo

Use the already prepared local acceptance database:

```powershell
$env:NODE_ENV='development'
$env:DATA_MODE='mock'
$env:AGENT_MODE='mock'
$env:MOCK_NEWS_INTERVAL_MS='1000'
$env:MOCK_SCENARIO='ordinary'
$env:DATABASE_URL='postgresql://portfolio_local:local_only_change_me@127.0.0.1:5546/portfolio_m08_verify'
$env:DEMO_AUTH_ENABLED='true'
$env:AUTH_BASE_URL='http://127.0.0.1:5173'
$env:ANTHROPIC_API_KEY=''
$env:ENTRA_CLIENT_ID=''
$env:ENTRA_CLIENT_SECRET=''
$env:ENTRA_TENANT_ID=''
npm.cmd run dev
```

Leave `MOCK_START_AT` unset for a new schedule. A fixed historical start time can create a backlog that needs several polls to catch up.

1. Open **http://127.0.0.1:5173/news**.
2. Click **Sign in as Alice Demo**.
3. Wait for the five-second browser refresh. Expect fictional headlines and explicit mock, freshness and delay labels.
4. Observe a headline number change on subsequent refreshes.
5. Open **Settings** to inspect the mode and configured interval.
6. Open **Portfolios** to confirm that persisted holdings still show their own quote status.

The one-second mock interval makes the demo quicker, but the browser still polls every five seconds. It may therefore show several new records per refresh.

### 3. Explore failure fixtures

Stop the development servers with Ctrl+C, change the scenario, and restart:

```powershell
$env:MOCK_SCENARIO='corrections'
npm.cmd run dev
```

Replace `corrections` with another scenario from the table above. Startup in `outage` or `rate_limit` has no successful cached snapshot, so the expected result is unavailable. Stale-after-success behavior was verified by changing an existing provider instance inside tests, rather than restarting and losing its cache.

To inspect unavailable live mode, restart with:

```powershell
$env:DATA_MODE='live'
$env:REDIS_URL='redis://127.0.0.1:6379'
npm.cmd run dev
```

Keep the local database and demo-authentication settings from the previous block. Expect `LIVE DATA`, unavailable/not configured, and no synthetic replacement articles or quotes. The authenticated route result was verified in database acceptance. Restore `DATA_MODE=mock` before running mock browser acceptance.

### 4. Run local checks

```powershell
$env:DATA_MODE='mock'
npm.cmd run typecheck
npm.cmd run build
npm.cmd run check:browser-boundary
npm.cmd run test --workspace @portfolio-pilot/providers
npm.cmd run test --workspace @portfolio-pilot/api -- --run lib/market-service.test.ts
```

These provider/snapshot tests require no external credentials or database connection. The reusable contract harness can be imported by future live-adapter tests using recorded responses and a fixed clock; see [lesson 11](docs/lessons/11-deterministic-provider-adapters.md).

### 5. Run database and browser acceptance

Use only the dedicated local test databases: acceptance modifies test records and sessions.

```powershell
$env:DATA_MODE='mock'
$env:PORTFOLIO_TEST_DATABASE_URL='postgresql://portfolio_local:local_only_change_me@127.0.0.1:5546/portfolio_m08_verify'
$env:AUTH_TEST_DATABASE_URL='postgresql://portfolio_local:local_only_change_me@127.0.0.1:5546/portfolio_m07_auth_verify'
npm.cmd run test
```

Without those two test URLs, database tests skip instead of claiming a pass. For browser acceptance, keep the ordinary mock demo running against `portfolio_m08_verify` in one terminal. In a second terminal:

```powershell
$env:PORTFOLIO_E2E_DATABASE_URL='postgresql://portfolio_local:local_only_change_me@127.0.0.1:5546/portfolio_m08_verify'
npm.cmd run test:browser --workspace @portfolio-pilot/web
# Or run only this activity's browser scenario:
npm.cmd run test:browser --workspace @portfolio-pilot/web -- providers.spec.ts
```

Browser acceptance requires the actual running frontend/API, seeded users, Chrome and the one-second ordinary mock configuration. A successful test run prints the passing test counts shown in the verification table; timings can vary.

## Limitations and unfinished work

- **No live adapter:** Vendor selection, credentials, permitted storage and actual delay/real-time capabilities remain for milestone 12. No real vendor network call was verified.
- **No durable ingestion:** The snapshot and checkpoint live in API process memory and reset on restart. Worker ingestion, persisted checkpoints and durable cache/outbox recovery belong to later milestones.
- **Bounded snapshots:** The service retains twenty articles and reads at most one hundred scheduled records per request. Older schedules can need several polls to catch up. There is no complete article-history browser or UI pagination yet.
- **Limited deduplication/history:** Source-record duplicates coalesce and newer revisions replace older ones. Canonical-URL deduplication across different records and durable correction history are unfinished.
- **Samples do not value portfolios:** Quote samples do not write to PostgreSQL or update portfolio valuations. Historical seed quotes can still make portfolio values unavailable.
- **Polling, not push:** No upstream push feed or SSE connection was added. Browser refresh depends on the page being active.
- **Failure testing boundaries:** Browser failure presentation used intercepted responses. Recorded-live failure tests used local fixtures, not real live data. Startup fixture selection cannot preserve a cache from a previous process.
- **Resolved failures and remaining warnings:** Cache permission and test-fixture failures were fixed. Existing Vite/Next.js build warnings remain; they did not prevent the verified builds. No required local check remained blocked at implementation completion.
- **Other services:** Real Entra sign-in and real Claude responses remain unverified without credentials. No cloud provisioning, public deployment, commit or push occurred.
- **Documentation mismatch:** The current [project-state table](docs/project-state.md) marks milestone 11 complete, but its top summary and latest detailed report still describe milestone 10. Use this activity's verification record and [lesson 11](docs/lessons/11-deterministic-provider-adapters.md) for milestone 11 details; those older state sections need reconciliation.

## Further reading

- [Project contract](AGENTS.md): architecture, ownership and financial correctness rules.
- [Project plan](docs/project-plan.md): scope and acceptance criteria for each milestone.
- [Milestone 11 lesson](docs/lessons/11-deterministic-provider-adapters.md): provider capabilities and testing details.
- [Pinned versions](docs/versions.md): tool and dependency compatibility.
- [Architecture decisions](docs/decisions/README.md): the reasons behind earlier design choices.
