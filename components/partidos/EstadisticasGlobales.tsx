"use client";

import { Loader2, Globe } from "lucide-react";
import type { Partido, Prediccion } from "@/lib/types/dominio";
import { useEstadisticasGlobal } from "@/lib/queries/estadisticas";
import { Flag } from "@/components/shared/Flag";
import { IconoEmpate } from "@/components/shared/IconoEmpate";
import { StatBar, ScoreRow } from "@/components/partidos/StatBar";

/**
 * Panel "Todos los usuarios": estadísticas agregadas de TODA la plataforma para
 * el partido. Públicas y anónimas (sin PII) — REQUIREMENTS §4.5 (RF-GRUPO-02.1).
 * Nunca revela qué usuario predijo qué: solo porcentajes y conteos agregados.
 */
export function EstadisticasGlobales({
  partido,
  miPrediccion,
}: {
  partido: Partido;
  miPrediccion?: Prediccion;
}) {
  const { data, isLoading } = useEstadisticasGlobal(partido.id);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-fg-muted">
        <Loader2 className="size-5 animate-spin" />
        <span className="t-caption">Cargando estadísticas…</span>
      </div>
    );
  }

  const { distribucion: dist, marcadores } = data;

  if (marcadores.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-sunken px-4 py-10 text-center">
        <Globe className="size-6 text-fg-subtle" aria-hidden />
        <p className="text-sm font-medium text-fg-muted">
          Nadie ha predicho este partido todavía.
        </p>
        <p className="t-caption text-fg-subtle">
          Sé el primero en marcar tendencia.
        </p>
      </div>
    );
  }

  const maxPct = Math.max(...marcadores.map((m) => m.porcentaje));

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
    </div>
  );
}
