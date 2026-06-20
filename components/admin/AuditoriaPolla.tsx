"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Clock,
  History,
  Pencil,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { MovimientoAuditoria } from "@/lib/queries/auditoria";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { EmptyState } from "@/components/shared/EmptyState";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { Flag } from "@/components/shared/Flag";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  movimientos: MovimientoAuditoria[];
};

const TODOS = "todos";

/** Cuántos expedientes se pintan por lote en el scroll incremental. */
const LOTE = 16;

/** Normaliza para buscar sin tildes ni mayúsculas (es-CO). */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Una predicción concreta (un usuario en un partido) con toda su evolución de
 * marcador. Es la unidad que mostramos: marcador actual + historial de cambios.
 */
type Expediente = {
  key: string;
  usuario_id: string | null;
  usuario_nombre: string;
  partido_id: string;
  partido_numero: number | null;
  partido_label: string;
  local_iso: string | null;
  visitante_iso: string | null;
  /** Del más reciente al más antiguo. */
  movimientos: MovimientoAuditoria[];
  /** Marcador vigente; null si la predicción fue eliminada. */
  actual: { local: number; visitante: number } | null;
  numModificaciones: number;
  ultimaFecha: string;
};

/** Etiqueta breve del partido (solo el número); los equipos se ven en el
 * marcador. */
function EtiquetaPartido({ e }: { e: Expediente }) {
  return (
    <p className="t-caption truncate text-fg-muted">
      {e.partido_numero != null ? `Partido #${e.partido_numero}` : "Partido"}
    </p>
  );
}

/**
 * Agrupa los movimientos planos en expedientes (usuario + partido), derivando el
 * marcador actual y cuántas veces se modificó.
 */
function agruparEnExpedientes(movs: MovimientoAuditoria[]): Expediente[] {
  const mapa = new Map<string, MovimientoAuditoria[]>();
  for (const m of movs) {
    const key = `${m.participante_id}__${m.partido_id}`;
    const lista = mapa.get(key);
    if (lista) lista.push(m);
    else mapa.set(key, [m]);
  }

  const expedientes: Expediente[] = [];
  for (const [key, lista] of mapa) {
    lista.sort((a, b) => b.creado_en.localeCompare(a.creado_en));
    const reciente = lista[0];
    const actual =
      reciente.accion === "delete"
        ? null
        : reciente.goles_local_nuevo != null &&
            reciente.goles_visitante_nuevo != null
          ? {
              local: reciente.goles_local_nuevo,
              visitante: reciente.goles_visitante_nuevo,
            }
          : null;
    expedientes.push({
      key,
      usuario_id: reciente.usuario_id,
      usuario_nombre:
        reciente.usuario_nombre ?? reciente.usuario_email ?? "Usuario desconocido",
      partido_id: reciente.partido_id,
      partido_numero: reciente.partido_numero,
      partido_label: reciente.partido_label,
      local_iso: reciente.equipo_local_iso,
      visitante_iso: reciente.equipo_visitante_iso,
      movimientos: lista,
      actual,
      numModificaciones: lista.filter((m) => m.accion === "update").length,
      ultimaFecha: reciente.creado_en,
    });
  }
  return expedientes;
}

/**
 * Auditoría de marcadores de una polla. Vista por "expediente": cada predicción
 * (usuario + partido) muestra su marcador actual y abre el historial completo de
 * cambios en un panel (Sheet) con espacio de sobra, ideal en móvil. Filtros por
 * usuario y partido + atajo "solo modificadas".
 */
export function AuditoriaPolla({ movimientos }: Props) {
  const [usuarioId, setUsuarioId] = useState<string>(TODOS);
  const [partidoId, setPartidoId] = useState<string>(TODOS);
  const [soloModificadas, setSoloModificadas] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const usuarios = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const m of movimientos) {
      if (m.usuario_id) {
        mapa.set(m.usuario_id, m.usuario_nombre ?? m.usuario_email ?? "Sin nombre");
      }
    }
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [movimientos]);

  const partidos = useMemo(() => {
    const mapa = new Map<string, { label: string; numero: number | null }>();
    for (const m of movimientos) {
      if (!mapa.has(m.partido_id)) {
        mapa.set(m.partido_id, { label: m.partido_label, numero: m.partido_numero });
      }
    }
    return [...mapa.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  }, [movimientos]);

  const expedientes = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const filtrados = movimientos.filter(
      (m) =>
        (usuarioId === TODOS || m.usuario_id === usuarioId) &&
        (partidoId === TODOS || m.partido_id === partidoId),
    );
    return agruparEnExpedientes(filtrados)
      .filter((e) => !soloModificadas || e.numModificaciones > 0)
      .filter((e) => {
        if (!q) return true;
        // Busca por nombre de usuario, equipos del partido y número de partido.
        const heno = normalizar(
          `${e.usuario_nombre} ${e.partido_label} ${
            e.partido_numero != null ? `#${e.partido_numero}` : ""
          }`,
        );
        return heno.includes(q);
      })
      // Orden puro por fecha del último movimiento: lo más reciente arriba. Una
      // predicción recién modificada sube sola (su último movimiento es reciente).
      .sort((a, b) => b.ultimaFecha.localeCompare(a.ultimaFecha));
  }, [movimientos, usuarioId, partidoId, soloModificadas, busqueda]);

  const totalModificadas = useMemo(
    () => agruparEnExpedientes(movimientos).filter((e) => e.numModificaciones > 0).length,
    [movimientos],
  );

  const hayFiltro =
    usuarioId !== TODOS || partidoId !== TODOS || soloModificadas || busqueda.trim() !== "";

  const limpiarFiltros = () => {
    setUsuarioId(TODOS);
    setPartidoId(TODOS);
    setSoloModificadas(false);
    setBusqueda("");
  };

  // Ventana incremental: solo pintamos `visibles` expedientes y vamos sumando
  // lotes a medida que el usuario hace scroll. Evita montar cientos de tarjetas
  // (avatares + banderas + sheets) de golpe, que es lo que volvía lenta la vista.
  const [visibles, setVisibles] = useState(LOTE);

  // Cualquier cambio de filtro vuelve a arrancar la ventana desde el primer lote.
  // Patrón de React: ajustar estado en render al detectar el cambio (sin effect).
  const filtroKey = `${usuarioId}|${partidoId}|${soloModificadas}|${busqueda}`;
  const [filtroPrevio, setFiltroPrevio] = useState(filtroKey);
  if (filtroPrevio !== filtroKey) {
    setFiltroPrevio(filtroKey);
    setVisibles(LOTE);
  }

  const sentinelaRef = useRef<HTMLDivElement | null>(null);
  const total = expedientes.length;
  useEffect(() => {
    const el = sentinelaRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setVisibles((v) => Math.min(v + LOTE, total));
        }
      },
      // Precarga el siguiente lote antes de llegar al fondo (scroll fluido).
      { rootMargin: "600px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [total]);

  const mostrados = expedientes.slice(0, visibles);
  const hayMas = visibles < total;

  if (movimientos.length === 0) {
    return (
      <EmptyState
        icono={History}
        titulo="Sin movimientos"
        descripcion="Esta polla todavía no registra guardados de marcador."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="surface-card space-y-3 rounded-2xl p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-fg-muted">
            <SlidersHorizontal className="size-3.5" aria-hidden />
            <span className="t-caption font-semibold">Filtros</span>
          </div>
          {hayFiltro && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="t-caption inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-fg-muted transition-colors hover:bg-sunken hover:text-fg-strong"
            >
              <X className="size-3.5" aria-hidden />
              Limpiar
            </button>
          )}
        </div>

        {/* Búsqueda libre por usuario o partido */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden
          />
          <Input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por usuario o partido…"
            aria-label="Buscar en la auditoría"
            autoComplete="off"
            className="h-11 rounded-xl pl-9 pr-9"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-1 top-1/2 grid h-11 w-10 -translate-y-1/2 place-items-center rounded-full text-fg-subtle transition-colors hover:text-fg-strong"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="t-caption text-fg-muted">Usuario</span>
            <select
              value={usuarioId}
              onChange={(e) => setUsuarioId(e.target.value)}
              className="h-11 rounded-xl border border-border bg-surface px-3 text-base text-fg-strong"
            >
              <option value={TODOS}>Todos los usuarios ({usuarios.length})</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="t-caption text-fg-muted">Partido</span>
            <select
              value={partidoId}
              onChange={(e) => setPartidoId(e.target.value)}
              className="h-11 rounded-xl border border-border bg-surface px-3 text-base text-fg-strong"
            >
              <option value={TODOS}>Todos los partidos ({partidos.length})</option>
              {partidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero != null ? `#${p.numero} · ` : ""}
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Atajo: solo predicciones que tuvieron cambios */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSoloModificadas(false)}
            aria-pressed={!soloModificadas}
            className={cn(
              "h-11 rounded-full px-4 text-sm font-semibold transition-colors",
              !soloModificadas
                ? "bg-primary text-primary-foreground"
                : "bg-sunken text-fg-muted",
            )}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setSoloModificadas(true)}
            aria-pressed={soloModificadas}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
              soloModificadas
                ? "bg-primary text-primary-foreground"
                : "bg-sunken text-fg-muted",
            )}
          >
            <Pencil className="size-3.5" aria-hidden />
            Solo modificadas
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 text-2xs font-bold tabular-nums",
                soloModificadas ? "bg-white/25" : "bg-card text-fg-muted",
              )}
            >
              {totalModificadas}
            </span>
          </button>
        </div>
      </div>

      {/* Resultados: una columna a todo el ancho del contenedor */}
      {expedientes.length === 0 ? (
        <EmptyState
          icono={History}
          titulo={soloModificadas ? "Ninguna modificada" : "Nada para ese filtro"}
          descripcion={
            soloModificadas
              ? "Con los filtros actuales no hay predicciones que se hayan cambiado."
              : "Prueba con otro usuario o partido."
          }
        />
      ) : (
        <>
          <p className="t-caption text-fg-muted">
            {hayMas ? `${mostrados.length} de ${total}` : total}{" "}
            {total === 1 ? "predicción" : "predicciones"}
          </p>
          <div className="space-y-2.5">
            {mostrados.map((e) => (
              <ExpedienteCard key={e.key} e={e} />
            ))}
          </div>

          {/* Centinela: al entrar en viewport carga el siguiente lote. */}
          {hayMas && (
            <div
              ref={sentinelaRef}
              className="flex items-center justify-center gap-2 py-4 text-fg-muted"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-fg-subtle" aria-hidden />
              <span className="t-caption">Cargando más…</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Marcador actual destacado: una fila por equipo (bandera · nombre · goles),
 * o "Eliminada" si la predicción ya no existe. Los nombres salen de
 * `partido_label` ("Local vs Visitante"). */
function MarcadorActual({
  e,
  size = "md",
}: {
  e: Expediente;
  size?: "md" | "lg";
}) {
  const eliminada = e.actual === null;
  const local = eliminada
    ? e.movimientos[0].goles_local_anterior
    : e.actual!.local;
  const visitante = eliminada
    ? e.movimientos[0].goles_visitante_anterior
    : e.actual!.visitante;
  const partes = e.partido_label.split(" vs ");
  const nombreLocal = partes[0] ?? "";
  const nombreVisitante = partes[1] ?? "";
  const flagSize = size === "lg" ? 18 : 15;

  const fila = (nombre: string, iso: string | null, goles: number | null) => (
    <div className="flex items-center gap-2">
      <Flag code={iso} size={flagSize} className="shrink-0" />
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-semibold",
          size === "lg" ? "text-sm" : "text-xs",
          eliminada ? "text-destructive" : "text-fg-strong",
        )}
      >
        {nombre}
      </span>
      <span
        className={cn(
          "shrink-0 font-mono font-extrabold tabular-nums",
          size === "lg" ? "text-2xl" : "text-lg",
          eliminada ? "text-destructive line-through" : "text-primary",
        )}
      >
        {goles ?? "—"}
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-1 rounded-xl px-3 py-2",
        size === "lg" ? "w-56" : "w-36",
        eliminada ? "bg-destructive-soft" : "bg-primary-soft",
      )}
    >
      <span
        className={cn(
          "text-2xs font-bold uppercase tracking-wide",
          eliminada ? "text-destructive" : "text-primary",
        )}
      >
        {eliminada ? "Eliminada" : "Actual"}
      </span>
      {fila(nombreLocal, e.local_iso, local)}
      {fila(nombreVisitante, e.visitante_iso, visitante)}
    </div>
  );
}

/**
 * Tarjeta-resumen de una predicción (ancho completo). Muestra usuario, partido y
 * marcador actual; al tocarla abre el historial completo en un panel.
 */
function ExpedienteCard({ e }: { e: Expediente }) {
  const [abierto, setAbierto] = useState(false);
  // El Sheet (Radix Dialog) solo se monta tras el primer toque; luego se queda
  // montado para que la animación de cierre funcione. Así no cargamos cientos de
  // sheets en una lista larga.
  const [montado, setMontado] = useState(false);
  const modificada = e.numModificaciones > 0;

  const abrir = () => {
    setMontado(true);
    setAbierto(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="surface-card hover-lift flex w-full items-start gap-3 rounded-2xl p-3.5 text-left sm:items-center"
      >
        <AvatarNotion nombre={e.usuario_nombre} size="md" />

        <div className="min-w-0 flex-1">
          {/* Encabezado: usuario + partido */}
          <p className="t-body truncate font-semibold text-fg-strong">
            {e.usuario_nombre}
          </p>
          <EtiquetaPartido e={e} />

          {/* Marcador (solo móvil, debajo) + estado. En desktop el marcador se
              muestra a la derecha de la tarjeta para aprovechar el ancho. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="sm:hidden">
              <MarcadorActual e={e} />
            </div>
            {modificada ? (
              <Badge variant="secondary" className="whitespace-nowrap">
                <Pencil className="size-3" aria-hidden />
                Modificada {e.numModificaciones}{" "}
                {e.numModificaciones === 1 ? "vez" : "veces"}
              </Badge>
            ) : (
              <span className="t-caption text-fg-subtle">Sin modificaciones</span>
            )}
          </div>

          {/* Fecha del último movimiento (mismo valor con que se ordena la lista). */}
          <p className="t-caption mt-1.5 inline-flex items-center gap-1 text-fg-muted">
            <Clock className="size-3" aria-hidden />
            Último movimiento: {formatearFechaHoraBogota(e.ultimaFecha)}
          </p>
        </div>

        {/* Marcador a la derecha (solo desktop): aprovecha el ancho de la tarjeta. */}
        <div className="hidden shrink-0 sm:block">
          <MarcadorActual e={e} />
        </div>

        <ChevronRight
          className="mt-0.5 size-5 shrink-0 self-start text-fg-subtle sm:mt-0 sm:self-center"
          aria-hidden
        />
      </button>

      {montado && (
        <HistorialSheet e={e} abierto={abierto} onOpenChange={setAbierto} />
      )}
    </>
  );
}

/** Panel con la evolución completa de una predicción. Bottom sheet en móvil,
 * diálogo centrado en desktop (mismo patrón que el resto de la app). */
function HistorialSheet({
  e,
  abierto,
  onOpenChange,
}: {
  e: Expediente;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex max-h-[85dvh] flex-col p-0",
          "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl sm:border",
        )}
      >
        <SheetHeader className="gap-3 border-b border-border p-4">
          <div className="flex items-center gap-3 pr-8">
            <AvatarNotion nombre={e.usuario_nombre} size="md" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">
                {e.usuario_nombre}
              </SheetTitle>
              <EtiquetaPartido e={e} />
            </div>
            <MarcadorActual e={e} size="lg" />
          </div>
          <p className="t-caption text-fg-muted">
            {e.numModificaciones > 0
              ? `Modificada ${e.numModificaciones} ${e.numModificaciones === 1 ? "vez" : "veces"} · ${e.movimientos.length} ${e.movimientos.length === 1 ? "registro" : "registros"}`
              : "Sin modificaciones desde que se guardó"}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-safe">
          <ol className="space-y-3">
            {e.movimientos.map((m, i) => (
              <PasoEvolucion
                key={m.id}
                m={m}
                esUltimo={i === e.movimientos.length - 1}
              />
            ))}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Chip de marcador con banderas, para el historial de cambios. */
function ChipMarcador({
  local,
  visitante,
  isoLocal,
  isoVisitante,
  variante,
}: {
  local: number | null;
  visitante: number | null;
  isoLocal: string | null;
  isoVisitante: string | null;
  variante: "anterior" | "nuevo" | "neutral" | "eliminado";
}) {
  const estilo = {
    anterior: "bg-sunken text-fg-muted",
    nuevo: "bg-primary-soft font-bold text-primary",
    neutral: "bg-sunken font-bold text-fg-strong",
    eliminado: "bg-destructive-soft text-destructive",
  }[variante];
  const tachado = variante === "anterior" || variante === "eliminado";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-sm tabular-nums",
        estilo,
      )}
    >
      <Flag code={isoLocal} size={12} className="shrink-0" />
      <span className={tachado ? "line-through" : undefined}>
        {local ?? "—"}-{visitante ?? "—"}
      </span>
      <Flag code={isoVisitante} size={12} className="shrink-0" />
    </span>
  );
}

/** Un paso de la evolución (un movimiento) dentro del historial. */
function PasoEvolucion({
  m,
  esUltimo,
}: {
  m: MovimientoAuditoria;
  esUltimo: boolean;
}) {
  const esUpdate = m.accion === "update";
  const esDelete = m.accion === "delete";

  return (
    <li className="flex gap-3">
      {/* Riel de línea de tiempo */}
      <div className="flex flex-col items-center pt-1.5">
        <span
          className={cn(
            "size-3 shrink-0 rounded-full",
            esUpdate
              ? "bg-primary"
              : esDelete
                ? "bg-destructive"
                : "bg-fg-subtle",
          )}
          aria-hidden
        />
        {!esUltimo && <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
      </div>

      {/* Contenido del paso */}
      <div className="min-w-0 flex-1 pb-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="t-body font-semibold text-fg-strong">
            {m.accion === "inicial"
              ? "Estado inicial"
              : m.accion === "insert"
                ? "Guardó"
                : esUpdate
                  ? "Modificó"
                  : "Eliminó"}
          </span>

          {esUpdate ? (
            <span className="inline-flex items-center gap-1.5">
              <ChipMarcador
                local={m.goles_local_anterior}
                visitante={m.goles_visitante_anterior}
                isoLocal={m.equipo_local_iso}
                isoVisitante={m.equipo_visitante_iso}
                variante="anterior"
              />
              <span className="text-fg-subtle" aria-hidden>
                →
              </span>
              <ChipMarcador
                local={m.goles_local_nuevo}
                visitante={m.goles_visitante_nuevo}
                isoLocal={m.equipo_local_iso}
                isoVisitante={m.equipo_visitante_iso}
                variante="nuevo"
              />
            </span>
          ) : esDelete ? (
            <ChipMarcador
              local={m.goles_local_anterior}
              visitante={m.goles_visitante_anterior}
              isoLocal={m.equipo_local_iso}
              isoVisitante={m.equipo_visitante_iso}
              variante="eliminado"
            />
          ) : (
            <ChipMarcador
              local={m.goles_local_nuevo}
              visitante={m.goles_visitante_nuevo}
              isoLocal={m.equipo_local_iso}
              isoVisitante={m.equipo_visitante_iso}
              variante="neutral"
            />
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="t-caption inline-flex items-center gap-1 text-fg-muted">
            <Clock className="size-3" aria-hidden />
            {formatearFechaHoraBogota(m.creado_en)}
          </span>
          <Actor m={m} />
        </div>
      </div>
    </li>
  );
}

/** Quién ejecutó el cambio: el propio usuario, un admin o el sistema. */
function Actor({ m }: { m: MovimientoAuditoria }) {
  if (m.accion === "inicial") return null;
  if (m.actor_es_admin && !m.actor_es_dueno) {
    return (
      <span className="t-caption inline-flex items-center gap-1 font-semibold text-warning">
        <ShieldAlert className="size-3" aria-hidden />
        por admin{m.actor_nombre ? ` (${m.actor_nombre})` : ""}
      </span>
    );
  }
  if (m.actor_es_dueno) {
    return <span className="t-caption text-fg-subtle">· por el mismo usuario</span>;
  }
  if (m.actor_nombre) {
    return <span className="t-caption text-fg-subtle">· por {m.actor_nombre}</span>;
  }
  return <span className="t-caption text-fg-subtle">· por el sistema</span>;
}
