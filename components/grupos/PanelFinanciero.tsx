"use client";

import { useMemo, useState } from "react";
import {
  PiggyBank,
  Search,
  Users,
  Wallet,
  CircleDollarSign,
  Trophy,
  CheckCircle2,
  Clock3,
  CircleDashed,
  ChevronRight,
} from "lucide-react";
import type { Participante } from "@/lib/types/dominio";
import { usePagosGrupo } from "@/lib/queries/pagos";
import { formatearMonto } from "@/lib/utils/texto";
import { cn } from "@/lib/utils";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { GestionPago } from "@/components/grupos/GestionPago";
import { BuscadorComprobante } from "@/components/grupos/BuscadorComprobante";

type EstadoFin = "pagado" | "parcial" | "pendiente";
type Filtro = "todos" | EstadoFin;

/** Porcentajes de reparto del pozo (1.º/2.º/3.º lugar). */
type Premios = { primero: number; segundo: number; tercero: number };

type Props = {
  grupoId: string;
  grupoNombre: string;
  participantes: Participante[];
  valorApuesta: number;
  premios: Premios;
  /** % del pozo reservado a administración (se descuenta antes de repartir). */
  porcentajeAdmin: number;
};

/** Normaliza para búsqueda: minúsculas y sin acentos. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Metadatos visuales de cada estado de pago. */
const META: Record<
  EstadoFin,
  {
    label: string;
    badge: "success" | "gold" | "neutral";
    icon: typeof CheckCircle2;
    /** Clases de color para texto/acento del estado. */
    text: string;
    bar: string;
    ring: string;
  }
> = {
  pagado: {
    label: "Pagados",
    badge: "success",
    icon: CheckCircle2,
    text: "text-success",
    bar: "bg-success",
    ring: "ring-success/30",
  },
  parcial: {
    label: "Parciales",
    badge: "gold",
    icon: Clock3,
    text: "text-warning",
    bar: "bg-warning",
    ring: "ring-warning/30",
  },
  pendiente: {
    label: "Pendientes",
    badge: "neutral",
    icon: CircleDashed,
    text: "text-fg-muted",
    bar: "bg-fg-subtle",
    ring: "ring-border-strong",
  },
};

/** Una fila por participante ya con su estado y monto resuelto. */
type FilaFin = {
  participante: Participante;
  estado: EstadoFin;
  abonado: number;
  /** % del valor de la apuesta cubierto (0–100). */
  pct: number;
};

/**
 * Panel de la sub-pestaña "Financiero" (solo admin). Reemplaza el resumen plano
 * por un tablero con: pozo (recaudo vs esperado en un anillo), reparto del premio,
 * desglose por estado que filtra, y el listado de cada participante con su saldo
 * y acceso a registrar/ver abonos. Los montos solo los devuelve el RPC al admin
 * (CLAUDE.md §3.4); la privacidad queda garantizada en el servidor.
 */
export function PanelFinanciero({
  grupoId,
  grupoNombre,
  participantes,
  valorApuesta,
  premios,
  porcentajeAdmin,
}: Props) {
  const { data: totales, isLoading } = usePagosGrupo(grupoId, true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  // Estado + monto por participante, acotado al valor de la apuesta.
  const filas = useMemo<FilaFin[]>(() => {
    return participantes.map((p) => {
      // Mientras carga el total real, se estima desde el boolean `pago_realizado`
      // (mismo criterio que el listado) para no mostrar "todos pendientes".
      const bruto = totales?.get(p.id) ?? (p.pago_realizado ? valorApuesta : 0);
      const abonado = Math.min(bruto, valorApuesta);
      const estado: EstadoFin =
        abonado >= valorApuesta
          ? "pagado"
          : abonado > 0
            ? "parcial"
            : "pendiente";
      const pct =
        valorApuesta > 0
          ? Math.min(100, Math.round((abonado / valorApuesta) * 100))
          : 0;
      return { participante: p, estado, abonado, pct };
    });
  }, [participantes, totales, valorApuesta]);

  // Agregados del pozo y conteos/montos por estado.
  const resumen = useMemo(() => {
    const esperado = valorApuesta * participantes.length;
    let recaudado = 0;
    const conteo = { pagado: 0, parcial: 0, pendiente: 0 };
    const monto = { pagado: 0, parcial: 0, pendiente: 0 };
    for (const f of filas) {
      recaudado += f.abonado;
      conteo[f.estado] += 1;
      monto[f.estado] += f.abonado;
    }
    const faltante = Math.max(0, esperado - recaudado);
    const pct =
      esperado > 0 ? Math.min(100, Math.round((recaudado / esperado) * 100)) : 0;
    // Pozo neto: lo repartible tras reservar la administración. Los premios se
    // calculan sobre este neto (no sobre el bruto).
    const admin = Math.round((esperado * porcentajeAdmin) / 100);
    const neto = Math.max(0, esperado - admin);
    return { esperado, recaudado, faltante, pct, conteo, monto, admin, neto };
  }, [filas, participantes.length, valorApuesta, porcentajeAdmin]);

  // Orden: pendientes primero (lo accionable), luego parciales, luego pagados;
  // alfabético dentro de cada grupo. Después se aplica búsqueda + filtro.
  const visibles = useMemo(() => {
    const peso: Record<EstadoFin, number> = {
      pendiente: 0,
      parcial: 1,
      pagado: 2,
    };
    const q = norm(busqueda.trim());
    return [...filas]
      .filter((f) => {
        if (filtro !== "todos" && f.estado !== filtro) return false;
        if (!q) return true;
        const u = f.participante.usuario;
        return (
          norm(u.nombre_completo).includes(q) ||
          (u.email ? norm(u.email).includes(q) : false)
        );
      })
      .sort((a, b) => {
        const d = peso[a.estado] - peso[b.estado];
        if (d !== 0) return d;
        return a.participante.usuario.nombre_completo.localeCompare(
          b.participante.usuario.nombre_completo,
          "es",
          { sensitivity: "base" },
        );
      });
  }, [filas, busqueda, filtro]);

  const hayPremios =
    premios.primero > 0 || premios.segundo > 0 || premios.tercero > 0;

  return (
    <div className="space-y-3">
      {/* ───────── Pozo: recaudo vs esperado ───────── */}
      <section className="surface-card overflow-hidden rounded-2xl border-strong p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <PiggyBank className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="t-h4 text-fg-strong">Pozo del grupo</p>
            <p className="t-caption text-fg-muted">
              Recaudo acumulado frente a lo esperado.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 sm:gap-6">
          <Anillo pct={resumen.pct} cargando={isLoading} />

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[28px] font-extrabold leading-none tabular-nums tracking-tight text-fg-strong sm:text-3xl",
                isLoading && "animate-pulse text-fg-subtle",
              )}
            >
              {formatearMonto(resumen.recaudado)}
            </p>
            <p className="t-body-sm mt-1 tabular-nums text-fg-muted">
              de {formatearMonto(resumen.esperado)} esperados
            </p>
            <p
              className={cn(
                "t-caption mt-2 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-semibold",
                resumen.faltante > 0
                  ? "bg-warning-soft text-warning"
                  : "bg-success-soft text-success",
              )}
            >
              {resumen.esperado <= 0
                ? "Sin valor de inscripción"
                : resumen.faltante > 0
                  ? `Faltan ${formatearMonto(resumen.faltante)}`
                  : "¡Recaudo completo! 🎉"}
            </p>
          </div>
        </div>

        {/* Métricas de contexto */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metrica
            icon={Users}
            etiqueta="Participantes"
            valor={String(participantes.length)}
          />
          <Metrica
            icon={CircleDollarSign}
            etiqueta="Por persona"
            valor={formatearMonto(valorApuesta)}
          />
          <Metrica
            icon={Wallet}
            etiqueta="Por cobrar"
            valor={formatearMonto(resumen.faltante)}
            acento={resumen.faltante > 0 ? "warning" : "success"}
          />
        </div>
      </section>

      {/* ───────── Reparto del pozo (si hay premios) ───────── */}
      {hayPremios && resumen.esperado > 0 && (
        <section className="surface-card rounded-2xl border-strong p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
              <Trophy className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="t-h4 text-fg-strong">Reparto del pozo</p>
              <p className="t-caption text-fg-muted">
                {porcentajeAdmin > 0
                  ? `Sobre ${formatearMonto(resumen.neto)} a repartir.`
                  : `Estimado sobre ${formatearMonto(resumen.esperado)} del pozo.`}
              </p>
            </div>
          </div>

          {/* Desglose bruto → administración → neto (solo si hay administración) */}
          {porcentajeAdmin > 0 && (
            <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-sunken p-3">
              <Linea etiqueta="Pozo bruto" valor={formatearMonto(resumen.esperado)} />
              <Linea
                etiqueta={`Administración (${porcentajeAdmin}%)`}
                valor={`− ${formatearMonto(resumen.admin)}`}
                tono="resta"
              />
              <div className="!mt-2 flex items-baseline justify-between gap-2 border-t border-border pt-2">
                <span className="t-caption font-bold text-fg-strong">
                  Pozo a repartir
                </span>
                <span className="text-sm font-extrabold tabular-nums text-success">
                  {formatearMonto(resumen.neto)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Premio
              medalla="🥇"
              etiqueta="1.º lugar"
              pct={premios.primero}
              monto={Math.round((resumen.neto * premios.primero) / 100)}
            />
            <Premio
              medalla="🥈"
              etiqueta="2.º lugar"
              pct={premios.segundo}
              monto={Math.round((resumen.neto * premios.segundo) / 100)}
            />
            <Premio
              medalla="🥉"
              etiqueta="3.º lugar"
              pct={premios.tercero}
              monto={Math.round((resumen.neto * premios.tercero) / 100)}
            />
          </div>
        </section>
      )}

      {/* ───────── Desglose por estado (también filtra el listado) ───────── */}
      <div className="grid grid-cols-3 gap-2">
        {(["pagado", "parcial", "pendiente"] as const).map((e) => (
          <ChipEstado
            key={e}
            estado={e}
            conteo={resumen.conteo[e]}
            monto={resumen.monto[e]}
            esperado={valorApuesta * resumen.conteo[e]}
            activo={filtro === e}
            onToggle={() => setFiltro((f) => (f === e ? "todos" : e))}
          />
        ))}
      </div>

      {/* ───────── Listado de participantes ───────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="overline text-fg-subtle">
            {filtro === "todos" ? "Todos" : META[filtro].label} ·{" "}
            {visibles.length}
          </p>
          {filtro !== "todos" && (
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className="t-caption font-semibold text-primary underline-offset-2 hover:underline"
            >
              Ver todos
            </button>
          )}
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden
          />
          <Input
            type="search"
            inputMode="search"
            aria-label="Buscar participante"
            placeholder="Buscar participante…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>

        {visibles.length === 0 ? (
          <EmptyState
            icono={Users}
            titulo="Sin resultados"
            descripcion="Nadie coincide con la búsqueda o el filtro."
          />
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {visibles.map((f) => (
              <FilaParticipante
                key={f.participante.id}
                fila={f}
                grupoId={grupoId}
                grupoNombre={grupoNombre}
                valorApuesta={valorApuesta}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ───────── Verificar comprobante ───────── */}
      <BuscadorComprobante />
    </div>
  );
}

/* ════════════════════════ Sub-componentes ════════════════════════ */

/** Anillo de progreso (SVG) con el % al centro. */
function Anillo({ pct, cargando }: { pct: number; cargando: boolean }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative grid size-[88px] shrink-0 place-items-center sm:size-24">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          stroke="currentColor"
          className="text-muted"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circ}
          strokeDashoffset={cargando ? circ : offset}
          className="text-primary transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-extrabold tabular-nums text-fg-strong">
        {pct}
        <span className="text-xs font-bold text-fg-muted">%</span>
      </span>
    </div>
  );
}

/** Mini-métrica de contexto del pozo. */
function Metrica({
  icon: Icon,
  etiqueta,
  valor,
  acento,
}: {
  icon: typeof Users;
  etiqueta: string;
  valor: string;
  acento?: "warning" | "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-sunken px-2.5 py-2">
      <div className="flex items-center gap-1 text-fg-subtle">
        <Icon className="size-3.5" aria-hidden />
        <span className="t-caption truncate">{etiqueta}</span>
      </div>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-bold tabular-nums",
          acento === "warning"
            ? "text-warning"
            : acento === "success"
              ? "text-success"
              : "text-fg-strong",
        )}
      >
        {valor}
      </p>
    </div>
  );
}

/** Tarjeta de un premio del reparto. */
function Premio({
  medalla,
  etiqueta,
  pct,
  monto,
}: {
  medalla: string;
  etiqueta: string;
  pct: number;
  monto: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-sunken px-2.5 py-2 text-center">
      <div className="text-base leading-none" aria-hidden>
        {medalla}
      </div>
      <p className="mt-1 truncate text-sm font-extrabold tabular-nums text-fg-strong">
        {formatearMonto(monto)}
      </p>
      <p className="t-caption text-fg-muted">
        {etiqueta} · {pct}%
      </p>
    </div>
  );
}

/** Renglón etiqueta → valor del desglose del pozo. */
function Linea({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string;
  valor: string;
  tono?: "resta";
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="t-caption text-fg-muted">{etiqueta}</span>
      <span
        className={cn(
          "text-sm tabular-nums",
          tono === "resta"
            ? "font-semibold text-destructive"
            : "font-bold text-fg-strong",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

/** Tarjeta-chip de un estado: conteo + monto, además filtra el listado. */
function ChipEstado({
  estado,
  conteo,
  monto,
  esperado,
  activo,
  onToggle,
}: {
  estado: EstadoFin;
  conteo: number;
  monto: number;
  esperado: number;
  activo: boolean;
  onToggle: () => void;
}) {
  const m = META[estado];
  const Icon = m.icon;
  // En pendientes el dato útil es lo que falta; en el resto, lo abonado.
  const detalle =
    estado === "pendiente"
      ? esperado > 0
        ? `Faltan ${formatearMonto(esperado)}`
        : "—"
      : formatearMonto(monto);
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onToggle}
      className={cn(
        "surface-card flex flex-col items-start gap-0.5 rounded-xl border p-2.5 text-left transition-all hover-lift",
        activo
          ? cn("border-strong ring-2", m.ring)
          : "border-border hover:border-strong",
      )}
    >
      <span className={cn("flex items-center gap-1", m.text)}>
        <Icon className="size-3.5" aria-hidden />
        <span className="t-caption font-bold">{m.label}</span>
      </span>
      <span className="text-xl font-extrabold tabular-nums text-fg-strong">
        {conteo}
      </span>
      <span className="t-caption truncate tabular-nums text-fg-muted">
        {detalle}
      </span>
    </button>
  );
}

/** Fila compacta del listado: una línea escaneable que abre la gestión de abonos. */
function FilaParticipante({
  fila,
  grupoId,
  grupoNombre,
  valorApuesta,
}: {
  fila: FilaFin;
  grupoId: string;
  grupoNombre: string;
  valorApuesta: number;
}) {
  const { participante: part, estado, abonado, pct } = fila;
  const m = META[estado];
  const falta = valorApuesta - abonado;
  return (
    <li>
      <GestionPago
        grupoId={grupoId}
        participanteId={part.id}
        nombre={part.usuario.nombre_completo}
        grupoNombre={grupoNombre}
        valorApuesta={valorApuesta}
        totalAbonado={abonado}
        trigger={
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface/50 py-2 pl-2 pr-2.5 text-left transition-colors hover:border-strong hover:bg-sunken active:bg-sunken"
          >
            {/* Barra de estado (escaneo por color) */}
            <span
              className={cn("h-9 w-1 shrink-0 rounded-full", m.bar)}
              aria-hidden
            />
            <AvatarNotion
              nombre={part.usuario.nombre_completo}
              size="sm"
              className="shrink-0"
            />

            <div className="min-w-0 flex-1">
              {/* Renglón 1: nombre + saldo destacado */}
              <div className="flex items-center justify-between gap-2">
                <span className="t-body-sm truncate font-semibold text-fg-strong">
                  {part.usuario.nombre_completo}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs font-bold tabular-nums",
                    estado === "pagado" ? "text-success" : "text-warning",
                  )}
                >
                  {estado === "pagado"
                    ? "Pagado"
                    : `Faltan ${formatearMonto(falta)}`}
                </span>
              </div>
              {/* Renglón 2: mini-barra + abonado/valor */}
              <div className="mt-1 flex items-center gap-2">
                <span className="h-1 max-w-[110px] flex-1 overflow-hidden rounded-pill bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-pill transition-[width] duration-500 ease-out",
                      m.bar,
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="ml-auto shrink-0 text-[11px] tabular-nums text-fg-muted">
                  {formatearMonto(abonado)} / {formatearMonto(valorApuesta)}
                </span>
              </div>
            </div>

            <ChevronRight
              className="size-4 shrink-0 text-fg-subtle"
              aria-hidden
            />
          </button>
        }
      />
    </li>
  );
}
