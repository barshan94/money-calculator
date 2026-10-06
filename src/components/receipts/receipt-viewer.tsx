"use client";

import { useState } from "react";

export interface Receipt {
  id: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  altText?: string;
  storagePath: string;
  url: string;
  createdAt: string;
  linkedResourceId?: string;
  linkedResourceType?: "transaction" | "loan" | "asset" | "deposit" | "investment";
}

interface ReceiptViewerProps {
  receipt: Receipt;
  /** Optional callback when receipt is deleted */
  onDelete?: (receiptId: string) => void;
  /** Show compact variant (for lists) */
  compact?: boolean;
}

export function ReceiptViewer({ receipt, onDelete, compact = false }: ReceiptViewerProps) {
  const [isImage, setIsImage] = useState(receipt.mimeType.startsWith("image/"));
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/receipts/${encodeURIComponent(receipt.storagePath)}`);
      if (!response.ok) {
        throw new Error("Failed to download receipt");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = receipt.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Download failed",
      );
      setTimeout(() => setDownloadError(null), 3000);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete receipt "${receipt.filename}"?`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/receipts/${encodeURIComponent(receipt.storagePath)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error("Failed to delete receipt");
      }
      onDelete?.(receipt.id);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Delete failed. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (): string => {
    if (receipt.mimeType.startsWith("image/")) return "🖼️";
    if (receipt.mimeType === "application/pdf") return "📄";
    if (
      receipt.mimeType.includes("word") ||
      receipt.mimeType.includes("document")
    )
      return "📝";
    return "📎";
  };

  if (compact) {
    return (
      <div
        className="receipt-viewer-compact"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem",
          border: "1px solid #e5e7eb",
          borderRadius: "0.5rem",
          backgroundColor: "#fafafa",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>{getFileIcon()}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {receipt.filename}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            {formatBytes(receipt.fileSizeBytes)} • {formatDate(receipt.createdAt)}
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDeleting}
          title="Download"
          style={{
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.375rem",
            backgroundColor: "white",
            cursor: "pointer",
          }}
        >
          Download
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          title="Delete"
          style={{
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            border: "1px solid #fca5a5",
            borderRadius: "0.375rem",
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            cursor: "pointer",
          }}
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <div
      className="receipt-viewer"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {receipt.filename}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginTop: "0.25rem",
            }}
          >
            {formatBytes(receipt.fileSizeBytes)} • {receipt.mimeType} •{" "}
            {formatDate(receipt.createdAt)}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleDownload}
            disabled={isDeleting}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              backgroundColor: "white",
              color: "#374151",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f9fafb")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "white")
            }
          >
            Download
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "1px solid #fca5a5",
              borderRadius: "0.375rem",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#fee2e2")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#fef2f2")
            }
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      <div
        className="receipt-content"
        style={{
          padding: "1rem",
          minHeight: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
        }}
      >
        {isImage ? (
          <img
            src={receipt.url}
            alt={receipt.altText || receipt.filename}
            style={{
              maxWidth: "100%",
              maxHeight: "500px",
              borderRadius: "0.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
            onError={() => setIsImage(false)}
            loading="lazy"
          />
        ) : receipt.mimeType === "application/pdf" ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#6b7280",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📄</div>
            <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
              PDF Document
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              Click Download to view
            </div>
          </div>
        ) : receipt.mimeType.includes("word") ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#6b7280",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📝</div>
            <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
              Word Document
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              Click Download to view
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#6b7280",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
              {getFileIcon()}
            </div>
            <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
              {receipt.filename}
            </div>
            <div style={{ fontSize: "0.875rem" }}>
              Click Download to view
            </div>
          </div>
        )}

        {downloadError && (
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "0.5rem 1rem",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
            role="alert"
          >
            {downloadError}
          </div>
        )}
      </div>
    </div>
  );
}