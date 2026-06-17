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
  /** true = la sesión corre como PWA instalada; false = navegador. */
  esPwa: boolean;
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
      "usuario_id, seccion, dispositivo, es_pwa, visible, ultima_actividad, conectado_en, tblProfiles(nombre_completo, avatar_url, email)",
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
      esPwa: s.es_pwa,
      visible: s.visible,
      ultimaActividad: s.ultima_actividad,
      conectadoEn: s.conectado_en,
    };
  });
}

export type UsuarioPwa = {
  usuarioId: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  instaladaEn: string;
};

export type ResumenPwa = {
  /** Total de usuarios registrados en la plataforma. */
  totalUsuarios: number;
  /** Usuarios que han abierto la app en modo PWA al menos una vez. */
  instalados: UsuarioPwa[];
};

/**
 * Histórico de quiénes tienen la PWA instalada: todo usuario con
 * `pwa_instalada_en` sellado (lo abrió en modo standalone alguna vez). Es el
 * proxy confiable de "descargó la app" — más robusto que `appinstalled`, que
 * iOS no dispara. Se lee server-side con `service_role` tras validar admin.
 * Devuelve un resumen vacío si quien consulta no es super-admin.
 */
export async function obtenerResumenPwa(): Promise<ResumenPwa> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email))
    return { totalUsuarios: 0, instalados: [] };

  const admin = createAdminClient();

  const [{ count }, { data }] = await Promise.all([
    admin.from("tblProfiles").select("id", { count: "exact", head: true }),
    admin
      .from("tblProfiles")
      .select("id, nombre_completo, avatar_url, email, pwa_instalada_en")
      .not("pwa_instalada_en", "is", null)
      .order("pwa_instalada_en", { ascending: false }),
  ]);

  const instalados: UsuarioPwa[] = (data ?? []).map((p) => ({
    usuarioId: p.id,
    nombre: p.nombre_completo ?? p.email ?? "Usuario",
    email: p.email ?? "",
    avatarUrl: p.avatar_url ?? null,
    instaladaEn: p.pwa_instalada_en as string,
  }));

  return { totalUsuarios: count ?? 0, instalados };
}
