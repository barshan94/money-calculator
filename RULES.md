# Money Calculator — Development Rules

## 1. General Rules

1. Preserve existing working functionality.
2. Inspect existing code before modifying it.
3. Do not invent project structure, database functions, tables, or APIs.
4. Do not rewrite unrelated modules.
5. Prefer the smallest safe change that solves the problem.
6. Do not introduce unnecessary dependencies.
7. Follow existing project conventions.
8. Do not remove tests simply to make CI pass.

---

## 2. Financial Integrity

1. Financial balances must remain mathematically consistent.
2. Financial history must remain auditable.
3. Never silently destroy financial history.
4. Prefer reversal/void mechanisms over destructive deletion.
5. Financial mutations must be validated on the backend.
6. Do not trust financial values supplied by the client.
7. Related modules must remain synchronized.
8. Never create a financial record that bypasses the ledger rules.

---

## 3. Security

1. Every user-owned record must be scoped to the authenticated user.
2. Never trust a client-supplied `user_id`.
3. Backend functions must use authenticated identity.
4. `SECURITY DEFINER` functions must validate ownership.
5. System accounts must be protected.
6. Users must never access another user's financial data.
7. RLS must not be bypassed accidentally.
8. Client-side restrictions are not security controls.

---

## 4. Database Rules

1. Financial business rules should be enforced at the database/backend layer.
2. RPCs must validate their inputs.
3. RPCs must validate ownership.
4. Database relationships must remain consistent.
5. Deletion protections must preserve financial integrity.
6. Schema changes must consider existing data.
7. Never assume an RPC exists without checking the database/project.

---

## 5. Transaction Rules

1. Transactions must remain balanced.
2. Source and destination accounts must be validated.
3. Category/account relationships must be validated.
4. Reversals must preserve the original transaction.
5. Editing a financial record must not corrupt historical state.
6. Void/reversal operations must remain auditable.

---

## 6. Testing Rules

1. New financial logic requires integration coverage.
2. Important user workflows require E2E coverage.
3. Edge cases must be tested.
4. Security-sensitive behavior must be tested.
5. A passing test suite must not be achieved by weakening assertions.
6. When a test fails, identify whether the problem is:
   - test data
   - test logic
   - UI behavior
   - backend logic
   - database state
   - environment
7. Fix the actual cause.

---

## 7. Mobile Development Rules

1. Development may be performed through Termux/Acode.
2. Next.js development/build on Android ARM64 uses webpack.
3. Do not depend on local ARM64 Playwright/Chromium.
4. Playwright verification should run through GitHub Actions.
5. Avoid unnecessarily large instructions during mobile debugging.
6. When troubleshooting, prefer one actionable step at a time.

---

## 8. AI Coding Rules

Before changing the project, AI should understand:

- PRD.md
- RULES.md
- ARCHITECTURE.md
- DATABASE.md
- TESTING.md
- ROADMAP.md
- MEMORY.md

AI must:

- Preserve architecture unless change is justified.
- Explain destructive changes before performing them.
- Never invent database behavior.
- Never fabricate test results.
- Never claim a feature is complete without verification.
- Prefer complete replacement files when explicitly requested.
- Keep coding responses concise when the user is actively implementing.

---

## 9. Definition of Done

A financial feature is not considered complete merely because its UI works.

A major feature should have:

- Backend implementation
- Validation
- Security/ownership protection
- Integration tests
- Appropriate E2E coverage
- Production build success
- Cross-module consistency
- Reasonable mobile UX

---

## 10. Documentation Rules

Important architectural decisions should be recorded in:

- MEMORY.md
- CHANGELOG.md
- relevant technical documentation

Documentation must reflect the actual project rather than an imagined future architecture.

