# Money Calculator — Project Memory

## Technology Decisions

- Next.js is the primary web framework.
- Supabase PostgreSQL is the database.
- Supabase Auth handles authentication.
- PostgreSQL RPCs enforce important financial business rules.
- TypeScript is used throughout the application.
- Vitest is used for unit/integration testing.
- Playwright is used for E2E testing.
- GitHub Actions is the primary E2E environment.

---

## Mobile Development

The project is developed through Termux/Acode when working from mobile.

Next.js 16 on the current Android ARM64 environment requires webpack.

Use:

```bash
npm run dev -- --webpack

