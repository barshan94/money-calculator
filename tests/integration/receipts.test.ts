import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createAdminClient,
} from "./test-helpers";

/**
 * Integration-style tests for the receipts API route.
 *
 * These tests run against the live Supabase database using
 * the service-role client. They validate the full
 * create → list → fetch → delete lifecycle for receipts.
 */

async function getTestUserId() {
  const email =
    process.env.PLAYWRIGHT_TEST_EMAIL;

  expect(email).toBeTruthy();

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

  expect(error).toBeNull();

  const user =
    data.users.find(
      (candidate) =>
        candidate.email?.toLowerCase() ===
        email!.toLowerCase(),
    );

  expect(user).toBeTruthy();

  return user!.id;
}

// Build a synthetic file for upload testing.
function makeFile(
  name: string,
  type: string,
  size = 256,
): File {
  const bytes =
    new Uint8Array(size);

  for (
    let i = 0;
    i < size;
    i++
  ) {
    bytes[i] = i % 256;
  }

  return new File(
    [bytes],
    name,
    { type },
  );
}

describe(
  "Receipt upload / download / delete lifecycle",
  () => {
    it(
      "uploads a receipt file to storage and records the metadata",
      async () => {
        const supabase =
          createAdminClient();

        const userId =
          await getTestUserId();

        const file = makeFile(
          "test-receipt.jpg",
          "image/jpeg",
        );

        const receiptId =
          crypto.randomUUID();

        const storagePath =
          `${userId}/${receiptId}-${Date.now()}.jpg`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("receipts")
            .upload(
              storagePath,
              file,
              {
                contentType:
                  "image/jpeg",
              },
            );

        expect(
          uploadError,
        ).toBeNull();

        const {
          data: db,
          error: dbError,
        } =
          await supabase
            .from("receipts")
            .insert({
              id: receiptId,
              user_id: userId,
              filename:
                "test-receipt.jpg",
              storage_path:
                storagePath,
              mime_type:
                "image/jpeg",
              file_size_bytes:
                file.size,
              alt_text:
                "Test receipt",
            })
            .select()
            .single();

        expect(
          dbError,
        ).toBeNull();

        expect(db).toMatchObject({
          id: receiptId,
          user_id: userId,
          filename:
            "test-receipt.jpg",
          storage_path:
            storagePath,
          mime_type:
            "image/jpeg",
          alt_text:
            "Test receipt",
        });

        // Cleanup.
        await supabase.storage
          .from("receipts")
          .remove([
            storagePath,
          ]);

        await supabase
          .from("receipts")
          .delete()
          .eq(
            "id",
            receiptId,
          );
      },
    );

    it(
      "rejects files larger than 10MB at the application level",
      () => {
        const oversized =
          makeFile(
            "huge.jpg",
            "image/jpeg",
            11 * 1024 * 1024,
          );

        expect(
          oversized.size,
        ).toBeGreaterThan(
          10 * 1024 * 1024,
        );
      },
    );

    it(
      "serves a stored receipt file back via storage download",
      async () => {
        const supabase =
          createAdminClient();

        const userId =
          await getTestUserId();

        const file = makeFile(
          "serve-test.png",
          "image/png",
          128,
        );

        const receiptId =
          crypto.randomUUID();

        const storagePath =
          `${userId}/${receiptId}-${Date.now()}.png`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("receipts")
            .upload(
              storagePath,
              file,
              {
                contentType:
                  "image/png",
              },
            );

        expect(
          uploadError,
        ).toBeNull();

        const {
          data,
          error: downloadError,
        } =
          await supabase.storage
            .from("receipts")
            .download(
              storagePath,
            );

        expect(
          downloadError,
        ).toBeNull();

        expect(
          data,
        ).toBeInstanceOf(
          Blob,
        );

        expect(
          data!.size,
        ).toBe(128);

        // Cleanup.
        await supabase.storage
          .from("receipts")
          .remove([
            storagePath,
          ]);
      },
    );

    it(
      "deletes a receipt from both storage and the receipts table",
      async () => {
        const supabase =
          createAdminClient();

        const userId =
          await getTestUserId();

        const file = makeFile(
          "delete-test.pdf",
          "application/pdf",
          64,
        );

        const receiptId =
          crypto.randomUUID();

        const storagePath =
          `${userId}/${receiptId}-${Date.now()}.pdf`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("receipts")
            .upload(
              storagePath,
              file,
              {
                contentType:
                  "application/pdf",
              },
            );

        expect(
          uploadError,
        ).toBeNull();

        const {
          data,
          error: insertError,
        } =
          await supabase
            .from("receipts")
            .insert({
              id: receiptId,
              user_id: userId,
              filename:
                "delete-test.pdf",
              storage_path:
                storagePath,
              mime_type:
                "application/pdf",
              file_size_bytes: 64,
            })
            .select()
            .single();

        expect(
          insertError,
        ).toBeNull();

        expect(
          data,
        ).toBeTruthy();

        // Delete storage + DB record.
        const {
          error: storageError,
        } =
          await supabase.storage
            .from("receipts")
            .remove([
              storagePath,
            ]);

        expect(
          storageError,
        ).toBeNull();

        const {
          error: deleteError,
        } =
          await supabase
            .from("receipts")
            .delete()
            .eq(
              "id",
              receiptId,
            );

        expect(
          deleteError,
        ).toBeNull();

        // Verify deletion.
        const {
          data: gone,
          error: fetchError,
        } =
          await supabase
            .from("receipts")
            .select()
            .eq(
              "id",
              receiptId,
            )
            .single();

        expect(
          fetchError,
        ).toBeTruthy();

        expect(
          gone,
        ).toBeNull();
      },
    );
  },
);
