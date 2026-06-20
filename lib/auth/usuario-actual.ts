import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Datos mínimos del usuario que el render necesita (id + email). */
export type UsuarioActual = { id: string; email: string | null };

/**
 * Usuario autenticado del request actual. Envuelto en `cache()` de React para
 * que se deduplique dentro del mismo render.
 *
 * Usa `getClaims()` en lugar de `getUser()`: `getClaims()` lee la sesión de la
 * cookie (sin red) y verifica la FIRMA del JWT localmente cuando el proyecto usa
 * claves asimétricas → elimina el round-trip a GoTrue por render. Si las claves
 * son simétricas o no hay WebCrypto, `getClaims()` cae internamente a
 * `getUser()`, así que NUNCA es menos seguro ni se regresa funcionalidad. El
 * middleware (`middleware.ts`) ya hace la validación fuerte contra el servidor
 * de auth en cada navegación; aquí basta confiar en la firma local.
 */
export const getUsuarioActual = cache(
  async (): Promise<UsuarioActual | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (error || !sub) return null;
    const email = data.claims.email;
    return { id: sub, email: typeof email === "string" ? email : null };
  },
);

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
