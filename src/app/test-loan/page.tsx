"use client";

import { createClient } from "@/lib/supabase/client";

export default function TestLoanPage() {
  async function testLoan() {
    const supabase = createClient();

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    console.log("USER:", userData.user);
    console.log("USER ERROR:", userError);

    if (userError || !userData.user) {
      console.error("Not authenticated");
      return;
    }

    const { data, error } = await supabase.rpc(
      "create_loan_with_transaction",
      {
        p_person_name: "Test Person",
        p_loan_type: "borrowed",
        p_principal_amount: 1000,
        p_currency: "BDT",
        p_start_date: new Date().toISOString().split("T")[0],
        p_source_account_id: "5160d17f-6d21-470b-877b-cc500d48740a",
        p_due_date: null,
        p_description: "Loan function test",
        p_whatsapp_number: "01700000000",
      }
    );

    console.log("RPC DATA:", data);
    console.log("RPC ERROR:", JSON.stringify(error, null, 2));
  }

  return (
    <main>
      <h1>Loan Function Test</h1>

      <button onClick={testLoan}>
        Test Loan
      </button>
    </main>
  );
}

