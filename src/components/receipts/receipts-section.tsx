"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { ReceiptUpload } from "@/components/receipts/receipt-upload";
import {
  ReceiptViewer,
  type Receipt,
} from "@/components/receipts/receipt-viewer";

interface ReceiptsSectionProps {
  /** ID of the resource these receipts are linked to */
  resourceId: string;
  /** Type of the linked resource */
  resourceType?:
    | "transaction"
    | "loan"
    | "asset"
    | "deposit"
    | "investment";
  /** Initial receipts (server-fetched, optional) */
  initialReceipts?: Receipt[];
  /** Heading override */
  heading?: string;
}

type ReceiptRow = {
  id: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  alt_text: string | null;
  storage_path: string;
  created_at: string;
};

export function ReceiptsSection({
  resourceId,
  resourceType = "transaction",
  initialReceipts = [],
  heading = "Receipts & Attachments",
}: ReceiptsSectionProps) {
  const [receipts, setReceipts] = useState<Receipt[]>(
    initialReceipts,
  );
  const [loadError, setLoadError] = useState<
    string | null
  >(null);

  const needsFetch = initialReceipts.length === 0;
  const [isLoading, setIsLoading] = useState(
    needsFetch,
  );

  const fetchReceipts = useCallback(async () => {
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      // Receipts table exposes one optional foreign key per
      // resource type; we filter on the one that matches the
      // section's resourceType.
      const builder = supabase
        .from("receipts")
        .select(
          "id, filename, mime_type, file_size_bytes, alt_text, storage_path, created_at",
        )
        .eq("user_id", user.id);

      const { data, error } = await builder.eq(
        `${resourceType}_id`,
        resourceId,
      );

      if (error) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as ReceiptRow[];

      setReceipts(
        rows.map((row) => ({
          id: row.id,
          filename: row.filename,
          mimeType: row.mime_type,
          fileSizeBytes: row.file_size_bytes,
          altText: row.alt_text ?? undefined,
          storagePath: row.storage_path,
          url: `/api/receipts/${encodeURIComponent(
            row.storage_path,
          )}`,
          createdAt: row.created_at,
          linkedResourceType: resourceType,
          linkedResourceId: resourceId,
        })),
      );

      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Failed to load receipts",
      );
    } finally {
      setIsLoading(false);
    }
  }, [resourceId, resourceType]);

  const handleDelete = useCallback(
    (receiptId: string) => {
      setReceipts((prev) =>
        prev.filter((r) => r.id !== receiptId),
      );
    },
    [],
  );

  useEffect(() => {
    if (needsFetch) {
      void fetchReceipts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ marginBottom: 12 }}>{heading}</h2>

      {isLoading && (
        <p
          className="muted"
          style={{
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          Loading receipts…
        </p>
      )}

      {loadError && (
        <div
          style={{
            padding: "10px 12px",
            background: "#fef2f2",
            color: "var(--danger)",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 12,
          }}
          role="alert"
        >
          {loadError}
        </div>
      )}

      <ReceiptUpload
        linkedId={resourceId}
        onUploadSuccess={() => void fetchReceipts()}
      />

      {!isLoading && receipts.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 16,
          }}
        >
          {receipts.map((receipt) => (
            <ReceiptViewer
              key={receipt.id}
              receipt={receipt}
              onDelete={handleDelete}
              compact
            />
          ))}
        </div>
      )}

      {!isLoading &&
        receipts.length === 0 &&
        !loadError && (
          <p
            className="muted"
            style={{
              fontSize: 14,
              marginTop: 12,
            }}
          >
            No receipts attached yet.
          </p>
        )}
    </section>
  );
}