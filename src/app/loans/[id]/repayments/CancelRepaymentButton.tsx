"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  transactionId: string;
};

export default function CancelRepaymentButton({
  transactionId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    const confirmed = window.confirm(
      "Cancel this repayment? The repayment will be reversed and the loan balance will be restored."
    );

    if (!confirmed) return;

    setLoading(true);

    const { error } = await supabase.rpc(
      "cancel_loan_repayment",
      {
        p_transaction_id: transactionId,
      }
    );

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
      onClick={handleCancel}
      disabled={loading}
      className="text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? "Cancelling..." : "Cancel"}
    </button>
  );
}