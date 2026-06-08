import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuario autenticado del request actual. Envuelto en `cache()` de React para
 * que se deduplique dentro del mismo render: aunque varios Server Components y
 * queries lo pidan, `auth.getUser()` (que es un round-trip de red a GoTrue) se
 * ejecuta UNA sola vez por request. Sin esto, el dashboard validaba la sesión
 * 4 veces seguidas contra el servidor de auth.
 */
export const getUsuarioActual = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
