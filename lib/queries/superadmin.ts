import { createClient } from "@/lib/supabase/server";

/** Resumen de una polla para el panel de superadmin (todas las de la plataforma). */
export type PollaResumenAdmin = {
  id: string;
  nombre: string;
  codigo_invitacion: string;
  creador_nombre: string | null;
  creador_email: string | null;
  total_participantes: number;
  valor_apuesta: number;
  torneo_nombre: string | null;
  creado_en: string;
};

/**
 * Todas las pollas de la plataforma, para el superadmin. El RPC
 * `superadmin_listar_pollas` impone la puerta dura (devuelve null si quien llama
 * no es superadmin), así que aquí basta con normalizar tipos.
 */
export async function getTodasLasPollas(): Promise<PollaResumenAdmin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_listar_pollas");
  if (error || !data) return [];

  return (data as unknown as PollaResumenAdmin[]).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    codigo_invitacion: p.codigo_invitacion,
    creador_nombre: p.creador_nombre,
    creador_email: p.creador_email,
    total_participantes: Number(p.total_participantes ?? 0),
    valor_apuesta: Number(p.valor_apuesta ?? 0),
    torneo_nombre: p.torneo_nombre,
    creado_en: p.creado_en,
  }));
}

/** Usuario con notificaciones push activas (puede tener varios dispositivos). */
export type UsuarioSuscrito = {
  usuario_id: string;
  nombre_completo: string | null;
  email: string | null;
  dispositivos: number;
  ultima_suscripcion: string;
  /** Último push entregado con éxito; null si nunca se le ha enviado uno. */
  ultimo_envio: string | null;
};

/**
 * Usuarios con notificaciones push activas, para el panel de admin. El RPC
 * `superadmin_listar_suscritos` impone la puerta dura (null si quien llama no es
 * superadmin); aquí solo normalizamos tipos. Cada fila agrega los dispositivos
 * de un mismo usuario.
 */
export async function getUsuariosSuscritos(): Promise<UsuarioSuscrito[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_listar_suscritos");
  if (error || !data) return [];

  return (data as unknown as UsuarioSuscrito[]).map((u) => ({
    usuario_id: u.usuario_id,
    nombre_completo: u.nombre_completo,
    email: u.email,
    dispositivos: Number(u.dispositivos ?? 0),
    ultima_suscripcion: u.ultima_suscripcion,
    ultimo_envio: u.ultimo_envio,
  }));
}
