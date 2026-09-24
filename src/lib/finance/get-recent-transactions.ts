import { createClient } from "@/lib/supabase/server";

export type RecentTransactionDirection =
  | "income"
  | "expense"
  | "transfer"
  | "neutral";

export type RecentTransaction = {
  id: string;
  transaction_date: string;
  created_at: string;
  description: string | null;
  transaction_type: "normal" | "opening_balance";
  status: "posted" | "voided";
  label: string;
  amount: number;
  direction: RecentTransactionDirection;
  currency: string;
  isReversed: boolean;
};

type TransactionRow = {
  id: string;
  transaction_date: string;
  description: string | null;
  transaction_type: "normal" | "opening_balance";
  status: "posted" | "voided";
  created_at: string;
  reversal_of_id: string | null;
};

type EntryRow = {
  transaction_id: string;
  amount: number | string;
  entry_type: "debit" | "credit";
  account_id: string;
  category_id: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

type AccountRow = {
  id: string;
  name: string;
  account_type:
    | "asset"
    | "liability"
    | "income"
    | "expense";
  currency: string;
};

export async function getRecentTransactions(
  limit = 8,
): Promise<RecentTransaction[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const safeLimit = Math.min(
    50,
    Math.max(1, Math.floor(limit)),
  );

  const [
    transactionsResult,
    entriesResult,
    categoriesResult,
    accountsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, transaction_date, description, transaction_type, status, created_at, reversal_of_id",
      )
      .eq("user_id", user.id)
      .in("status", ["posted", "voided"])
      .order("transaction_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("transaction_entries")
      .select(
        "transaction_id, amount, entry_type, account_id, category_id",
      ),

    supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id),

    supabase
      .from("accounts")
      .select(
        "id, name, account_type, currency",
      )
      .eq("user_id", user.id),
  ]);

  if (transactionsResult.error) {
    throw new Error(transactionsResult.error.message);
  }

  if (entriesResult.error) {
    throw new Error(entriesResult.error.message);
  }

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  if (accountsResult.error) {
    throw new Error(accountsResult.error.message);
  }

  const allTransactions =
    (transactionsResult.data ?? []) as TransactionRow[];

  const entries =
    (entriesResult.data ?? []) as EntryRow[];

  const categories =
    (categoriesResult.data ?? []) as CategoryRow[];

  const accounts =
    (accountsResult.data ?? []) as AccountRow[];

  const originalTransactions = allTransactions.filter(
    (transaction) =>
      transaction.reversal_of_id === null,
  );

  const reversedTransactionIds = new Set(
    allTransactions
      .filter(
        (transaction) =>
          transaction.reversal_of_id !== null,
      )
      .map(
        (transaction) =>
          transaction.reversal_of_id as string,
      ),
  );

  function getCategoryName(
    categoryId: string | null,
  ): string | null {
    if (!categoryId) {
      return null;
    }

    return (
      categories.find(
        (category) => category.id === categoryId,
      )?.name ?? null
    );
  }

  function getAccountName(
    accountId: string,
  ): string {
    return (
      accounts.find(
        (account) => account.id === accountId,
      )?.name ?? "Unknown account"
    );
  }

  function getSummary(transactionId: string): {
    label: string;
    amount: number;
    direction: RecentTransactionDirection;
    currency: string;
  } {
    const transactionEntries = entries.filter(
      (entry) =>
        entry.transaction_id === transactionId,
    );

    const categoryEntry = transactionEntries.find(
      (entry) => entry.category_id !== null,
    );

    const categoryName = getCategoryName(
      categoryEntry?.category_id ?? null,
    );

    const debitEntry = transactionEntries.find(
      (entry) => entry.entry_type === "debit",
    );

    const creditEntry = transactionEntries.find(
      (entry) => entry.entry_type === "credit",
    );

    if (!debitEntry || !creditEntry) {
      return {
        label: "Transaction",
        amount: 0,
        direction: "neutral",
        currency: "BDT",
      };
    }

    const debitAccount = accounts.find(
      (account) =>
        account.id === debitEntry.account_id,
    );

    const creditAccount = accounts.find(
      (account) =>
        account.id === creditEntry.account_id,
    );

    if (
      categoryName &&
      debitAccount?.account_type === "expense"
    ) {
      return {
        label: categoryName,
        amount: Number(debitEntry.amount),
        direction: "expense",
        currency: debitAccount.currency,
      };
    }

    if (
      categoryName &&
      creditAccount?.account_type === "income"
    ) {
      return {
        label: categoryName,
        amount: Number(creditEntry.amount),
        direction: "income",
        currency: creditAccount.currency,
      };
    }

    return {
      label: `${getAccountName(
        creditEntry.account_id,
      )} → ${getAccountName(
        debitEntry.account_id,
      )}`,
      amount: Number(debitEntry.amount),
      direction: "transfer",
      currency:
        debitAccount?.currency ??
        creditAccount?.currency ??
        "BDT",
    };
  }

  return originalTransactions
    .map((transaction) => {
      const summary = getSummary(transaction.id);

      return {
        id: transaction.id,
        transaction_date:
          transaction.transaction_date,
        created_at: transaction.created_at,
        description: transaction.description,
        transaction_type:
          transaction.transaction_type,
        status: transaction.status,
        label: summary.label,
        amount: summary.amount,
        direction: summary.direction,
        currency: summary.currency,
        isReversed:
          reversedTransactionIds.has(
            transaction.id,
          ),
      };
    })
    .slice(0, safeLimit);
}

