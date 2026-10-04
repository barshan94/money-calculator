"use client";

import { useState, useCallback } from "react";
import { createReceipt } from "@/lib/receipts";

export interface ReceiptUploadProps {
  /** ID of the linked resource (transaction, loan, asset, etc.) */
  linkedId?: string;
  /** Called after a successful upload */
  onUploadSuccess?: (receiptId: string, url: string) => void;
  /** Called if upload fails */
  onError?: (error: Error) => void;
  /** Accepted file types (defaults to images + PDF + docs) */
  accept?: string;
  /** Maximum file size in bytes (defaults to 10MB) */
  maxSize?: number;
}

export function ReceiptUpload({
  linkedId,
  onUploadSuccess,
  onError,
  accept = ".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx",
  maxSize = 10 * 1024 * 1024,
}: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Clear previous state
      setError(null);
      setIsUploading(true);
      setProgress(0);

      // Validate file size
      if (file.size > maxSize) {
        const err = new Error(
          `File too large: ${formatBytes(file.size)} (max ${formatBytes(maxSize)})`,
        );
        setError(err.message);
        onError?.(err);
        setIsUploading(false);
        return;
      }

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.word-processingml.document",
      ];
      if (file.type && !validTypes.includes(file.type)) {
        const err = new Error(
          `Unsupported file type: ${file.type}. Supported: JPG, PNG, WebP, GIF, PDF, DOC, DOCX`,
        );
        setError(err.message);
        onError?.(err);
        setIsUploading(false);
        return;
      }

      try {
        // Simulate progress since we don't have real upload progress from supabase
        const progressInterval = setInterval(() => {
          setProgress((p) => Math.min(p + 10, 90));
        }, 100);

        const result = await createReceipt({
          linkedId,
          file,
          altText: `Receipt for ${linkedId || "resource"}`,
        });

        clearInterval(progressInterval);
        setProgress(100);

        onUploadSuccess?.(result.id, result.url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
      } finally {
        setIsUploading(false);
        // Reset file input
        event.target.value = "";
      }
    },
    [linkedId, maxSize, onUploadSuccess, onError],
  );

  return (
    <div className="receipt-upload" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label
        className={`file-input-label ${isUploading ? "uploading" : ""}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          border: "2px dashed #d1d5db",
          borderRadius: "0.5rem",
          cursor: isUploading ? "not-allowed" : "pointer",
          transition: "border-color 0.2s, background-color 0.2s",
          backgroundColor: isUploading ? "#f9fafb" : "transparent",
          borderColor: isUploading ? "#9ca3af" : "#d1d5db",
        }}
        onMouseEnter={(e) => {
          if (!isUploading)
            e.currentTarget.style.borderColor = "#2563eb";
        }}
        onMouseLeave={(e) => {
          if (!isUploading)
            e.currentTarget.style.borderColor = "#d1d5db";
        }}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
          style={{ display: "none" }}
        />
        <span style={{ fontSize: "1.25rem" }}>
          {isUploading ? "⏳" : "📎"}
        </span>
        <span style={{ fontWeight: 500 }}>
          {isUploading ? `Uploading... ${progress}%` : "Upload Receipt"}
        </span>
        <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {isUploading ? "" : `(JPG, PNG, PDF, DOC — max ${formatBytes(maxSize)})`}
        </span>
      </label>

      {error && (
        <p
          style={{
            color: "#dc2626",
            fontSize: "0.875rem",
            margin: 0,
            padding: "0.5rem",
            backgroundColor: "#fef2f2",
            borderRadius: "0.375rem",
          }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}