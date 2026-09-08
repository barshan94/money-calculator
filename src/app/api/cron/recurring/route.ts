import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", {
      status: 401,
    });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc(
    "process_all_due_recurring_transactions",
  );

  if (error) {
    console.error(
      "Recurring transaction processing failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    processed: data ?? 0,
  });
}