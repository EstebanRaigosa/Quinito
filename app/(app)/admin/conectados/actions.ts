"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esSuperAdmin } from "@/lib/auth/superadmin";

export type Conectado = {
  usuarioId: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  seccion: string;
  dispositivo: "movil" | "escritorio";
  visible: boolean;
  ultimaActividad: string;
  conectadoEn: string;
};

/** Ventana para considerar a alguien "conectado recientemente" (15 min). */
const VENTANA_MS = 15 * 60 * 1000;

/**
 * Lista de usuarios con latido reciente, para el panel de admin. Se valida
 * `esSuperAdmin` y se lee con el cliente `service_role` (server-side): así la
 * RLS estricta de `tblSesionesActivas` (cada quien solo ve lo suyo) se mantiene
 * intacta y aun así el admin puede ver a todos. Devuelve `[]` si no es admin.
 */
export async function obtenerConectados(): Promise<Conectado[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) return [];

  const desde = new Date(Date.now() - VENTANA_MS).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tblSesionesActivas")
    .select(
      "usuario_id, seccion, dispositivo, visible, ultima_actividad, conectado_en, tblProfiles(nombre_completo, avatar_url, email)",
    )
    .gte("ultima_actividad", desde)
    .order("ultima_actividad", { ascending: false });
  if (error || !data) return [];

  return data.map((s) => {
    const perfil = s.tblProfiles;
    return {
      usuarioId: s.usuario_id,
      nombre: perfil?.nombre_completo ?? perfil?.email ?? "Usuario",
      email: perfil?.email ?? "",
      avatarUrl: perfil?.avatar_url ?? null,
      seccion: s.seccion || "Navegando",
      dispositivo: s.dispositivo === "movil" ? "movil" : "escritorio",
      visible: s.visible,
      ultimaActividad: s.ultima_actividad,
      conectadoEn: s.conectado_en,
    };
  });
}
