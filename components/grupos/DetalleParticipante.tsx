"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDownUp,
  Award,
  Check,
  Download,
  ListChecks,
  Loader2,
  Target,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  FaseTorneo,
  FilaTablaPosiciones,
  Partido,
  Prediccion,
  ReglasGrupo,
} from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";
import {
  useBonosFaseParticipante,
  usePrediccionesParticipante,
} from "@/lib/queries/predicciones-participante";
import { agruparPorDia, formatearFechaLarga } from "@/lib/utils/fechas";
import { equipoAvanzaReal, equipoQueAvanza } from "@/lib/utils/prediccion";
import { dentroVentanaAnuncio } from "@/lib/utils/ventana-anuncios";
import { exportarDetalleParticipante } from "@/lib/utils/exportar-puntos";
import { cn } from "@/lib/utils";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { Button } from "@/components/ui/button";
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

/** Orden de las fases para listar los bonos de menos a más avanzado. */
const ORDEN_FASE: Record<FaseTorneo, number> = {
  fase_grupos: 0,
  dieciseisavos: 1,
  octavos: 2,
  cuartos: 3,
  semifinales: 4,
  tercer_lugar: 5,
  final: 6,
};

/**
 * Color (frío) de la barrita lateral por fase eliminatoria en el detalle.
 * Progresa verde → azul → índigo conforme avanza el torneo, para diferenciar de
 * un vistazo a qué ronda pertenece cada partido. `fase_grupos` no lleva barra.
 */
const COLOR_FASE: Partial<Record<FaseTorneo, string>> = {
  dieciseisavos: "#15803D", // green-700 (verde profundo)
  octavos: "#22C55E", // green-500 (verde)
  cuartos: "#06B6D4", // cyan-500 (cian)
  semifinales: "#2563EB", // blue-600 (azul)
  tercer_lugar: "#64748B", // slate-500 (no avanza: gris frío)
  final: "#7C3AED", // violet-600 (violeta: el clímax)
};

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
/** Estado del avance marcado: acertó / falló el equipo que clasificó, o aún
 *  sin definir el desempate real. `null` = este equipo no fue el marcado. */
type EstadoAvance = "acerto" | "fallo" | "neutro" | null;

function LadoCompacto({
  equipo,
  alineacion,
  avance = null,
  clasifico = false,
}: {
  equipo: Partido["equipo_local"];
  alineacion: "izq" | "der";
  /** Si este equipo es el marcado para pasar, su estado vs el avance real. */
  avance?: EstadoAvance;
  /**
   * Solo en empates de eliminatoria: este equipo fue el que clasificó realmente
   * (por penales o alargue). Resalta su nombre con un color distintivo.
   */
  clasifico?: boolean;
}) {
  // Con el badge "Pasa" presente, el nombre completo en desktop satura la celda;
  // mostramos el código ISO en ambos tamaños (como ya se hace en móvil).
  const conBadge = avance !== null;
  const nombre = (
    <span
      title={clasifico ? "Clasificó (definido por desempate)" : undefined}
      className={cn(
        "min-w-0 truncate text-xs font-bold sm:max-w-[7rem]",
        clasifico
          ? "rounded-md bg-info-soft px-1.5 py-0.5 font-extrabold text-info"
          : "text-fg-strong",
      )}
    >
      {conBadge ? (
        equipo?.codigo_iso ?? "—"
      ) : (
        <>
          <span className="sm:hidden">{equipo?.codigo_iso ?? "—"}</span>
          <span className="hidden sm:inline">{equipo?.nombre ?? "—"}</span>
        </>
      )}
    </span>
  );
  const bandera = <Flag code={equipo?.codigo_iso} size={18} />;
  // Badge "Pasa" junto al nombre del país marcado (sin repetir su bandera).
  // Verde ✓ si clasificó realmente, rojo ✗ si no, neutro si aún sin definir.
  // En móvil va compacto (solo el icono) para no comer el nombre del equipo.
  const badge = avance ? (
    <span
      title={
        avance === "acerto"
          ? "Acertó quién pasa"
          : avance === "fallo"
            ? "Falló quién pasa"
            : "Marcó este para pasar"
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
        avance === "acerto"
          ? "bg-success-soft text-success"
          : avance === "fallo"
            ? "bg-destructive-soft text-destructive"
            : "bg-accent-soft text-accent",
      )}
    >
      {/* "Pasa": oculto en móvil salvo cuando no hay icono (estado neutro). */}
      <span className={avance === "neutro" ? "" : "hidden sm:inline"}>Pasa</span>
      {avance === "acerto" && (
        <Check className="size-3 sm:size-2.5" strokeWidth={3} aria-hidden />
      )}
      {avance === "fallo" && (
        <X className="size-3 sm:size-2.5" strokeWidth={3} aria-hidden />
      )}
    </span>
  ) : null;
  return (
    <span
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5",
        alineacion === "izq" ? "justify-end" : "justify-start",
      )}
    >
      {alineacion === "izq" ? (
        <>
          {badge}
          {nombre}
          {bandera}
        </>
      ) : (
        <>
          {bandera}
          {nombre}
          {badge}
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
  // Partido eliminatorio (16vos en adelante): acento lateral de color de acento
  // para diferenciarlo de los de fase de grupos, sin romper las columnas fijas.
  const esEliminatoria = partido.fase !== "fase_grupos";
  // Empate en eliminatoria: qué país marcó el participante para pasar.
  const avanza = equipoQueAvanza(partido, prediccion);
  const pasaLocal = !!avanza && avanza.id === partido.equipo_local?.id;
  const pasaVisitante = !!avanza && avanza.id === partido.equipo_visitante?.id;
  // Equipo que clasificó REALMENTE: si hubo empate, el del desempate
  // (`equipo_avanza_id`); si el partido tuvo ganador a los 90', ese ganador.
  const avanzaReal = equipoAvanzaReal(partido);
  const avanceRealId = avanzaReal?.id ?? null;
  // ¿El marcador real fue empate? Solo en empates resaltamos al que clasificó:
  // ahí el desempate (penales/alargue) decide quién pasa y no se ve en el marcador.
  const empateReal =
    partido.goles_local != null &&
    partido.goles_visitante != null &&
    partido.goles_local === partido.goles_visitante;
  const resaltarClasificado = esEliminatoria && empateReal && !!avanzaReal;
  const clasificoLocal =
    resaltarClasificado && avanzaReal.id === partido.equipo_local?.id;
  const clasificoVisitante =
    resaltarClasificado && avanzaReal.id === partido.equipo_visitante?.id;
  // ¿El país que marcó para pasar fue el que clasificó realmente?
  const estadoAvance: EstadoAvance = avanza
    ? avanceRealId
      ? avanza.id === avanceRealId
        ? "acerto"
        : "fallo"
      : "neutro"
    : null;

  return (
    // Columnas fijas (equipo · marcador · equipo · puntos): los marcadores y los
    // badges quedan SIEMPRE en la misma X entre filas, sin importar el largo del
    // nombre. Las dos celdas de equipo son 1fr iguales → marcador centrado.
    <li
      title={esEliminatoria ? ETIQUETA_FASE[partido.fase] : undefined}
      style={
        esEliminatoria
          ? ({
              "--barra-fase": COLOR_FASE[partido.fase] ?? "var(--accent)",
            } as CSSProperties)
          : undefined
      }
      className={cn(
        "grid min-h-12 grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-3 py-2",
        esEliminatoria &&
          "relative overflow-hidden pl-4 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--barra-fase)]",
      )}
    >
      <LadoCompacto
        equipo={partido.equipo_local}
        alineacion="izq"
        avance={pasaLocal ? estadoAvance : null}
        clasifico={clasificoLocal}
      />
      <div className="flex items-stretch gap-1">
        <Marcador
          label="Real"
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
      <LadoCompacto
        equipo={partido.equipo_visitante}
        alineacion="der"
        avance={pasaVisitante ? estadoAvance : null}
        clasifico={clasificoVisitante}
      />
      {/* Badge de puntos con desglose (Popover lazy). */}
      <PuntajeDesglose
        prediccion={prediccion}
        partido={partido}
        reglas={reglas}
      />
    </li>
  );
}

/**
 * Avisito (máx 2 veces POR POLLA, y solo dentro de la ventana de anuncios —mismo
 * rango que la modal de eliminatorias—) que informa el nuevo orden del detalle:
 * los partidos más recientes primero. Es un overlay DENTRO del Sheet —no un Dialog
 * anidado, que en iOS pelea con el overlay/scroll-lock del Sheet (§4)—. Se monta
 * al abrir el detalle (Radix monta/desmonta el Content con `open`), así que su
 * efecto corre una vez por apertura. Entra con rebote + brillo; respeta
 * `prefers-reduced-motion`.
 */
function AvisoOrdenReciente({ grupoId }: { grupoId: string }) {
  const [visible, setVisible] = useState(false);
  const clave = `pll:aviso-orden-reciente:v1:${grupoId}:vistas`;

  useEffect(() => {
    // Solo dentro de la ventana de anuncios (mismo rango que la modal de
    // eliminatorias). Compara instantes UTC → no depende de la zona del navegador.
    if (!dentroVentanaAnuncio(Date.now())) return;
    let vistas = 2; // si no podemos leer storage (Safari privado), no insistimos
    try {
      vistas = Number(localStorage.getItem(clave)) || 0;
    } catch {
      vistas = 2;
    }
    if (vistas >= 2) return;
    // Deja que el Sheet termine de abrir antes de aparecer (se siente mejor).
    const t = setTimeout(() => {
      setVisible(true);
      // Cuenta esta aparición. Releemos el valor fresco para no pisar concurrencia.
      try {
        const previas = Number(localStorage.getItem(clave)) || 0;
        localStorage.setItem(clave, String(previas + 1));
      } catch {
        // Si no se puede persistir, igual lo mostramos.
      }
    }, 480);
    return () => clearTimeout(t);
  }, [clave]);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-30 grid animate-fade-in place-items-center rounded-t-2xl bg-clay-900/60 p-5 sm:rounded-2xl"
      onClick={() => setVisible(false)}
    >
      <div
        className="w-full max-w-xs animate-pop rounded-2xl border border-border bg-card p-5 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mini-demo: el partido "más reciente" entra por abajo y sube al tope
            de la lista, en bucle. Muestra el cambio de orden de un vistazo. */}
        <div className="relative mx-auto mb-3 h-[4.75rem] w-40 overflow-hidden rounded-xl bg-sunken ring-1 ring-inset ring-border">
          {/* Filas "anteriores" (estáticas, atenuadas) */}
          <span className="absolute inset-x-2 top-7 h-4 rounded-md bg-border" />
          <span className="absolute inset-x-2 top-[3.25rem] h-4 rounded-md bg-border" />
          {/* Fila "más reciente": sube de abajo hacia el tope */}
          <span className="absolute inset-x-2 top-1 flex h-4 items-center gap-1 rounded-md bg-primary px-1.5 shadow-sm motion-safe:animate-sube-reciente">
            <ArrowDownUp
              className="size-2.5 shrink-0 text-primary-foreground"
              aria-hidden
            />
            <span className="h-1 flex-1 rounded-full bg-primary-foreground" />
          </span>
        </div>
        <span className="mb-2 inline-block rounded-pill bg-primary px-2.5 py-0.5 text-2xs font-extrabold uppercase tracking-wide text-primary-foreground">
          Nuevo
        </span>
        <h3 className="text-base font-black text-fg-strong">
          Los partidos más recientes primero
        </h3>
        <p className="mt-1 text-sm text-fg-muted">
          Ahora verás los partidos más recientes arriba y los anteriores abajo.
        </p>
        <Button onClick={() => setVisible(false)} className="mt-4 w-full">
          ¡Entendido!
        </Button>
      </div>
    </div>
  );
}

export function DetalleParticipante({
  abierto,
  onOpenChange,
  fila,
  grupoId,
  partidos,
  reglas,
  esSuperadmin = false,
}: {
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
  fila: FilaTablaPosiciones | null;
  grupoId: string;
  partidos: Partido[];
  reglas: ReglasGrupo;
  /** Super-admin de plataforma: único que ve el botón de exportar a Excel. */
  esSuperadmin?: boolean;
}) {
  const { data, isLoading, isError } = usePrediccionesParticipante(
    grupoId,
    fila?.participante_id ?? null,
    abierto,
  );

  const { data: bonosData } = useBonosFaseParticipante(
    fila?.participante_id ?? null,
    abierto,
  );

  // Bonos de fase ganados, ordenados de fase menos a más avanzada.
  const bonos = useMemo(
    () =>
      (bonosData ?? [])
        .slice()
        .sort((a, b) => ORDEN_FASE[a.fase] - ORDEN_FASE[b.fase]),
    [bonosData],
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
        // Solo partidos finalizados: los "en juego" ya cerraron la apuesta pero
        // aún no tienen marcador real, así que aparecerían con un "null-null".
        if (partido.estado !== "finalizado") {
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
          equipo_avanza_id: pp.equipo_avanza_id,
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

  // Para mostrar: los partidos más recientes primero (los anteriores, abajo).
  // `items` viene ascendente (el export lo usa en cronología); aquí invertimos una
  // copia. Como `agruparPorDia` conserva el orden de entrada, los días salen del
  // más reciente al más antiguo y, dentro de cada día, también recientes primero.
  const dias = useMemo(
    () =>
      agruparPorDia(
        items
          .slice()
          .reverse()
          .map((it) => ({ ...it, fecha_hora: it.partido.fecha_hora })),
      ),
    [items],
  );

  const posicion = fila?.posicion ?? 0;
  const esTop3 = posicion >= 1 && posicion <= 3;

  // Exportar el detalle a Excel para validar la suma de puntos. Solo cuando ya
  // hay datos cargados que exportar (partidos o bonos).
  const [exportando, setExportando] = useState(false);
  // Solo el super-admin de plataforma puede exportar (herramienta de validación,
  // no de cara al participante). Además requiere que ya haya datos cargados.
  const puedeExportar =
    esSuperadmin &&
    !isLoading &&
    !isError &&
    (items.length > 0 || bonos.length > 0);
  const exportar = async () => {
    if (!fila || exportando) return;
    setExportando(true);
    try {
      await exportarDetalleParticipante({ fila, items, bonos, reglas });
    } catch {
      toast.error("No se pudo generar el Excel. Intenta de nuevo.");
    } finally {
      setExportando(false);
    }
  };

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
              {/* Exportar a Excel (.xlsx): herramienta del super-admin para
                  validar la suma de puntos. Estilo de "acción de admin":
                  pastilla con borde y tinte de marca (tokens primarios → se
                  adaptan solos al tema oscuro). */}
              {puedeExportar && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={exportar}
                  disabled={exportando}
                  className="h-8 self-center gap-1.5 rounded-pill border-primary/30 bg-primary-soft px-3.5 text-xs font-bold text-primary shadow-sm hover:border-primary/40 hover:bg-primary-soft hover:brightness-95"
                >
                  {exportando ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-3.5" aria-hidden />
                  )}
                  {exportando ? "Generando…" : "Exportar a Excel"}
                </Button>
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
              ) : items.length === 0 && bonos.length === 0 ? (
                <EmptyState
                  icono={Target}
                  titulo="Aún no hay partidos jugados"
                  descripcion="El detalle se llena cuando se cierren y finalicen los partidos."
                  className="m-3"
                />
              ) : (
                <div className="space-y-3 py-2">
                  {bonos.length > 0 && (
                    <section>
                      <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5">
                        <Award
                          className="size-3.5 shrink-0 text-fg-subtle"
                          aria-hidden
                        />
                        <h3 className="text-2xs font-extrabold uppercase tracking-wide text-fg-subtle">
                          Bonos de fase
                        </h3>
                      </div>
                      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border">
                        {bonos.map((bono) => (
                          <li
                            key={bono.fase}
                            className="flex min-h-12 items-center justify-between gap-2 px-3 py-2"
                          >
                            <span className="flex items-center gap-2 text-sm font-bold text-fg-strong">
                              <Award
                                className="size-4 shrink-0 text-[#F59E0B]"
                                aria-hidden
                              />
                              {ETIQUETA_FASE[bono.fase]}
                            </span>
                            <span className="shrink-0 rounded-pill bg-[#FCD34D]/20 px-2.5 py-1 text-sm font-black tabular-nums text-[#92600A] ring-1 ring-[#F59E0B]/40">
                              +{bono.puntos}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
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

            {/* Avisito del nuevo orden (máx 2 veces por polla), sobre el detalle. */}
            <AvisoOrdenReciente grupoId={grupoId} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
