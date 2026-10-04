import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Receipt API routes
 *
 * GET    /api/receipts/[...path]     - Download/view a receipt file
 * DELETE /api/receipts/[...path]     - Delete a receipt (requires userId query param)
 *
 * The storage path is reconstructed from the path segments.
 * Files are stored at: {userId}/{receiptId}-{timestamp}.{ext}
 */

// GET - Serve receipt file from Supabase Storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const storagePath = path.join("/");

    if (!storagePath) {
      return NextResponse.json(
        { error: "Storage path required" },
        { status: 400 },
      );
    }

    // Get user from auth header / cookie (uses server-side SSR client)
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify ownership before serving the file
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("id, user_id")
      .eq("storage_path", storagePath)
      .eq("user_id", user.id)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: "Receipt not found or access denied" },
        { status: 404 },
      );
    }

    // Download the file from storage using admin client
    const adminSupabase = createAdminClient();
    const { data: fileData, error } = await adminSupabase.storage
      .from("receipts")
      .download(storagePath);

    if (error) {
      console.error("Storage download error:", error);
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 },
      );
    }

    // Get metadata to determine content type
    const { data: metadata } = await adminSupabase.storage
      .from("receipts")
      .list("", {
        search: storagePath,
      });

    const contentType = metadata?.find((m) => m.name === path[path.length - 1])?.metadata
      ?.mimetype || "application/octet-stream";

    // Extract original filename from the stored name
    // Format: {receiptId}-{timestamp}.{ext}
    const storedName = path[path.length - 1];
    const originalFilename = storedName.includes("-")
      ? storedName.substring(storedName.indexOf("-") + 1)
      : storedName;

    return new NextResponse(fileData, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          originalFilename,
        )}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Receipt GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Remove receipt from storage and database
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const storagePath = path.join("/");

    if (!storagePath) {
      return NextResponse.json(
        { error: "Storage path required" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // First verify ownership by checking the receipts table
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("id, user_id")
      .eq("storage_path", storagePath)
      .eq("user_id", userId)
      .single();

    if (receiptError || !receipt) {
      return NextResponse.json(
        { error: "Receipt not found or access denied" },
        { status: 404 },
      );
    }

    // Delete receipt record from database via RPC
    const { error: rpcError } = await supabase.rpc(
      "delete_receipt",
      { p_id: receipt.id }
    );

    if (rpcError) {
      console.error("DB delete error:", rpcError);
      return NextResponse.json(
        { error: "Failed to delete receipt record" },
        { status: 500 },
      );
    }

    // Delete from Supabase Storage (after DB succeeds)
    const { error: storageError } = await supabase.storage
      .from("receipts")
      .remove([storagePath]);

    if (storageError) {
      console.error("Storage delete error:", storageError);
      return NextResponse.json(
        { error: "Failed to delete file from storage" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Receipt DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}