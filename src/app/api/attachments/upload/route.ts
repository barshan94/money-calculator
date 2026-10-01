import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const VALID_ENTITY_TYPES = [
  "transaction",
  "loan",
  "long_term_asset",
] as const;

type EntityType = (typeof VALID_ENTITY_TYPES)[number];

export async function POST(request: NextRequest) {
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file") as File | null;
  const entityType = formData.get("entity_type") as string | null;
  const entityId = formData.get("entity_id") as string | null;

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 },
    );
  }

  if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
    return NextResponse.json(
      { error: "Invalid entity_type" },
      { status: 400 },
    );
  }

  if (!entityId) {
    return NextResponse.json(
      { error: "entity_id is required" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 10 MB limit" },
      { status: 400 },
    );
  }

  // Build storage path: {user_id}/{entity_type}/{entity_id}/{timestamp}-{filename}
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const storagePath = `${user.id}/${entityType}/${entityId}/${Date.now()}-${safeFileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = new Uint8Array(arrayBuffer);

  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("attachments")
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 },
    );
  }

  const { data: attachment, error: rpcError } = await supabase.rpc(
    "add_attachment",
    {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_storage_path: storagePath,
      p_file_name: file.name,
      p_file_size: file.size,
      p_mime_type: file.type || null,
    },
  );

  if (rpcError) {
    // Best-effort cleanup of the uploaded file
    await admin.storage.from("attachments").remove([storagePath]);
    return NextResponse.json(
      { error: rpcError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(attachment);
}
