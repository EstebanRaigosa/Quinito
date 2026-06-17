import { createClient } from "@/lib/supabase/client";

/**
 * Guarda (crea o actualiza) la predicción del usuario para un partido.
 *
 * Usamos insert-o-update explícito (NO `upsert`): el upsert de PostgREST genera
 * `ON CONFLICT DO UPDATE SET` sobre todas las columnas del payload, incluidas
 * participante_id/partido_id, y `authenticated` no tiene UPDATE sobre esas
 * columnas (grants que protegen `puntos_obtenidos`) → permission denied. El
 * update explícito solo toca el marcador.
 *
 * El RLS de `tblPredicciones` valida que sea su propia predicción y que la
 * ventana no esté cerrada.
 */
export async function guardarPrediccion(input: {
  participanteId: string;
  partidoId: string;
  golesLocal: number;
  golesVisitante: number;
  /**
   * Equipo que avanza cuando el marcador predicho es empate en una fase
   * eliminatoria. Se envía `null` (limpiando el guardado previo) en cualquier
   * otro caso: si el usuario cambia el empate por un marcador con ganador, el
   * avance lo dicta el marcador y este campo deja de aplicar.
   */
  equipoAvanzaId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const equipoAvanzaId = input.equipoAvanzaId ?? null;

  const { data: existente, error: selErr } = await supabase
    .from("tblPredicciones")
    .select("id")
    .eq("participante_id", input.participanteId)
    .eq("partido_id", input.partidoId)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };

  if (existente) {
    const { error } = await supabase
      .from("tblPredicciones")
      .update({
        goles_local: input.golesLocal,
        goles_visitante: input.golesVisitante,
        equipo_avanza_id: equipoAvanzaId,
      })
      .eq("id", existente.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("tblPredicciones").insert({
      participante_id: input.participanteId,
      partido_id: input.partidoId,
      goles_local: input.golesLocal,
      goles_visitante: input.golesVisitante,
      equipo_avanza_id: equipoAvanzaId,
    });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
