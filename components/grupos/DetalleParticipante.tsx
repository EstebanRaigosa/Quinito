"use client";

import { useMemo } from "react";
import { ListChecks, Target } from "lucide-react";
import type {
  FilaTablaPosiciones,
  Partido,
  Prediccion,
  ReglasGrupo,
} from "@/lib/types/dominio";
import { usePrediccionesParticipante } from "@/lib/queries/predicciones-participante";
import { agruparPorDia, formatearFechaLarga } from "@/lib/utils/fechas";
import { cn } from "@/lib/utils";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { EmptyState } from "@/components/shared/EmptyState";
import { Flag } from "@/components/shared/Flag";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PuntajeDesglose } from "@/components/partidos/PuntajeDesglose";

/** Chip de medalla para el top 3 (mismo lenguaje visual que TablaPosiciones). */
const MEDALLA_CHIP: Record<1 | 2 | 3, string> = {
  1: "bg-gradient-to-b from-[#FCD34D] to-[#F59E0B] text-[#5A3E00] ring-1 ring-[#F59E0B]/60",
  2: "bg-gradient-to-b from-clay-200 to-clay-400 text-clay-900 ring-1 ring-clay-400/60",
  3: "bg-gradient-to-b from-[#E8B27D] to-[#B26B2E] text-white ring-1 ring-[#B26B2E]/60",
};

/** Predicción cruzada con su partido (solo partidos cerrados, ver el hook). */
type ItemDetalle = { partido: Partido; prediccion: Prediccion };

/** Una mini-estadística del encabezado (valor + etiqueta). */
function MiniStat({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-sm font-black tabular-nums text-fg-strong">
        {valor}
      </span>
      <span className="text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
        {etiqueta}
      </span>
    </div>
  );
}

/**
 * Lado de equipo compacto. La bandera va del lado INTERNO (junto al marcador) y
 * el nombre del lado externo; el contenido se pega hacia el centro para que las
 * dos banderas queden cerca del marcador.
 * - `izq` (local): nombre · bandera, pegado a la derecha de su celda.
 * - `der` (visitante): bandera · nombre, pegado a la izquierda de su celda.
 */
function LadoCompacto({
  equipo,
  alineacion,
}: {
  equipo: Partido["equipo_local"];
  alineacion: "izq" | "der";
}) {
  const nombre = (
    <span className="truncate text-xs font-bold text-fg-strong sm:max-w-[7rem]">
      <span className="sm:hidden">{equipo?.codigo_iso ?? "—"}</span>
      <span className="hidden sm:inline">{equipo?.nombre ?? "—"}</span>
    </span>
  );
  const bandera = <Flag code={equipo?.codigo_iso} size={18} />;
  return (
    <span
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5",
        alineacion === "izq" ? "justify-end" : "justify-start",
      )}
    >
      {alineacion === "izq" ? (
        <>
          {nombre}
          {bandera}
        </>
      ) : (
        <>
          {bandera}
          {nombre}
        </>
      )}
    </span>
  );
}

/** Marcador etiquetado: "Tú" (predicción) vs "Real" (resultado del partido). */
function Marcador({
  label,
  valor,
  destacado,
  exacto,
}: {
  label: string;
  valor: string;
  /** El marcador real va destacado; la predicción, atenuada con contorno. */
  destacado: boolean;
  exacto: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[2.7rem] flex-col items-center rounded-md px-1.5 py-0.5",
        destacado
          ? exacto
            ? "bg-primary-soft"
            : "bg-sunken"
          : "border border-dashed border-strong bg-surface",
      )}
    >
      <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-fg-subtle">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-black tabular-nums leading-tight",
          destacado
            ? exacto
              ? "text-primary"
              : "text-fg-strong"
            : "text-fg-muted",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

/** Fila compacta de un partido: equipos · predicción vs real · puntos. */
function FilaPartido({
  partido,
  prediccion,
  reglas,
}: {
  partido: Partido;
  prediccion: Prediccion;
  reglas: ReglasGrupo;
}) {
  const exacto =
    prediccion.goles_local === partido.goles_local &&
    prediccion.goles_visitante === partido.goles_visitante;

  return (
    // Columnas fijas (equipo · marcador · equipo · puntos): los marcadores y los
    // badges quedan SIEMPRE en la misma X entre filas, sin importar el largo del
    // nombre. Las dos celdas de equipo son 1fr iguales → marcador centrado.
    <li className="grid min-h-12 grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-3 py-2">
      <LadoCompacto equipo={partido.equipo_local} alineacion="izq" />
      <div className="flex items-stretch gap-1">
        <Marcador
          label="Resul"
          valor={`${partido.goles_local}-${partido.goles_visitante}`}
          destacado
          exacto={exacto}
        />
        <Marcador
          label="Pred"
          valor={`${prediccion.goles_local}-${prediccion.goles_visitante}`}
          destacado={false}
          exacto={exacto}
        />
      </div>
      <LadoCompacto equipo={partido.equipo_visitante} alineacion="der" />
      {/* Badge de puntos con desglose (Popover lazy). */}
      <PuntajeDesglose
        prediccion={prediccion}
        partido={partido}
        reglas={reglas}
      />
    </li>
  );
}

export function DetalleParticipante({
  abierto,
  onOpenChange,
  fila,
  grupoId,
  partidos,
  reglas,
}: {
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  fila: FilaTablaPosiciones | null;
  grupoId: string;
  partidos: Partido[];
  reglas: ReglasGrupo;
}) {
  const { data, isLoading, isError } = usePrediccionesParticipante(
    grupoId,
    fila?.participante_id ?? null,
    abierto,
  );

  const partidoPorId = useMemo(
    () => new Map(partidos.map((p) => [p.id, p])),
    [partidos],
  );

  // Cruzar predicciones (vista) con partidos (props): equipos, marcador, fecha.
  const items = useMemo<ItemDetalle[]>(() => {
    if (!data || !fila) return [];
    return data
      .map((pp) => {
        const partido = partidoPorId.get(pp.partido_id);
        if (!partido || !partido.equipo_local || !partido.equipo_visitante) {
          return null;
        }
        const prediccion: Prediccion = {
          id: pp.partido_id,
          participante_id: fila.participante_id,
          partido_id: pp.partido_id,
          goles_local: pp.goles_local,
          goles_visitante: pp.goles_visitante,
          puntos_obtenidos: pp.puntos_obtenidos,
          prediccion_unica: pp.prediccion_unica,
        };
        return { partido, prediccion };
      })
      .filter((x): x is ItemDetalle => x !== null)
      .sort(
        (a, b) =>
          new Date(a.partido.fecha_hora).getTime() -
          new Date(b.partido.fecha_hora).getTime(),
      );
  }, [data, fila, partidoPorId]);

  const dias = useMemo(
    () =>
      agruparPorDia(
        items.map((it) => ({ ...it, fecha_hora: it.partido.fecha_hora })),
      ),
    [items],
  );

  const posicion = fila?.posicion ?? 0;
  const esTop3 = posicion >= 1 && posicion <= 3;

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex max-h-[85dvh] flex-col p-0",
          // Desktop: tarjeta CENTRADA en pantalla (vertical + horizontal) con
          // ancho contenido y esquinas redondeadas — no una barra pegada abajo.
          "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl sm:border",
        )}
      >
        {fila && (
          <>
            <SheetHeader className="gap-3 border-b border-border">
              <div className="flex items-center gap-3">
                <AvatarNotion nombre={fila.nombre_completo} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {esTop3 && (
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-xs font-black tabular-nums",
                          MEDALLA_CHIP[posicion as 1 | 2 | 3],
                        )}
                      >
                        {posicion}
                      </span>
                    )}
                    <SheetTitle className="truncate text-base">
                      {fila.nombre_completo}
                    </SheetTitle>
                  </div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
                    {esTop3 ? `${posicion}.º puesto` : `Puesto ${posicion}`}
                  </p>
                </div>
                {/* Sumatoria total de puntos */}
                <div className="shrink-0 text-right">
                  <p className="text-3xl font-black leading-none tabular-nums text-fg-strong">
                    {fila.puntos_totales}
                  </p>
                  <p className="text-2xs font-bold uppercase tracking-wide text-fg-subtle">
                    Puntos
                  </p>
                </div>
              </div>
              {/* Mini-stats */}
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-sunken/60 py-2">
                <MiniStat valor={fila.marcadores_exactos} etiqueta="Exactos" />
                <MiniStat valor={fila.unicas_acertadas} etiqueta="Únicas" />
                <MiniStat valor={fila.aciertos} etiqueta="Aciertos" />
                <MiniStat valor={items.length} etiqueta="Partidos" />
              </div>
              {/* Desglose del puntaje de arranque (solo si la polla se migró). */}
              {fila.puntos_iniciales > 0 && (
                <p className="t-caption text-center text-fg-muted">
                  Arranque {fila.puntos_iniciales} · Ganados en la app{" "}
                  {fila.puntos_totales - fila.puntos_iniciales}
                </p>
              )}
            </SheetHeader>

            {/* Cuerpo scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-safe">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-lg" />
                  ))}
                </div>
              ) : isError ? (
                <p className="px-4 py-10 text-center text-sm text-fg-muted">
                  No se pudo cargar el detalle. Intenta de nuevo.
                </p>
              ) : items.length === 0 ? (
                <EmptyState
                  icono={Target}
                  titulo="Aún no hay partidos jugados"
                  descripcion="El detalle se llena cuando se cierren y finalicen los partidos."
                  className="m-3"
                />
              ) : (
                <div className="space-y-3 py-2">
                  {dias.map(([dia, lista]) => (
                    <section key={dia}>
                      <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5">
                        <ListChecks
                          className="size-3.5 shrink-0 text-fg-subtle"
                          aria-hidden
                        />
                        <h3 className="text-2xs font-extrabold uppercase tracking-wide text-fg-subtle">
                          {/* Usar la fecha real del partido, NO la clave del día
                              (evita el corrimiento a UTC). Capitalizar inicial. */}
                          {(() => {
                            const f = formatearFechaLarga(lista[0]!.partido.fecha_hora);
                            return f.charAt(0).toUpperCase() + f.slice(1);
                          })()}
                        </h3>
                      </div>
                      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
                        {lista.map((it) => (
                          <FilaPartido
                            key={it.partido.id}
                            partido={it.partido}
                            prediccion={it.prediccion}
                            reglas={reglas}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
