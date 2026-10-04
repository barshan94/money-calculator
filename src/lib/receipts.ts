import { createClient } from "@/lib/supabase/client";

export interface CreateReceiptData {
  /** Optional linked transaction, loan, asset, deposit, or investment ID */
  linkedId?: string;
  /** Type of the linked resource; required when linkedId is provided */
  linkedResourceType?: ReceiptResourceType;
  /** The uploaded file */
  file: File;
  /** Optional alt text for accessibility */
  altText?: string;
}

/** The resource types a receipt can be attached to. */
export type ReceiptResourceType =
  | "transaction"
  | "loan"
  | "asset"
  | "deposit"
  | "investment";

/**
 * Upload a receipt file to Supabase Storage and record it in the receipts table.
 *
 * @param data - The receipt upload data including the file and optional link
 * @returns Object with receipt ID and CDN URL
 * @throws If authentication fails, file validation fails, or upload fails
 */
export async function createReceipt(
  data: CreateReceiptData,
): Promise<{ id: string; url: string; storagePath: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  const file = data.file;

  // --- File validation ---
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error(
      `File too large: ${formatBytes(file.size)} (max ${formatBytes(
        MAX_SIZE,
      )})`,
    );
  }

  const VALID_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.word-processingml.document",
  ];
  if (!VALID_TYPES.includes(file.type) && file.type !== "") {
    throw new Error(
      `Unsupported file type: ${file.type}. Supported: JPG, PNG, WebP, GIF, PDF, DOC, DOCX`,
    );
  }

  // --- Upload to Supabase Storage ---
  // Path format: {userId}/{receiptId}-{timestamp}.{ext}
  const receiptId = crypto.randomUUID();
  const fileExt = file.name.split(".").pop() || "bin";
  const sanitizedFileName = `${receiptId}-${ Date.now() }.${fileExt}`;
  const storagePath = `${user.id}/${sanitizedFileName}`;

  // Upload file data to storage bucket (full path, not just filename)
  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // --- Record in receipts table via RPC ---
  const { data: receipt, error: dbError } = await supabase.rpc(
    "create_receipt",
    {
      p_id: receiptId,
      p_user_id: user.id,
      p_filename: file.name,
      p_storage_path: storagePath,
      p_mime_type: file.type || "application/octet-stream",
      p_file_size_bytes: file.size,
      p_alt_text: data.altText ?? null,
      p_linked_resource_type: data.linkedId ? data.linkedResourceType : null,
      p_linked_resource_id: data.linkedId ?? null,
    }
  );

  if (dbError) {
    // Attempt to clean up the storage object if DB insert fails
    await supabase.storage.from("receipts").remove([storagePath]);
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

  // Construct a public URL for the receipt
  const { data: urlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(storagePath);

  return {
    id: receipt.id,
    url: urlData.publicUrl,
    storagePath: storagePath,
  };
}

/** Helper: format bytes into human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}