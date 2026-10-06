import { describe, expect, it } from "vitest";

// --- Pure helpers (mirrored from the component) ---

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

const MAX_SIZE = 10 * 1024 * 1024;

/**
 * Validates a file without side effects.
 * Returns the error message string, or null if the file is acceptable.
 */
function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE) {
    return `File too large: ${formatBytes(file.size)} (max ${formatBytes(MAX_SIZE)})`;
  }
  if (file.type && !VALID_TYPES.includes(file.type)) {
    return `Unsupported file type: ${file.type}. Supported: JPG, PNG, WebP, GIF, PDF, DOC, DOCX`;
  }
  return null;
}

// --- Unit tests ---

describe("formatBytes", () => {
  it("formats bytes", () => expect(formatBytes(512)).toBe("512 B"));
  it("formats kilobytes", () => expect(formatBytes(2048)).toBe("2.0 KB"));
  it("formats megabytes", () => expect(formatBytes(10 * 1024 * 1024)).toBe("10.00 MB"));
});

describe("validateFile", () => {
  it("accepts a small JPEG", () => {
    const file = new File([""], "receipt.jpg", { type: "image/jpeg" });
    expect(validateFile(file)).toBeNull();
  });

  it("accepts a PNG", () => {
    const file = new File([""], "receipt.png", { type: "image/png" });
    expect(validateFile(file)).toBeNull();
  });

  it("accepts a PDF", () => {
    const file = new File([""], "receipt.pdf", { type: "application/pdf" });
    expect(validateFile(file)).toBeNull();
  });

  it("accepts a DOCX", () => {
    const file = new File([""], "receipt.docx", {
      type: "application/vnd.openxmlformats-officedocument.word-processingml.document",
    });
    expect(validateFile(file)).toBeNull();
  });

  it("rejects an oversized file", () => {
    const file = new File(["x".repeat(MAX_SIZE + 1)], "big.jpg", { type: "image/jpeg" });
    const err = validateFile(file);
    expect(err).toMatch(/File too large/);
    expect(err).toContain("10.00 MB");
  });

  it("rejects an unsupported type", () => {
    const file = new File([""], "receipt.exe", { type: "application/x-msdownload" });
    const err = validateFile(file);
    expect(err).toMatch(/Unsupported file type/);
    expect(err).toContain("application/x-msdownload");
  });

  it("accepts a zero-byte file", () => {
    const file = new File([""], "empty.png", { type: "image/png" });
    expect(validateFile(file)).toBeNull();
  });
});