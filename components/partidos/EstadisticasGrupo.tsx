"use client";

import { Lock, Loader2 } from "lucide-react";
import type { Partido, ReglasGrupo } from "@/lib/types/dominio";
import { usePrediccionesNominales } from "@/lib/queries/estadisticas";
import { prediccionCerrada } from "@/lib/utils/prediccion";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { Flag } from "@/components/shared/Flag";
import { PuntajeDesglose } from "@/components/partidos/PuntajeDesglose";
import { cn } from "@/lib/utils";

/**
 * Panel "Por persona". Antes del cierre: solo el aviso de que las predicciones
 * nominales son secretas (los agregados anónimos viven en la pestaña "General",
 * que se muestra siempre). Después del cierre: lista nominal por marcador.
 * La privacidad la imponen las vistas (`vwPrediccionesGrupoPartido` solo devuelve
 * filas tras el cierre); aquí el cálculo de cierre es solo para la UI.
 */
export function EstadisticasGrupo({
  grupoId,
  partido,
  reglas,
  ahora,
  participanteActualId,
}: {
  grupoId: string;
  partido: Partido;
  reglas: ReglasGrupo;
  ahora: Date;
  /** Id del participante que mira: su fila se marca con la etiqueta "Tú". */
  participanteActualId?: string;
}) {
  const cerrada = prediccionCerrada(
    partido,
    reglas.minutos_cierre_prediccion,
    ahora,
  );
  const nominales = usePrediccionesNominales(grupoId, partido.id, cerrada);

  if (!cerrada) {
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
            Las predicciones de tus amigos son secretas.
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Se revelan al cerrar la apuesta, el{" "}
            <strong className="text-fg-strong">{cierreFechaHora}</strong>. Una vez
            empiece el partido podrás verlas en la sección{" "}
            <strong className="text-fg-strong">Partidos</strong>. Mientras tanto,
            mira la tendencia del grupo en{" "}
            <strong className="text-fg-strong">General</strong>.
          </p>
        </div>
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
  type Persona = { nombre: string; esTu: boolean };
  type GrupoMarcador = {
    clave: string;
    goles_local: number;
    goles_visitante: number;
    puntos: number | null;
    /** El marcador fue predicción única (mismo valor para todo el grupo). */
    prediccion_unica: boolean;
    personas: Persona[];
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
      acc[clave].personas.push({
        nombre: n.participante,
        esTu:
          !!participanteActualId && n.participante_id === participanteActualId,
      });
      return acc;
    }, {}),
  ).sort(
    (a, b) =>
      (b.puntos ?? 0) - (a.puntos ?? 0) ||
      b.personas.length - a.personas.length,
  );
  // Dentro de cada marcador, la fila propia ("Tú") va primero para que sea fácil
  // de encontrar; el resto conserva el orden de llegada (por `creado_en`).
  for (const g of grupos) {
    g.personas.sort((a, b) => Number(b.esTu) - Number(a.esTu));
  }

  return (
    <div className="flex flex-col gap-3.5">
      {grupos.map((g) => {
        const acerto = g.puntos != null && g.puntos > 0;
        const finalizado = partido.estado === "finalizado";
        return (
          <div
            key={g.clave}
            className={cn(
              // Verde con la escala `mustard` (=emerald) en hex literal: a
              // diferencia de `primary/success` (var hex), SÍ admite opacidad en
              // Tailwind 3.4. Al ser un velo translúcido funciona sobre el Sheet
              // claro y oscuro. Borde + sombra dan profundidad y separan cada
              // tarjeta; la cabecera va más saturada que el cuerpo (no queda
              // plano). La que PUNTUÓ sube todo: verde más denso + borde fuerte
              // + anillo + más sombra, para resaltar sin perder el tono común.
              "overflow-hidden rounded-xl border shadow-md",
              acerto
                ? "border-mustard-400/60 bg-mustard-400/[0.14] ring-1 ring-mustard-400/35"
                : "border-mustard-400/30 bg-mustard-400/[0.06]",
            )}
          >
            {/* Cabecera del resultado: franja verde MÁS saturada que el cuerpo,
                con borde inferior, para separarla con claridad de la lista. */}
            <div
              className={cn(
                "flex items-center justify-between gap-2 border-b px-3 py-2.5",
                acerto
                  ? "border-mustard-400/40 bg-mustard-400/30"
                  : "border-mustard-400/25 bg-mustard-400/15",
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
                      equipo_avanza_id: null,
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
                acerto ? "divide-mustard-400/20" : "divide-mustard-400/10",
              )}
            >
              {g.personas.map((persona, i) => (
                <li
                  key={`${g.clave}-${i}`}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-mustard-400/10",
                    // La fila propia se resalta con un velo azul (info) para que
                    // contraste con el verde del marcador y se ubique de un vistazo.
                    persona.esTu && "bg-[#1E3A8A]/10",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      persona.esTu
                        ? "bg-[#1E3A8A]"
                        : acerto
                          ? "bg-mustard-500"
                          : "bg-mustard-400",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate text-sm font-semibold",
                      persona.esTu
                        ? "text-[#1E3A8A] dark:text-info"
                        : "text-fg-strong",
                    )}
                  >
                    {persona.nombre}
                  </span>
                  {persona.esTu && (
                    <span className="ml-auto shrink-0 rounded-full bg-[#1E3A8A] px-2 py-0.5 text-2xs font-bold text-white shadow-sm">
                      Tú
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
