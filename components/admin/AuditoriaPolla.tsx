"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Clock,
  History,
  Pencil,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import type { MovimientoAuditoria } from "@/lib/queries/auditoria";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { EmptyState } from "@/components/shared/EmptyState";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { Badge } from "@/components/ui/badge";
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
  /** Del más reciente al más antiguo. */
  movimientos: MovimientoAuditoria[];
  /** Marcador vigente; null si la predicción fue eliminada. */
  actual: { local: number; visitante: number } | null;
  numModificaciones: number;
  ultimaFecha: string;
};

function fmt(local: number | null, visitante: number | null): string {
  if (local == null || visitante == null) return "—";
  return `${local}-${visitante}`;
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
    const filtrados = movimientos.filter(
      (m) =>
        (usuarioId === TODOS || m.usuario_id === usuarioId) &&
        (partidoId === TODOS || m.partido_id === partidoId),
    );
    return agruparEnExpedientes(filtrados)
      .filter((e) => !soloModificadas || e.numModificaciones > 0)
      .sort((a, b) => {
        if ((b.numModificaciones > 0 ? 1 : 0) !== (a.numModificaciones > 0 ? 1 : 0)) {
          return (b.numModificaciones > 0 ? 1 : 0) - (a.numModificaciones > 0 ? 1 : 0);
        }
        return b.ultimaFecha.localeCompare(a.ultimaFecha);
      });
  }, [movimientos, usuarioId, partidoId, soloModificadas]);

  const totalModificadas = useMemo(
    () => agruparEnExpedientes(movimientos).filter((e) => e.numModificaciones > 0).length,
    [movimientos],
  );

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
      <div className="surface-card rounded-2xl p-3">
        <div className="mb-2 flex items-center gap-1.5 text-fg-muted">
          <SlidersHorizontal className="size-3.5" aria-hidden />
          <span className="t-caption font-semibold">Filtros</span>
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
        <div className="mt-2 flex flex-wrap items-center gap-2">
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
            {expedientes.length}{" "}
            {expedientes.length === 1 ? "predicción" : "predicciones"}
          </p>
          <div className="space-y-2.5">
            {expedientes.map((e) => (
              <ExpedienteCard key={e.key} e={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Marcador actual destacado (o "Eliminada" si la predicción ya no existe). */
function MarcadorActual({
  e,
  size = "md",
}: {
  e: Expediente;
  size?: "md" | "lg";
}) {
  const eliminada = e.actual === null;
  const valor = eliminada
    ? fmt(
        e.movimientos[0].goles_local_anterior,
        e.movimientos[0].goles_visitante_anterior,
      )
    : fmt(e.actual!.local, e.actual!.visitante);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1.5 text-center",
        size === "lg" ? "min-w-24" : "min-w-16",
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
      <span
        className={cn(
          "font-mono font-extrabold tabular-nums",
          size === "lg" ? "text-4xl" : "text-2xl",
          eliminada ? "text-destructive line-through" : "text-primary",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

/**
 * Tarjeta-resumen de una predicción (ancho completo). Muestra usuario, partido y
 * marcador actual; al tocarla abre el historial completo en un panel.
 */
function ExpedienteCard({ e }: { e: Expediente }) {
  const [abierto, setAbierto] = useState(false);
  const modificada = e.numModificaciones > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="surface-card hover-lift flex w-full items-center gap-3 rounded-2xl p-3.5 text-left"
      >
        <AvatarNotion nombre={e.usuario_nombre} size="md" />

        <div className="min-w-0 flex-1">
          <p className="t-body truncate font-semibold text-fg-strong">
            {e.usuario_nombre}
          </p>
          <p className="t-caption truncate text-fg-muted">
            {e.partido_numero != null ? `#${e.partido_numero} · ` : ""}
            {e.partido_label}
          </p>
          <div className="mt-1">
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
        </div>

        <MarcadorActual e={e} />
        <ChevronRight className="size-5 shrink-0 text-fg-subtle" aria-hidden />
      </button>

      <HistorialSheet e={e} abierto={abierto} onOpenChange={setAbierto} />
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
              <p className="t-caption truncate text-fg-muted">
                {e.partido_numero != null ? `#${e.partido_numero} · ` : ""}
                {e.partido_label}
              </p>
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
              <span className="rounded-md bg-sunken px-2 py-0.5 font-mono text-sm text-fg-muted line-through tabular-nums">
                {fmt(m.goles_local_anterior, m.goles_visitante_anterior)}
              </span>
              <span className="text-fg-subtle" aria-hidden>
                →
              </span>
              <span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-sm font-bold text-primary tabular-nums">
                {fmt(m.goles_local_nuevo, m.goles_visitante_nuevo)}
              </span>
            </span>
          ) : esDelete ? (
            <span className="rounded-md bg-destructive-soft px-2 py-0.5 font-mono text-sm text-destructive line-through tabular-nums">
              {fmt(m.goles_local_anterior, m.goles_visitante_anterior)}
            </span>
          ) : (
            <span className="rounded-md bg-sunken px-2 py-0.5 font-mono text-sm font-bold text-fg-strong tabular-nums">
              {fmt(m.goles_local_nuevo, m.goles_visitante_nuevo)}
            </span>
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
