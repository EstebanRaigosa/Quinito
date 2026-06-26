"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import type { Database } from "@/lib/supabase/types";

/** Razón del último cierre de sesión (enum de la BD). */
export type RazonCierre = Database["public"]["Enums"]["razon_cierre_sesion"];

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

export type ActividadUsuario = {
  usuarioId: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  /** Inicio de la sesión más reciente; null si nunca abrió la app. */
  ultimaConexion: string | null;
  /** Último latido recibido; null si nunca abrió la app. */
  ultimaActividad: string | null;
  /** Dispositivo de la última sesión; null si nunca abrió la app. */
  dispositivo: "movil" | "escritorio" | null;
  /** Última vez que INICIÓ sesión (auth.users.last_sign_in_at); null si nunca. */
  ultimoLogin: string | null;
  /** Última vez que CERRÓ sesión; null si no hay cierre registrado. */
  ultimoCierre: string | null;
  /** Razón del último cierre; null si no hay cierre registrado. */
  razonCierre: RazonCierre | null;
  /** Pollas (activas) a las que pertenece el usuario; base del filtro. */
  grupoIds: string[];
};

/** Opción del selector de pollas del histórico de actividad. */
export type PollaFiltro = { id: string; nombre: string };

export type HistorialActividad = {
  usuarios: ActividadUsuario[];
  /** Catálogo de pollas con al menos un participante activo, para filtrar. */
  pollas: PollaFiltro[];
};

/**
 * Histórico de actividad de TODOS los usuarios registrados: su última conexión
 * (`conectado_en`) y su última actividad (`ultima_actividad`), ordenado de más
 * reciente a más antiguo. Quienes nunca abrieron la app (sin fila en
 * `tblSesionesActivas`) van al final con valores `null`. Cada usuario trae las
 * pollas activas a las que pertenece para poder filtrar el listado en cliente.
 *
 * A diferencia de `obtenerConectados`, NO aplica la ventana de 15 min: muestra a
 * todo el padrón. Se cruza en memoria (perfiles ⟕ sesiones ⟕ participantes)
 * porque el universo de usuarios es pequeño y así evitamos las ambigüedades de
 * orden por relación embebida en PostgREST. Se lee con `service_role` tras
 * validar super-admin; devuelve listas vacías si quien consulta no lo es.
 */
export async function obtenerHistorialActividad(): Promise<HistorialActividad> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) return { usuarios: [], pollas: [] };

  const admin = createAdminClient();
  const [
    { data: perfiles },
    { data: sesiones },
    { data: participantes },
    { data: grupos },
    { data: authUsers },
  ] = await Promise.all([
    admin
      .from("tblProfiles")
      .select(
        "id, nombre_completo, avatar_url, email, ultimo_cierre_en, razon_ultimo_cierre",
      ),
    admin
      .from("tblSesionesActivas")
      .select("usuario_id, conectado_en, ultima_actividad, dispositivo"),
    // Solo membresías vigentes (sin baja lógica).
    admin
      .from("tblParticipantes")
      .select("usuario_id, grupo_id")
      .is("eliminado_en", null),
    admin.from("tblGrupos").select("id, nombre"),
    // `last_sign_in_at` vive en auth.users (Supabase lo mantiene). Una página de
    // 1000 cubre el padrón actual; si crece habría que paginar.
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const porUsuario = new Map((sesiones ?? []).map((s) => [s.usuario_id, s]));
  const loginPorUsuario = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]),
  );

  // Pollas por usuario + catálogo de pollas que sí tienen miembros activos.
  const gruposPorUsuario = new Map<string, string[]>();
  const grupoConMiembros = new Set<string>();
  for (const p of participantes ?? []) {
    const arr = gruposPorUsuario.get(p.usuario_id) ?? [];
    arr.push(p.grupo_id);
    gruposPorUsuario.set(p.usuario_id, arr);
    grupoConMiembros.add(p.grupo_id);
  }

  const usuarios: ActividadUsuario[] = (perfiles ?? []).map((p) => {
    const s = porUsuario.get(p.id);
    return {
      usuarioId: p.id,
      nombre: p.nombre_completo ?? p.email ?? "Usuario",
      email: p.email ?? "",
      avatarUrl: p.avatar_url ?? null,
      ultimaConexion: s?.conectado_en ?? null,
      ultimaActividad: s?.ultima_actividad ?? null,
      dispositivo: s ? (s.dispositivo === "movil" ? "movil" : "escritorio") : null,
      ultimoLogin: loginPorUsuario.get(p.id) ?? null,
      ultimoCierre: p.ultimo_cierre_en ?? null,
      razonCierre: p.razon_ultimo_cierre ?? null,
      grupoIds: gruposPorUsuario.get(p.id) ?? [],
    };
  });

  // Más reciente primero; los que nunca abrieron la app (null) al final.
  usuarios.sort((a, b) => {
    const ta = a.ultimaActividad ? new Date(a.ultimaActividad).getTime() : -Infinity;
    const tb = b.ultimaActividad ? new Date(b.ultimaActividad).getTime() : -Infinity;
    return tb - ta;
  });

  const pollas: PollaFiltro[] = (grupos ?? [])
    .filter((g) => grupoConMiembros.has(g.id))
    .map((g) => ({ id: g.id, nombre: g.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return { usuarios, pollas };
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
