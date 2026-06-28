import { createClient } from "@/lib/supabase/server";

/**
 * Un movimiento de auditoría de marcador (una fila del historial), ya enriquecido
 * con nombre del usuario, etiqueta del partido y datos del actor. Lo produce el
 * RPC `superadmin_auditoria_grupo`, que impone la puerta dura de superadmin.
 */
export type MovimientoAuditoria = {
  id: string;
  creado_en: string;
  accion: "inicial" | "insert" | "update" | "delete";
  participante_id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  partido_id: string;
  partido_numero: number | null;
  partido_fase: string | null;
  partido_label: string;
  /** Código ISO del equipo (para la bandera); null en eliminatorias sin equipo. */
  equipo_local_iso: string | null;
  equipo_visitante_iso: string | null;
  goles_local_anterior: number | null;
  goles_visitante_anterior: number | null;
  goles_local_nuevo: number | null;
  goles_visitante_nuevo: number | null;
  /**
   * Equipo que el usuario marcó como "el que avanza" en un empate de fase
   * eliminatoria (nombre + ISO para la bandera). Anterior → nuevo, en paralelo al
   * marcador. Null cuando no aplica (no es empate eliminatorio o no se eligió).
   */
  equipo_avanza_anterior_nombre: string | null;
  equipo_avanza_anterior_iso: string | null;
  equipo_avanza_nuevo_nombre: string | null;
  equipo_avanza_nuevo_iso: string | null;
  actor_id: string | null;
  actor_nombre: string | null;
  actor_es_admin: boolean;
  /** El actor es el propio dueño de la predicción (cambio hecho por sí mismo). */
  actor_es_dueno: boolean;
};

/**
 * Línea de tiempo de auditoría de marcadores de UNA polla, ordenada de más
 * reciente a más antigua. El RPC devuelve null si quien llama no es superadmin;
 * aquí lo normalizamos a lista vacía.
 */
export async function getAuditoriaGrupo(
  grupoId: string,
): Promise<MovimientoAuditoria[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("superadmin_auditoria_grupo", {
    p_grupo_id: grupoId,
  });
  if (error || !data) return [];
  return data as unknown as MovimientoAuditoria[];
}
