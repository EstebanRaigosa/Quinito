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
