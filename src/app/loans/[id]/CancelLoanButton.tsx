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

  const [saving, setSaving] = useState(false);

  async function handleCancel() {
    const confirmed = window.confirm(
      "Cancel this loan?\n\nThe financial transaction will be reversed and the loan will remain in your history as cancelled.",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase.rpc(
      "cancel_loan",
      {
        p_loan_id: loanId,
      },
    );

    if (error) {
      window.alert(error.message);
      setSaving(false);
      return;
    }

    router.push(`/loans/${loanId}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={saving}
      className="loan-cancel-button"
    >
      {saving
        ? "Cancelling..."
        : "Cancel Loan"}
      <style jsx>{`
        .loan-cancel-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 15px;
          border: 1px solid #fecaca;
          border-radius: 8px;
          background: #fef2f2;
          color: var(--danger);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .loan-cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </button>
  );
}