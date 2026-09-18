# Höstlovet.se: implementation and handoff

## Information architecture
- `/`: parent's working dashboard, approvals first, budget, child progress, assignment catalog.
- `/start`: landing page, explanation, registration entry.
- Dialogs: parent test registration → child profile → assignment selection → mock payment → personal link.
- `/barn`: one-use link redeemed from URL fragment → secure child session → detail → completion confirmation → reward status.
- `/admin`: own-household support sandbox, orders, failure scenarios, retry eligibility, immutable ledger, audit events and simulated refund.
- `/om`: accurate implemented-versus-production status and privacy information.

## Data model
The sixteen tables in db/schema.ts implement Household, ParentUser, ChildProfile,
ChallengeTemplate, AssignedChallenge, CompletionClaim, Approval, Payment,
LedgerTransaction, RewardOrder, Coupon, Notification, AuditEvent, ChildSession, RateLimit and BalanceAccount.
Catalog definitions are currently versioned in lib/catalog.ts. Assigned amounts are server-derived snapshots.
PostgreSQL schema and an atomic approval function live in db/postgres/schema.sql.
**The hosted implementation uses D1/SQLite, not PostgreSQL.** No PostgreSQL server or
connection was supplied; this is an explicit incomplete production requirement.

## State and money
Assigned → Claimed → Approved → Issuing → Delivered. Rejected returns to a claimable
state. Temporary failures keep reserved funds and enter Failed with exponential
backoff (2s, 4s, 8s, capped 60s). Definitively permanent mock failures release the
reservation and enter ManualReview. Ambiguous real-provider outcomes need status
reconciliation, never unconditional release or a new idempotency key.

All money uses integer öre. Journal totals derive available/reserved/spent/refunded.
Reservation: (-amount, +amount, 0, 0). Issuance accepted: (0,-amount,+amount,0).
Release: (+amount,-amount,0,0). Refund: (-amount,0,0,+amount).
Refunded is money returned to the payer, not a released reservation.
The journal and audit APIs are append-only, with no UPDATE/DELETE operation.
A balance_accounts projection has database CHECK constraints; its updates, journal
inserts and orders share atomic batches, preventing overspend and partial approval.
The hosted migration loader cannot install SQLite triggers; PostgreSQL production
schema includes database-level immutability triggers. D1 therefore assumes trusted
server code and restricted direct database administration.
Unique payment, approval, order, coupon and notification identifiers prevent duplicate issuance.
Issuance is not redemption: an accepted order is spent budget, not proof of store redemption.

## Providers, sessions, access
MockPaymentProvider supports card and Swish simulations; MockCouponProvider exposes
success/temporary/permanent errors; MockSmsProvider records explicitly simulated messages.
There are **no real payment, coupon or SMS calls**. Generic HMAC+timestamp verification
is supplied and unit tested, but real provider-specific callbacks are not connected.
No integration secret is hardcoded. Environment placeholders are in .env.example.

Private platform sign-in identifies the parent. API ownership checks scope every
operation to that household. There is no public parent-password registration.
The admin route is explicitly an own-household support demo, not a real admin role.
A child token is random, stored hashed, expires after 24h, single-use and exchanged
for Secure/HttpOnly/SameSite=Strict cookie (7d). Reissuing/revoking increments version
and revokes sessions. Fragment is removed before redeem. Child API responses omit
budget, phone number, payments and audit data. No parent identity is carried by an
independent child session. The private Site access gate still prevents external
children from using a link without the owner's private-site access.
Rate limiting is persisted (90 actions/minute/actor). Same-origin check protects POST.
No API or personal data are cached by the service worker. Offline screen supports
safe reconnect; no queued offline payments or claims.

## Running and verification
- npm run db:generate (Drizzle D1 migration generation; preserve applied migrations).
- node tests/flow.mjs (executes actual engine against SQLite with batch rollback).
- npx tsc --noEmit.
- standard Sites build and private publication scripts.
Tests exercise success, idempotency, ledger immutability, rejection, transient and
permanent errors, refunds, role/household isolation, session revocation and deletion.
No browser, assistive-technology or live-provider certification is claimed.

## Integration decision for Clearon
Reuse the existing issuance, digital value bearer, SMS distribution, redemption and
clearing services *if their contracts support this new workflow*. Add a parent/child
orchestration domain, completion/approval state machine, budget subledger and outbox.
Do not build a second clearing network. The public sites verify the product proposition,
not the CMS, database, private API contracts, idempotency semantics or hosting stack.
Sources inspected 2026-09-09: https://mobilapresentkort.se/ and https://www.clearon.se/.
Brand source: uploaded Clearon Brand Guidelines 2026.pdf, section 3.2.1 and 3.3.1.

Before production obtain: existing repository/architecture; KS/Mobila Presentkort
API specification and sandbox; product IDs, denomination and fees; issuer acceptance
vs SMS delivery vs redemption event contracts; payment reservation/refund rules;
provider idempotency retention; duplicate/event replay semantics; sandbox secrets;
continuous queue runtime; support permissions, retention, backup and deletion policy.
Validate GDPR roles rather than treating the parent as the service's controller by
assumption. Complete WCAG 2.2 AA, security, PostgreSQL concurrency and device tests.
