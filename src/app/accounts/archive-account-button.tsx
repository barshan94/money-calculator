"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  accountId: string;
};

export function ArchiveAccountButton({ accountId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    if (!window.confirm("Archive this account?")) {
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc("archive_account", {
      p_account_id: accountId,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={loading}
    >
      {loading ? "Archiving..." : "Archive"}
    </button>
  );
}