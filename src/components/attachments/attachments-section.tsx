"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

type Props = {
  entityType: "transaction" | "loan" | "long_term_asset";
  entityId: string;
  initialAttachments: Attachment[];
};

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsSection({
  entityType,
  entityId,
  initialAttachments,
}: Props) {
  const [attachments, setAttachments] =
    useState<Attachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);

    try {
      const res = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.error ?? "Upload failed");
      } else {
        setAttachments((prev) => [json as Attachment, ...prev]);
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(attachmentId: string) {
    setDeletingId(attachmentId);

    try {
      const res = await fetch("/api/attachments/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachment_id: attachmentId }),
      });

      if (res.ok) {
        setAttachments((prev) =>
          prev.filter((a) => a.id !== attachmentId),
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function getSignedUrl(storagePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUrl(storagePath, 3600);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  async function handleDownload(attachment: Attachment) {
    const url = await getSignedUrl(attachment.storage_path);
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.file_name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Attachments</h2>

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "8px 14px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontWeight: 600,
            background: "transparent",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: 14,
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? "Uploading…" : "Attach file"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p
          style={{
            margin: "0 0 12px",
            color: "var(--danger)",
            fontSize: 14,
          }}
        >
          {uploadError}
        </p>
      )}

      {attachments.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No attachments yet.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.file_name}
                </p>

                <p
                  className="muted"
                  style={{ margin: "3px 0 0", fontSize: 13 }}
                >
                  {formatFileSize(attachment.file_size)}
                  {attachment.file_size && attachment.mime_type
                    ? " · "
                    : ""}
                  {attachment.mime_type ?? ""}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleDownload(attachment)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Download
                </button>

                <button
                  type="button"
                  disabled={deletingId === attachment.id}
                  onClick={() => handleDelete(attachment.id)}
                  style={{
                    padding: "6px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "transparent",
                    cursor:
                      deletingId === attachment.id
                        ? "not-allowed"
                        : "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--danger)",
                    opacity: deletingId === attachment.id ? 0.5 : 1,
                  }}
                >
                  {deletingId === attachment.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
