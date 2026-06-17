"use client";

import { Loader2, Lock, Users } from "lucide-react";
import type { Partido, Prediccion, ReglasGrupo } from "@/lib/types/dominio";
import { useEstadisticasGrupoResumen } from "@/lib/queries/estadisticas";
import { prediccionCerrada } from "@/lib/utils/prediccion";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { Flag } from "@/components/shared/Flag";
import { IconoEmpate } from "@/components/shared/IconoEmpate";
import { StatBar, ScoreRow } from "@/components/partidos/StatBar";

/**
 * Mínimo de INTEGRANTES del grupo para mostrar los agregados antes del cierre.
 * En grupos de ≤3 personas, ver la tendencia (aunque solo 1 haya predicho)
 * permitiría deducir fácilmente quién puso qué, rompiendo la privacidad
 * pre-cierre (CLAUDE.md §3.4). Con ≥4 integrantes el agregado ya no delata a
 * nadie, así que se muestra con las predicciones que haya (1, 2, …).
 */
const MIN_INTEGRANTES_AGREGADO = 4;

/**
 * Panel "General": resumen agregado de la POLLA para el partido — distribución
 * de ganador y marcadores más comunes, SOLO del grupo (no de la plataforma).
 * Siempre anónimo: no revela qué usuario predijo qué.
 *
 * Se muestra SIEMPRE, esté la apuesta cerrada o no, porque son agregados sin
 * PII (no nombres). La única excepción es un grupo de ≤3 integrantes ANTES del
 * cierre: ahí el agregado delataría la predicción individual en un grupo chico
 * (ver `MIN_INTEGRANTES_AGREGADO`). El umbral mira el TAMAÑO del grupo, no
 * cuántos predijeron: con >3 integrantes se muestra aunque solo 1 haya
 * predicho. La protección de los datos NOMINALES la imponen las vistas/RLS,
 * no este umbral de cliente.
 */
export function EstadisticasGrupoResumen({
  grupoId,
  partido,
  reglas,
  ahora,
  totalParticipantes,
  miPrediccion,
}: {
  grupoId: string;
  partido: Partido;
  reglas: ReglasGrupo;
  ahora: Date;
  /** Nº de integrantes del grupo: decide si se puede mostrar el agregado. */
  totalParticipantes: number;
  /** Solo se usa el marcador para resaltar la fila propia (acepta el objeto
   * reactivo que mantiene la tarjeta tras guardar, no solo la prop del server). */
  miPrediccion?: Pick<Prediccion, "goles_local" | "goles_visitante">;
}) {
  const cerrada = prediccionCerrada(
    partido,
    reglas.minutos_cierre_prediccion,
    ahora,
  );
  const { data, isLoading } = useEstadisticasGrupoResumen(grupoId, partido.id);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-fg-muted">
        <Loader2 className="size-5 animate-spin" />
        <span className="t-caption">Cargando estadísticas…</span>
      </div>
    );
  }

  const { distribucion: dist, marcadores, total } = data;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-sunken px-4 py-10 text-center">
        <Users className="size-6 text-fg-subtle" aria-hidden />
        <p className="text-sm font-medium text-fg-muted">
          Nadie del grupo ha predicho este partido todavía.
        </p>
        <p className="t-caption text-fg-subtle">Sé el primero del grupo.</p>
      </div>
    );
  }

  // Grupo pequeño (≤3) antes del cierre: ocultar para no insinuar quién puso
  // qué. El criterio es el TAMAÑO del grupo, no cuántos predijeron.
  if (!cerrada && totalParticipantes < MIN_INTEGRANTES_AGREGADO) {
    const cierreFechaHora = formatearFechaHoraBogota(
      new Date(
        new Date(partido.fecha_hora).getTime() -
          reglas.minutos_cierre_prediccion * 60000,
      ),
    );
    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft/60 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface text-primary shadow-xs">
          <Lock className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-fg-strong">
            Tendencia del grupo aún oculta.
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            En grupos de pocas personas se muestra al cerrar la apuesta, el{" "}
            <strong className="text-fg-strong">{cierreFechaHora}</strong>, para
            no revelar quién puso qué.
          </p>
        </div>
      </div>
    );
  }

  const maxPct = Math.max(...marcadores.map((m) => m.porcentaje), 0);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-fg-strong">
          <span className="h-4 w-1 rounded-full bg-primary" aria-hidden />
          Ganador
        </h3>
        <StatBar
          label={`${partido.equipo_local?.nombre} gana`}
          pct={dist.local_pct}
          color="var(--mustard-400)"
          sublabel={<Flag code={partido.equipo_local?.codigo_iso} size={18} />}
          accent
        />
        <StatBar
          label="Empate"
          pct={dist.empate_pct}
          color="var(--stone-400)"
          sublabel={<IconoEmpate size={18} />}
        />
        <StatBar
          label={`${partido.equipo_visitante?.nombre} gana`}
          pct={dist.visitante_pct}
          color="var(--clay-500)"
          sublabel={<Flag code={partido.equipo_visitante?.codigo_iso} size={18} />}
        />
      </section>

      {marcadores.length > 0 && (
        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-fg-strong">
            <span className="h-4 w-1 rounded-full bg-primary" aria-hidden />
            Resultados más comunes
          </h3>
          <div className="flex flex-col gap-2.5">
            {marcadores.map((m) => (
              <ScoreRow
                key={`${m.goles_local}-${m.goles_visitante}`}
                golesLocal={m.goles_local}
                golesVisitante={m.goles_visitante}
                isoLocal={partido.equipo_local?.codigo_iso}
                isoVisitante={partido.equipo_visitante?.codigo_iso}
                pct={m.porcentaje}
                max={maxPct}
                cantidad={m.cantidad}
                destacado={
                  miPrediccion?.goles_local === m.goles_local &&
                  miPrediccion?.goles_visitante === m.goles_visitante
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
