# Discount-code rewards

Members choose an offer, confirm its points cost, and immediately receive a partner-issued code. The code, original offer terms, instructions and expiry remain in My redemptions. Copy is available with a manual selection fallback for webviews without clipboard access.

## Partner setup

In Platform Admin → Rewards:

1. Create an inactive offer. Categories enforce 400 points / 10% for restaurants and cafés, 600 / 10% for supplements, and 800 / 15% for gym classes.
2. Specify eligible items, exclusions, minimum spend, redemption instructions, optional HTTPS shopping URL, and the agreed code expiry.
3. Obtain unique codes from the partner that are already configured in their checkout (or recognized by staff), with matching terms and single-use restrictions. Add up to 100 per batch.
4. Confirm partner approval and activate. Pause the offer to stop new redemptions; already issued codes remain available until their agreed expiry.

Each member can redeem each offer once. Create a new offer for a new campaign. Offer details are immutable through the admin UI after creation; this avoids silently changing promised terms. Shared/public reusable codes and refunds are not introduced in this change.

No partner offers or codes are seeded. The stores contacted by email have not thereby become approved reward partners. Thrivv allocates a code once; the merchant must enforce its use at purchase. Checkout consumption is not synchronized, so "Ready to use" means issued and unexpired, not confirmation that the merchant has not already accepted it.

## Data and security

- `reward_discount_codes` is server-only with RLS, no anon/authenticated access. Catalog responses contain availability, never code values.
- An authenticated member's ID is resolved by the API, never accepted from the request body. Receipt queries filter by that ID. All responses use private/no-store headers.
- The service-role-only `thrivv_redeem` transaction locks the user balance, checks the existing retry or prior redemption, validates reward activation/review status/expiry/funds, claims one available code with `FOR UPDATE SKIP LOCKED`, records the receipt and debit, and updates the balance atomically.
- Retries (including a new request ID for the same member/offer) return the saved receipt. Exhaustion, expiry or insufficient funds produce no debit. The same request ID cannot be used for a different offer.
- Admin actions require existing platform-admin authorization, same-origin requests, request UUIDs and a reason. Audit records omit code values. Partner-scoped advisory locks serialize duplicate-code checks across offers.
- Functions use SECURITY INVOKER, with EXECUTE revoked from PUBLIC/anon/authenticated. This follows the app's custom-session + server service-role architecture.

## Deployment

Prepared from main `f8d150cc4ff1c629f050360d7510f0534ef916f3`. Apply `20260916161050_reward_discount_codes.sql` before deploying the application code. Migration adds fields and code inventory, grants the server role the ledger INSERT needed by SECURITY INVOKER, replaces redemption logic, and adds catalog/admin functions. It does not change balances, activate partners, change gym operators, or alter daily point earning.

The live database was inspected read-only: 0 reward offers and 0 redemptions at implementation time. No production migration was applied in this task. Run Supabase security advisors after application and smoke-test an inactive synthetic offer in a nonproduction environment before adding partner-approved inventory.

Rollback the application and restore the preceding `thrivv_redeem` function only with new redemptions paused. Preserve code/receipt records and do not recycle issued codes or drop the new tables after real redemptions.

## Verification

- TypeScript check and targeted ESLint.
- 16 Jest cases cover receipt ownership reads, private responses, authorization/origin checks, partner approval, code display, expiry, copying fallback and select → confirm → reveal → reload.
- Isolated PGlite PostgreSQL rehearsal executes the migration and functions with synthetic accounts: tiers, inventory, retries, duplicate submissions, zero debits on failures, role restrictions, and code-free catalog/audits. It models the live service-role ledger permissions. PGlite serializes queries; this is not a multi-connection concurrency load test.

Commands:

```sh
npm ci --ignore-scripts
npx tsc --noEmit
npm test -- --runInBand __tests__/rewards/discount-codes.test.tsx __tests__/rewards/redeem-route.test.ts __tests__/rewards/reveal-flow.test.tsx __tests__/experience/reward-receipts.test.ts
PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node __tests__/rewards/discount-codes-rehearsal.mjs
npm run build
```
