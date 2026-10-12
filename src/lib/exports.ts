import * as XLSX from "xlsx";

export type Transaction = {
  id: string;
  transaction_date: string;
  description: string | null;
  transaction_type: "normal" | "opening_balance";
  status: "posted" | "voided";
  created_at: string;
  reversal_of_id: string | null;
};

export type MoneySummary = {
  amount: number;
  direction: "income" | "expense" | "neutral";
  currency: string;
};

export type TransactionWithSummary = Transaction & {
  summary: MoneySummary;
  isReversed: boolean;
};

export function toCsv(transactions: TransactionWithSummary[]): string {
  const headers = ["Date", "Description", "Category", "Amount", "Direction", "Currency"];

  const rows = transactions.map((t) => {
    const amount = t.summary.amount.toFixed(2);
    const direction = t.summary.direction;
    return [
      t.transaction_date,
      t.description ?? "",
      "",
      amount,
      direction,
      t.summary.currency,
    ];
  });

  const escape = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvRows = [
    headers.join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];

  return csvRows.join("\n") + "\n";
}

export function toXlsx(transactions: TransactionWithSummary[]): Buffer {
  const rows = transactions.map((t) => ({
    Date: t.transaction_date,
    Description: t.description ?? "",
    Category: "",
    Amount: t.summary.amount,
    Direction: t.summary.direction,
    Currency: t.summary.currency,
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["Date", "Description", "Category", "Amount", "Direction", "Currency"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  return XLSX.write(wb, { type: "buffer" });
}