"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type RazonCierre = Database["public"]["Enums"]["razon_cierre_sesion"];

/**
 * Registra el último cierre de sesión del usuario en su propio perfil
 * (`tblProfiles.ultimo_cierre_en` + `razon_ultimo_cierre`), para el panel de
 * actividad del admin.
 *
 * Importante: debe llamarse **antes** de `supabase.auth.signOut()`, mientras la
 * sesión aún existe — la RLS de `tblProfiles` exige `id = auth.uid()`, así que
 * tras cerrar sesión el cliente ya no podría escribir.
 *
 * Es best-effort: si falla (red/RLS), NO debe impedir el cierre de sesión. Por
 * eso atrapa cualquier error y solo loguea en desarrollo (CLAUDE.md §4.6).
 */
export async function registrarCierreSesion(razon: RazonCierre): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("tblProfiles")
      .update({
        ultimo_cierre_en: new Date().toISOString(),
        razon_ultimo_cierre: razon,
      })
      .eq("id", user.id);

    if (error && process.env.NODE_ENV !== "production") {
      console.error("[registrarCierreSesion] update falló:", error.message);
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[registrarCierreSesion] error inesperado:", e);
    }
  }
}
