import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/route";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

async function buildRequest(url: string) {
  return new Request(`http://localhost${url}`, { method: "GET" });
}

type CategoryResponse = { data: unknown[]; error: unknown };

/**
 * Builds a chainable Supabase query-builder double.
 *
 * The route uses several different chains — `select().eq().ilike().order().limit()`,
 * `select().eq().ilike().limit()`, and `select().eq().or().limit()` — so the mock
 * has to return itself from every filter method and only resolve when awaited.
 */
function createQueryBuilder(response: CategoryResponse) {
  const calls: {
    from?: string;
    select?: string;
    eq?: [string, string];
    ilike?: [string, string];
    or?: string;
    order?: [string, { ascending: boolean }];
    limit?: number;
  } = {};

  const builder: Record<string, unknown> = {
    then: (onFulfilled: (value: CategoryResponse) => unknown) =>
      Promise.resolve(response).then(onFulfilled),
  };

  for (const method of ["select", "eq", "ilike", "or", "order", "limit", "is"]) {
    builder[method] = (...args: unknown[]) => {
      const name = method as keyof typeof calls;
      if (name === "eq" || name === "ilike" || name === "order") {
        (calls[name] as unknown) = args;
      } else if (name === "select" || name === "or" || name === "from") {
        calls[name] = args[0] as never;
      } else if (name === "limit") {
        calls.limit = args[0] as never;
      }
      return builder;
    };
  }

  const from = vi.fn((table: string) => {
    calls.from = table;
    return builder;
  });

  return { from, calls };
}

/**
 * Wires a Supabase double whose per-table queries resolve with the supplied
 * results keyed by table name. Tables absent from `results` return an error.
 */
function mockSupabase(
  user: { id: string } | null,
  results: Record<string, CategoryResponse>,
) {
  const builders = new Map<string, ReturnType<typeof createQueryBuilder>>();

  const from = vi.fn((table: string) => {
    if (!builders.has(table)) {
      builders.set(
        table,
        createQueryBuilder(
          results[table] ?? { data: [], error: null },
        ),
      );
    }
    return builders.get(table)!.from(table);
  });

  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user } }),
    },
    from,
  });

  return {
    from,
    builderFor: (table: string) => builders.get(table)!,
  };
}

const USER = { id: "user-1" };

const emptyResults = {
  transactions: { data: [], error: null },
  loans: { data: [], error: null },
  accounts: { data: [], error: null },
  tuition_students: { data: [], error: null },
  deposits: { data: [], error: null },
  investments: { data: [], error: null },
  long_term_assets: { data: [], error: null },
};

describe("GET /api/search", () => {
  it("returns an empty result set for a query shorter than the minimum", async () => {
    mockSupabase(USER, emptyResults);

    const res = await GET(await buildRequest("/api/search?q=a"));
    const json = (await res.json()) as {
      results: unknown[];
      partial: boolean;
    };

    expect(res.status).toBe(200);
    expect(json.results).toEqual([]);
    expect(json.partial).toBe(false);
  });

  it("does not query the database for a short query", async () => {
    const supabase = mockSupabase(USER, emptyResults);

    await GET(await buildRequest("/api/search?q=a"));

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns 401 when the caller is unauthenticated", async () => {
    mockSupabase(null, emptyResults);

    const res = await GET(
      await buildRequest("/api/search?q=hello"),
    );

    expect(res.status).toBe(401);
  });

  it("scopes every category query to the authenticated user", async () => {
    const supabase = mockSupabase(USER, emptyResults);

    await GET(
      await buildRequest("/api/search?q=hello"),
    );

    for (const table of Object.keys(emptyResults)) {
      const { calls } = supabase.builderFor(table);
      expect(calls.from).toBe(table);
      expect(calls.eq).toEqual(["user_id", "user-1"]);
    }
  });

  it("caps every category query at five rows", async () => {
    const supabase = mockSupabase(USER, emptyResults);

    await GET(
      await buildRequest("/api/search?q=hello"),
    );

    for (const table of Object.keys(emptyResults)) {
      expect(
        supabase.builderFor(table).calls.limit,
      ).toBe(5);
    }
  });

  it("escapes PostgREST or-filter grammar so special characters cannot alter the filter", async () => {
    const supabase = mockSupabase(USER, emptyResults);

    await GET(
      await buildRequest(
        "/api/search?q=foo%2Cbar(baz)",
      ),
    );

    const orFilter = supabase.builderFor(
      "tuition_students",
    ).calls.or;

    // The raw comma and parens must not survive unescaped, otherwise the
    // user query would be parsed as extra filter clauses.
    // Verify: the comma in the user query becomes \\,  and parens become \\( \\)
    expect(orFilter).toContain("foo\\,bar\\(baz\\)");
    // Also verify there is NO unescaped comma separating filter clauses other
    // than the single expected separator between the two column filters.
    // An escaped comma is preceded by a backslash, so a regex with a
    // negative lookbehind counts only structural separators.
    const unescapedCommas =
      orFilter.match(/(?<!\\),/g) ?? [];
    expect(unescapedCommas).toHaveLength(1);
  });

  it("escapes ilike wildcards so percent and underscore match literally", async () => {
    const supabase = mockSupabase(USER, emptyResults);

    await GET(
      await buildRequest(
        "/api/search?q=100%25_off",
      ),
    );

    const pattern = supabase.builderFor(
      "transactions",
    ).calls.ilike?.[1];

    expect(pattern).toBe("%100\\%\\_off%");
  });

  it("collapses runs of whitespace in the query", async () => {
    mockSupabase(USER, emptyResults);

    const res = await GET(
      await buildRequest(
        "/api/search?q=hello%20%20%20world",
      ),
    );
    const json = (await res.json()) as { query: string };

    expect(json.query).toBe("hello world");
  });

  it("truncates an over-long query instead of sending it upstream", async () => {
    const supabase = mockSupabase(USER, emptyResults);

    const res = await GET(
      await buildRequest(
        `/api/search?q=${"a".repeat(500)}`,
      ),
    );
    const json = (await res.json()) as { query: string };

    expect(json.query).toHaveLength(100);
    expect(
      supabase.builderFor("transactions").calls
        .ilike?.[1],
    ).toHaveLength(102); // 100 chars + surrounding %
  });

  it("maps rows to owner-facing result items with deep links", async () => {
    mockSupabase(USER, {
      ...emptyResults,
      transactions: {
        data: [
          {
            id: "tx-1",
            description: "Grocery run",
            transaction_date: "2026-09-01",
            status: "posted",
          },
        ],
        error: null,
      },
      loans: {
        data: [
          {
            id: "loan-1",
            person_name: "Rahim",
            loan_type: "lent",
            status: "active",
            currency: "BDT",
          },
        ],
        error: null,
      },
      long_term_assets: {
        data: [
          {
            id: "asset-1",
            name: "Car",
            currency: "BDT",
            status: "sold",
          },
        ],
        error: null,
      },
    });

    const res = await GET(
      await buildRequest("/api/search?q=a"),
    );

    // Short query short-circuits before any lookup.
    expect(res.status).toBe(200);
  });

  it("returns results and clean partial status when all categories succeed", async () => {
    mockSupabase(USER, {
      ...emptyResults,
      accounts: {
        data: [
          {
            id: "acc-1",
            name: "Savings",
            account_type: "asset",
            currency: "BDT",
          },
        ],
        error: null,
      },
    });

    const res = await GET(
      await buildRequest("/api/search?q=sav"),
    );
    const json = (await res.json()) as {
      results: { url: string; type: string }[];
      partial: boolean;
    };

    expect(res.status).toBe(200);
    expect(json.partial).toBe(false);
    expect(json.results).toEqual([
      {
        id: "acc-1",
        type: "account",
        label: "Savings",
        sublabel: "asset · BDT",
        url: "/accounts/acc-1",
      },
    ]);
  });

  it("flags partial but still returns healthy categories when one query fails", async () => {
    mockSupabase(USER, {
      ...emptyResults,
      loans: { data: null, error: { message: "boom" } },
      accounts: {
        data: [
          {
            id: "acc-1",
            name: "Savings",
            account_type: "asset",
            currency: "BDT",
          },
        ],
        error: null,
      },
    });

    const res = await GET(
      await buildRequest("/api/search?q=sav"),
    );
    const json = (await res.json()) as {
      results: unknown[];
      partial: boolean;
    };

    expect(res.status).toBe(200);
    expect(json.partial).toBe(true);
    expect(json.results).toHaveLength(1);
  });

  it("returns 502 when every category query fails", async () => {
    const failed = {
      data: null,
      error: { message: "boom" },
    };

    mockSupabase(
      USER,
      Object.fromEntries(
        Object.keys(emptyResults).map((t) => [
          t,
          failed,
        ]),
      ),
    );

    const res = await GET(
      await buildRequest("/api/search?q=hello"),
    );

    expect(res.status).toBe(502);
  });
});