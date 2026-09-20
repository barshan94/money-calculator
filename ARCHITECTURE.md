# Money Calculator — Architecture

## 1. Technology Stack

### Frontend

- Next.js 16
- React
- TypeScript
- Next.js App Router

### Backend

- Supabase
- PostgreSQL
- Supabase Auth
- PostgreSQL RPC functions

### Testing

- Vitest
- Supabase/PostgreSQL integration testing
- Playwright
- GitHub Actions

---

## 2. High-Level Architecture

```text
User
 ↓
Next.js UI
 ↓
Server Components / Client Components
 ↓
Application / Finance Logic
 ↓
Supabase
 ↓
PostgreSQL RPCs
 ↓
Financial Ledger / Database

