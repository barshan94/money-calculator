"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  loanId: string;
};

export default function CancelLoanButton({
  loanId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] =
    useState(false);

  async function cancelLoan() {
    const confirmed = window.confirm(
      "Cancel this loan? The accounting transaction will be reversed.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc(
      "cancel_loan",
      {
        p_loan_id: loanId,
      },
    );

    if (error) {
      window.alert(error.message);
      setLoading(false);
      return;
    }

    router.push("/loans");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={cancelLoan}
      disabled={loading}
      className="loan-detail-cancel-button"
    >
      {loading
        ? "Cancelling..."
        : "Cancel Loan"}
    </button>
  );
}