import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, account_type, currency, is_system, is_archived")
    .order("name");

  if (error) {
    throw error;
  }

  console.table(data);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
