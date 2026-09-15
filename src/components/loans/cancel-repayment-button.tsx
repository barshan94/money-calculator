"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  paymentId: string;
};

export default function CancelRepaymentButton({
  paymentId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  async function cancelRepayment() {
    const confirmed = window.confirm(
      "Cancel this repayment? The accounting transaction will be reversed.",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    const { error } = await supabase.rpc(
      "cancel_loan_repayment",
      {
        p_payment_id: paymentId,
      },
    );

    if (error) {
      window.alert(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={cancelRepayment}
      disabled={loading}
      className="loan-detail-cancel-repayment-button"
    >
      {loading
        ? "Cancelling..."
        : "Cancel Repayment"}
    </button>
  );
}

