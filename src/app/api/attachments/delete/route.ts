import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { attachment_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { attachment_id } = body;

  if (!attachment_id) {
    return NextResponse.json(
      { error: "attachment_id is required" },
      { status: 400 },
    );
  }

  // RPC verifies ownership and returns storage_path
  const { data, error: rpcError } = await supabase.rpc("delete_attachment", {
    p_attachment_id: attachment_id,
  });

  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message },
      { status: 500 },
    );
  }

  const storagePath = data as string | null;

  if (storagePath) {
    const admin = createAdminClient();
    await admin.storage.from("attachments").remove([storagePath]);
  }

  return NextResponse.json({ success: true });
}
