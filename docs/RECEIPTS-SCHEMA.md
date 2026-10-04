# Receipts/Attachments — Supabase Setup

Run the SQL below in the Supabase SQL editor to enable the receipt
feature. It creates the storage bucket, the receipts table, the
SECURITY DEFINER RPCs that all writes must go through, and the
security policies consistent with the deny-all write model (Phase 23).

---

## 1. Storage bucket

```sql
-- Create the receipts bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;
```

## 2. Receipts table

```sql
CREATE TABLE IF NOT EXISTS receipts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL,
  linked_resource_type text,  -- 'transaction' | 'loan' | 'asset' | 'deposit' | 'investment'
  linked_resource_id   uuid,
  filename          text NOT NULL,
  storage_path      text NOT NULL,
  mime_type         text NOT NULL,
  file_size_bytes   integer NOT NULL,
  alt_text          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS receipts_user_id_idx
  ON receipts (user_id);
CREATE INDEX IF NOT EXISTS receipts_linked_resource_idx
  ON receipts (linked_resource_type, linked_resource_id);
CREATE INDEX IF NOT EXISTS receipts_storage_path_idx
  ON receipts (storage_path);
```

## 3. Security policies (deny-all writes via RPC only)

```sql
-- Enable RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- SELECT: user can only see their own receipts
CREATE POLICY "receipts_select_own" ON receipts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Deny-all direct writes: all mutations go through SECURITY DEFINER RPCs
CREATE POLICY "receipts_deny_all_writes" ON receipts
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
```

## 4. Storage bucket policies

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "receipts_storage_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts' AND
    owner = auth.uid()
  );

-- Allow authenticated users to read their own files
CREATE POLICY "receipts_storage_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    owner = auth.uid()
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "receipts_storage_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts' AND
    owner = auth.uid()
  );
```

## 5. SECURITY DEFINER RPCs (all mutations pass through these)

```sql
-- Create a receipt record (called from createReceipt after storage upload)
CREATE OR REPLACE FUNCTION create_receipt(
  p_id                uuid,
  p_user_id           text,
  p_filename          text,
  p_storage_path      text,
  p_mime_type         text,
  p_file_size_bytes   integer,
  p_alt_text          text DEFAULT NULL,
  p_linked_resource_type text DEFAULT NULL,
  p_linked_resource_id   uuid DEFAULT NULL
) RETURNS receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt receipts;
BEGIN
  IF p_user_id IS NULL OR p_user_id = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO receipts (
    id, user_id, linked_resource_type, linked_resource_id,
    filename, storage_path, mime_type, file_size_bytes, alt_text
  ) VALUES (
    p_id, p_user_id, p_linked_resource_type, p_linked_resource_id,
    p_filename, p_storage_path, p_mime_type, p_file_size_bytes, p_alt_text
  )
  RETURNING * INTO v_receipt;

  RETURN v_receipt;
END;
$$;

-- Delete a receipt record (called from DELETE /api/receipts after storage removal)
-- Ownership is verified by the API route before calling this RPC, so no
  internal auth.uid() check is needed here.
CREATE OR REPLACE FUNCTION delete_receipt(
  p_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM receipts WHERE id = p_id;
  RETURN true;
END;
$$;
```

## 6. Storage bucket configuration (optional)

```sql
-- Set the bucket to public so receipts can be served without auth headers
UPDATE storage.buckets
SET public = true
WHERE id = 'receipts';
```

---

## Notes

- Files are stored at `{userId}/{receiptId}-{timestamp}.{ext}`.
- The `receipts` table uses `linked_resource_type` / `linked_resource_id`
  (single generic pair) instead of per-type foreign keys. `ReceiptsSection`
  sets `linked_resource_type` to `"transaction" | "loan" | "asset" | "deposit" | "investment"`.
- The API route at `src/app/api/receipts/[...path]/route.ts` uses the
  **admin** client to serve files, so RLS on the `receipts` table does
  not block downloads. The GET route additionally enforces session auth
  and an ownership check before serving bytes.
- All mutations go through SECURITY DEFINER RPCs to satisfy the Phase 23
  deny-all write model.
- No SQL migration files are committed to the repo (per project
  convention); apply this schema in the Supabase dashboard.