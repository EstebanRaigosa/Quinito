import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Raíz del sitio: no mostramos landing. Si hay sesión vamos al dashboard;
 * si no, al login.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
