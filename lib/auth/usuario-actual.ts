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

/**
 * Perfil (`tblProfiles`) del usuario autenticado, también cacheado por request.
 * El layout `(app)` y el dashboard lo necesitan; sin esto cada uno hacía su
 * propia consulta a `tblProfiles`. Devuelve `null` si no hay sesión.
 */
export const getPerfilActual = cache(async () => {
  const user = await getUsuarioActual();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tblProfiles")
    .select("nombre_completo, email, avatar_url, nombre_confirmado")
    .eq("id", user.id)
    .single();
  return data;
});
