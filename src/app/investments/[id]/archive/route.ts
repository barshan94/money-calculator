import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.rpc(
    "archive_investment",
    {
      p_investment_id: id,
    },
  );

  if (error) {
    return new NextResponse(
      `Archive failed: ${error.message}`,
      { status: 500 },
    );
  }

  return NextResponse.redirect(
    new URL("/investments", request.url),
  );
}

