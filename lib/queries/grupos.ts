import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { EstadoGrupo, Grupo } from "@/lib/types/dominio";

/** Grupo enriquecido con el resumen que necesita el dashboard. */
export type GrupoConResumen = Grupo & {
  valor_apuesta: number;
  lider_nombre: string | null;
  mis_puntos: number;
  mis_aciertos: number;
  mis_exactos: number;
};

/** Deriva el estado de UI del grupo a partir de las fechas del torneo. */
function derivarEstado(inicio: string, fin: string): EstadoGrupo {
  const ahora = Date.now();
  if (ahora < new Date(inicio).getTime()) return "proximo";
  // +1 día de gracia tras la final.
  if (ahora > new Date(fin).getTime() + 86_400_000) return "finalizado";
  return "activo";
}

/**
 * Grupos del usuario autenticado, con datos para las tarjetas y la tira de
 * estado del dashboard. Una sola llamada al RPC `mis_grupos` (sin N+1).
 *
 * Envuelto en `cache()` de React: el layout `(app)` y el dashboard la llaman en
 * el mismo render de servidor; así el RPC pesado se ejecuta una sola vez por
 * request en vez de dos.
 */
export const getMisGrupos = cache(async (): Promise<GrupoConResumen[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mis_grupos");
  if (error || !data) return [];

  return data.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    descripcion: g.descripcion,
    torneo: {
      id: g.torneo_id,
      codigo: g.torneo_codigo,
      nombre: g.torneo_nombre,
      pais_sede: g.torneo_pais_sede,
      fecha_inicio: g.torneo_fecha_inicio,
      fecha_fin: g.torneo_fecha_fin,
      activo: g.torneo_activo,
    },
    codigo_invitacion: g.codigo_invitacion,
    creador_id: g.creador_id,
    total_participantes: Number(g.total_participantes ?? 0),
    mi_posicion: g.mi_posicion ?? null,
    estado: derivarEstado(g.torneo_fecha_inicio, g.torneo_fecha_fin),
    valor_apuesta: Number(g.valor_apuesta ?? 0),
    lider_nombre: g.lider_nombre,
    mis_puntos: Number(g.mis_puntos ?? 0),
    mis_aciertos: Number(g.mis_aciertos ?? 0),
    mis_exactos: Number(g.mis_exactos ?? 0),
  }));
});
