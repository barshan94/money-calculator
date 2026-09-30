# Architecture

## Overview

Money Calculator is a Next.js App Router application backed by Supabase (PostgreSQL). The architecture is deliberately simple: server components fetch data, client components handle interactions, and all financial mutations go through PostgreSQL RPC functions.

```
Browser
  │
  ├── Next.js Server Components (data fetching, rendering)
  │     └── src/lib/finance/        ← server-side data fetchers
  │     └── src/lib/intelligence/   ← forecast and insight calculations
  │
  ├── Next.js Client Components (buttons, forms)
  │     └── "use client" components for interactive mutations
  │
  └── Supabase Client (PostgREST + Auth)
        └── RLS enforces user ownership on all reads
        └── SECURITY DEFINER RPCs handle all writes
```

## Next.js App Router

The app uses the Next.js App Router (`src/app/`). Pages are React Server Components by default — they fetch data on the server and render HTML directly. This means:

- No loading spinners for initial page data
- No client-side data fetching for page content
- Sensitive database calls never reach the browser

Interactive elements (buttons that trigger mutations) are Client Components marked with `"use client"`.

## Supabase client instances

There are three Supabase client types, each with a different purpose:

| Client | File | Key used | When used |
|---|---|---|---|
| Browser client | `src/lib/supabase/client.ts` | Publishable (anon) key | Client components, browser-side auth |
| Server client | `src/lib/supabase/server.ts` | Publishable (anon) key | Server components, API routes |
| Admin client | `src/lib/supabase/admin.ts` | Service role key | Cron route only |

The service role key bypasses RLS entirely. It is only used in `src/app/api/cron/recurring/route.ts` to run the recurring transaction processor, which requires system-level access across all users. It is never exposed to the browser.

## Authentication and middleware

Authentication is handled by `src/proxy.ts` (the Next.js middleware):

1. Every request goes through the middleware
2. The middleware validates the session cookie via `supabase.auth.getUser()`
3. Unauthenticated requests to private pages are redirected to `/auth/login`
4. Authenticated requests to auth pages are redirected to `/`

All pages except `/auth/*` and `/api/*` are private.

## Security model

### Row Level Security (RLS)

Every table in the database has RLS enabled. There are two categories of policies:

**SELECT policies** — all tables have an ownership check:
```sql
-- Example
CREATE POLICY "Users can view their own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);
```

**Write policies** — all tables deny direct writes:
```sql
CREATE POLICY "No direct insert on accounts"
  ON accounts FOR INSERT WITH CHECK (false);
```

This means no client can directly INSERT, UPDATE, or DELETE any row, regardless of what key they use (anon key only). All mutations must go through RPC functions.

### RPC functions (SECURITY DEFINER)

All financial mutations are PostgreSQL functions. Most are `SECURITY DEFINER`, meaning they run as the database owner, not the calling user. This allows them to write to tables (bypassing the deny-all RLS write policies) while still enforcing ownership internally:

```sql
-- Every RPC starts with this pattern
v_user_id := auth.uid();
if v_user_id is null then
  raise exception 'Authentication required';
end if;
-- Then all reads/writes filter by v_user_id
```

A small number of read-only RPCs are `SECURITY INVOKER` — they run as the calling user and naturally respect RLS SELECT policies.

### Cross-user access

The critical security guarantee: **User A cannot read or modify User B's financial data.**

This is enforced by:
1. RLS SELECT policies on every table (reads)
2. Deny-all RLS write policies on every table (direct writes)
3. `auth.uid()` ownership checks inside every write RPC (RPC writes)

## Data flow for a typical mutation

Example: user records a loan repayment.

```
1. User clicks "Record repayment" button (Client Component)
2. Client calls supabase.rpc("record_loan_repayment", { ... })
3. Request goes to Supabase PostgREST with the user's JWT
4. RPC validates auth.uid() matches the loan's user_id
5. RPC creates a transaction and two transaction_entries (double-entry)
6. RPC updates the loan status if fully repaid
7. RPC validates transaction balance before committing
8. Page revalidates and server component re-renders with fresh data
```

## Financial data layer

Server-side data fetching lives in `src/lib/finance/`. Each file exports one async function that calls a Supabase RPC or table query. These are called from Server Components using `Promise.all()` for parallel fetching.

Examples:
- `get-financial-summary.ts` → calls `get_financial_summary` RPC
- `get-loan-balances.ts` → calls `get_loan_balances` RPC
- `get-monthly-net-worth.ts` → calls `get_monthly_net_worth` RPC

## Intelligence layer

`src/lib/intelligence/` contains calculations that run in TypeScript (not SQL):

- `calculate-cash-flow-forecast.ts` — projects future cash flows from historical data
- `calculate-financial-insights.ts` — generates deterministic observations (savings rate, liquidity warnings, etc.)
- `calculate-net-worth-forecast.ts` — projects net worth trends
- `get-what-if-scenario.ts` — models hypothetical financial changes

These are pure functions tested in `tests/unit/`. They receive structured data from the database and return derived values — they do not write to the database.

## Recurring transactions

`src/app/api/cron/recurring/route.ts` is a GET endpoint called by an external cron scheduler. It:

1. Validates a `CRON_SECRET` bearer token
2. Uses the admin client to call `process_all_due_recurring_transactions`
3. The RPC creates transactions for all users whose recurring items are due

This endpoint uses the service role key because it processes transactions for all users system-wide.

## Database

All schema (tables, RPCs, RLS policies) lives in the Supabase database. There are currently no SQL migration files in the repository — the database is managed directly via the Supabase dashboard.

See [FINANCIAL-MODEL.md](FINANCIAL-MODEL.md) for a description of the database tables and their financial roles.
