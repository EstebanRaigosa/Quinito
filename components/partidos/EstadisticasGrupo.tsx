"use client";

import { Lock, Loader2 } from "lucide-react";
import type { Partido, ReglasGrupo } from "@/lib/types/dominio";
import {
  useEstadisticasGrupo,
  usePrediccionesNominales,
} from "@/lib/queries/estadisticas";
import { prediccionCerrada } from "@/lib/utils/prediccion";
import { formatearHoraBogota } from "@/lib/utils/fechas";
import { Flag } from "@/components/shared/Flag";
import { IconoEmpate } from "@/components/shared/IconoEmpate";
import { StatBar } from "@/components/partidos/StatBar";
import { PuntajeDesglose } from "@/components/partidos/PuntajeDesglose";
import { cn } from "@/lib/utils";

const UMBRAL_PRIVACIDAD = 5;

/**
 * Panel "Predicciones de mi grupo". Antes del cierre: mensaje "secretas" +
 * agregados anónimos solo si ≥5 predijeron. Después del cierre: lista nominal.
 * La privacidad la imponen las vistas (`vwPrediccionesGrupoPartido` solo devuelve
 * filas tras el cierre); aquí el cálculo de cierre es solo para la UI.
 */
export function EstadisticasGrupo({
  grupoId,
  partido,
  reglas,
  ahora,
}: {
  grupoId: string;
  partido: Partido;
  reglas: ReglasGrupo;
  ahora: Date;
}) {
  const cerrada = prediccionCerrada(
    partido,
    reglas.minutos_cierre_prediccion,
    ahora,
  );
  const agregado = useEstadisticasGrupo(grupoId, partido.id);
  const nominales = usePrediccionesNominales(grupoId, partido.id, cerrada);

  if (!cerrada) {
    const cierreHora = formatearHoraBogota(
      new Date(
        new Date(partido.fecha_hora).getTime() -
          reglas.minutos_cierre_prediccion * 60000,
      ),
    );
    const total = agregado.data?.total ?? 0;
    const muestraAgregado = total >= UMBRAL_PRIVACIDAD;
    const dist = agregado.data?.distribucion;

    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft/60 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface text-primary shadow-xs">
            <Lock className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-fg-strong">
              Las predicciones de tus amigos son secretas.
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Estarán disponibles cuando se cierre la apuesta a las{" "}
              <strong className="text-fg-strong">{cierreHora}</strong>.
            </p>
          </div>
        </div>

        {muestraAgregado && dist && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-fg-strong">
              <span className="h-4 w-1 rounded-full bg-primary" aria-hidden />
              Tendencia anónima del grupo
              <span className="text-xs font-medium text-fg-subtle">
                · {total} predicciones
              </span>
            </h3>
            <StatBar
              label={partido.equipo_local?.nombre ?? "Local"}
              pct={dist.local_pct}
              color="var(--mustard-400)"
              sublabel={<Flag code={partido.equipo_local?.codigo_iso} size={16} />}
            />
            <StatBar
              label="Empate"
              pct={dist.empate_pct}
              color="var(--stone-400)"
              sublabel={<IconoEmpate size={16} />}
            />
            <StatBar
              label={partido.equipo_visitante?.nombre ?? "Visitante"}
              pct={dist.visitante_pct}
              color="var(--clay-500)"
              sublabel={
                <Flag code={partido.equipo_visitante?.codigo_iso} size={16} />
              }
            />
          </div>
        )}
      </div>
    );
  }

  if (nominales.isLoading) {
    return (
      <div className="flex justify-center py-10 text-fg-muted">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!nominales.data || nominales.data.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-fg-muted">
        Nadie del grupo predijo este partido.
      </p>
    );
  }

  // Agrupamos por marcador: el resultado manda la jerarquía y debajo van las
  // personas que lo pusieron. Los puntos dependen solo del marcador, así que
  // viven en la cabecera del grupo (no se repiten por persona).
  type GrupoMarcador = {
    clave: string;
    goles_local: number;
    goles_visitante: number;
    puntos: number | null;
    /** El marcador fue predicción única (mismo valor para todo el grupo). */
    prediccion_unica: boolean;
    personas: string[];
  };
  const grupos: GrupoMarcador[] = Object.values(
    nominales.data.reduce<Record<string, GrupoMarcador>>((acc, n) => {
      const clave = `${n.goles_local}-${n.goles_visitante}`;
      acc[clave] ??= {
        clave,
        goles_local: n.goles_local,
        goles_visitante: n.goles_visitante,
        puntos: n.puntos,
        prediccion_unica: false,
        personas: [],
      };
      acc[clave].prediccion_unica ||= n.prediccion_unica;
      acc[clave].personas.push(n.participante);
      return acc;
    }, {}),
  ).sort(
    (a, b) =>
      (b.puntos ?? 0) - (a.puntos ?? 0) ||
      b.personas.length - a.personas.length,
  );

  return (
    <div className="flex flex-col gap-3">
      {grupos.map((g) => {
        const acerto = g.puntos != null && g.puntos > 0;
        const finalizado = partido.estado === "finalizado";
        return (
          <div
            key={g.clave}
            className={cn(
              "overflow-hidden rounded-xl border shadow-md",
              acerto
                ? "border-success/45 bg-success-soft/15"
                : "border-border bg-surface",
            )}
          >
            {/* Cabecera del resultado: barra tintada con borde inferior grueso,
                claramente separada de la lista de usuarios de abajo. */}
            <div
              className={cn(
                "flex items-center justify-between gap-2 border-b-2 px-3 py-2.5",
                acerto
                  ? "border-success/30 bg-success-soft/60"
                  : "border-clay-200/60 bg-clay-100/60",
              )}
            >
              <div className="flex items-center gap-2.5">
                {/* Banderas a cada lado del marcador: queda claro qué goles son
                    del local (izq) y cuáles del visitante (der). */}
                <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-base font-extrabold tabular-nums text-fg-strong shadow-xs">
                  <Flag code={partido.equipo_local?.codigo_iso} size={16} />
                  {g.goles_local}
                  <span className="text-fg-subtle">-</span>
                  {g.goles_visitante}
                  <Flag code={partido.equipo_visitante?.codigo_iso} size={16} />
                </span>
                {/* Finalizado: badge con desglose de puntos (igual que en el
                    partido). Antes (en juego) aún no hay puntos que mostrar. */}
                {finalizado && g.puntos != null && (
                  <PuntajeDesglose
                    prediccion={{
                      id: g.clave,
                      participante_id: "",
                      partido_id: partido.id,
                      goles_local: g.goles_local,
                      goles_visitante: g.goles_visitante,
                      puntos_obtenidos: g.puntos,
                      prediccion_unica: g.prediccion_unica,
                    }}
                    partido={partido}
                    reglas={reglas}
                  />
                )}
              </div>
              <span className="t-caption shrink-0 font-bold text-fg-muted">
                {g.personas.length}{" "}
                {g.personas.length === 1 ? "persona" : "personas"}
              </span>
            </div>

            {/* Usuarios que pusieron ese marcador: una fila por persona, con
                líneas divisorias visibles y un punto guía que la indenta. */}
            <ul
              className={cn(
                "divide-y",
                acerto ? "divide-success/20" : "divide-border",
              )}
            >
              {g.personas.map((nombre, i) => (
                <li
                  key={`${g.clave}-${i}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-sunken/40"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      acerto ? "bg-success" : "bg-clay-400",
                    )}
                  />
                  <span className="truncate text-sm font-semibold text-fg-strong">
                    {nombre}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
