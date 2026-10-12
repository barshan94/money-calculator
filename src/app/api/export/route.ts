import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toXlsx, toCsv, TransactionWithSummary } from "@/lib/exports";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
      statusText: "Unauthorized",
    });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "excel").toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const size = Math.min(
    Math.max(1, parseInt(url.searchParams.get("size") ?? "50", 10)),
    200
  );
  const offset = (page - 1) * size;

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, transaction_date, description, transaction_type, status, created_at, reversal_of_id",
    )
    .eq("user_id", user.id)
    .in("status", ["posted", "voided"])
    .order("created_at", { ascending: false })
    .range(offset, offset + size - 1);

  if (error) {
    return new Response(error.message, {
      status: 500,
      statusText: error.message,
    });
  }

  const transactions: TransactionWithSummary[] = (data ?? []).map((t) => ({
    id: t.id,
    transaction_date: t.transaction_date,
    description: t.description,
    transaction_type: t.transaction_type,
    status: t.status,
    created_at: t.created_at,
    reversal_of_id: t.reversal_of_id,
    summary: {
      amount: 0,
      direction: "neutral",
      currency: "BDT",
    },
    isReversed: false,
  }));

  if (format === "csv") {
    const csv = toCsv(transactions);
    const filename = `money_calculator_${Date.now()}_page-${page}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === "excel") {
    const buffer = toXlsx(transactions);
    const filename = `money_calculator_${Date.now()}_page-${page}.xlsx`;
    return new Response(new Uint8Array(buffer), {
      
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response(`Unsupported format "${format}"`, {
    status: 400,
    statusText: "Bad Request",
  });
}
