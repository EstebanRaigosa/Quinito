"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Flag } from "@/components/shared/Flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { guardarClasificacion, limpiarClasificacion } from "../actions";

export type EquipoFila = {
  equipoId: string;
  nombre: string;
  codigoIso: string | null;
  pj: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  posicion: number;
  ambiguo: boolean;
  manualPosicion: number | null;
};

export type GrupoClasificacion = {
  grupo: string;
  equipos: EquipoFila[];
  tieneManual: boolean;
  hayAmbiguo: boolean;
};

export type TorneoClasificacion = {
  id: string;
  nombre: string;
  grupos: GrupoClasificacion[];
};

export function ClasificacionGrupos({
  torneos,
}: {
  torneos: TorneoClasificacion[];
}) {
  const [activo, setActivo] = useState<string>(torneos[0]?.id ?? "");

  if (torneos.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center text-fg-muted">
        <p className="t-body-sm">No hay torneos con grupos para clasificar.</p>
      </div>
    );
  }

  const torneoActivo = torneos.find((t) => t.id === activo) ?? torneos[0];

  return (
    <div className="space-y-6">
      {/* Selector de torneo */}
      {torneos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {torneos.map((t) => {
            const sel = t.id === torneoActivo.id;
            const pendientes = t.grupos.filter(
              (g) => g.hayAmbiguo && !g.tieneManual,
            ).length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActivo(t.id)}
                aria-pressed={sel}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all active:scale-[0.97]",
                  sel
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-fg-muted hover:bg-sunken",
                )}
              >
                <Trophy className="size-4" />
                {t.nombre}
                {pendientes > 0 && (
                  <span className="ml-0.5 grid size-5 place-items-center rounded-full bg-warning text-[11px] font-bold text-warning-foreground">
                    {pendientes}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {torneoActivo.grupos.map((g) => (
          <TarjetaGrupo key={g.grupo} torneoId={torneoActivo.id} grupo={g} />
        ))}
      </div>
    </div>
  );
}

function TarjetaGrupo({
  torneoId,
  grupo,
}: {
  torneoId: string;
  grupo: GrupoClasificacion;
}) {
  // El orden de `equipos` ya viene por posición efectiva (manual o automática),
  // así que los dos primeros son el 1° y 2° actuales.
  const [primero, setPrimero] = useState(grupo.equipos[0]?.equipoId ?? "");
  const [segundo, setSegundo] = useState(grupo.equipos[1]?.equipoId ?? "");
  const [guardando, setGuardando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  const mismoEquipo = primero !== "" && primero === segundo;
  const ocupado = guardando || limpiando;

  async function guardar() {
    if (!primero || !segundo) {
      toast.error("Selecciona el 1° y el 2°");
      return;
    }
    if (mismoEquipo) {
      toast.error("El 1° y el 2° deben ser distintos");
      return;
    }
    setGuardando(true);
    const r = await guardarClasificacion({
      torneoId,
      grupo: grupo.grupo,
      primeroId: primero,
      segundoId: segundo,
    });
    setGuardando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo guardar");
      return;
    }
    toast.success(`Grupo ${grupo.grupo}: clasificados guardados`);
  }

  async function limpiar() {
    setLimpiando(true);
    const r = await limpiarClasificacion({ torneoId, grupo: grupo.grupo });
    setLimpiando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo quitar");
      return;
    }
    toast.success(`Grupo ${grupo.grupo}: vuelve al cálculo automático`);
  }

  return (
    <section className="surface-card space-y-4 rounded-2xl p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="t-h3 text-fg-strong">Grupo {grupo.grupo}</h2>
        {grupo.tieneManual ? (
          <Badge variant="secondary">Selección manual</Badge>
        ) : grupo.hayAmbiguo ? (
          <Badge variant="warning">
            <AlertTriangle className="size-3" /> Empate sin resolver
          </Badge>
        ) : (
          <Badge variant="success">
            <Check className="size-3" /> Automático
          </Badge>
        )}
      </header>

      {/* Tabla de posiciones */}
      <div className="overflow-x-auto scroll-touch rounded-xl border border-border">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="bg-sunken text-fg-muted">
              <th className="px-2 py-1.5 text-left font-semibold">#</th>
              <th className="px-2 py-1.5 text-left font-semibold">Equipo</th>
              <th className="px-2 py-1.5 text-center font-semibold">PJ</th>
              <th className="px-2 py-1.5 text-center font-semibold">DG</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {grupo.equipos.map((e, i) => {
              const efectiva = e.manualPosicion ?? e.posicion;
              const clasifica = i < 2; // los dos primeros del orden efectivo
              return (
                <tr
                  key={e.equipoId}
                  className={cn(
                    "border-t border-border",
                    clasifica && "bg-primary-soft/40",
                  )}
                >
                  <td className="px-2 py-1.5 font-bold tabular-nums text-fg-muted">
                    {efectiva}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-2 font-semibold text-fg-strong">
                      <Flag code={e.codigoIso} size={18} round />
                      <span className="truncate">{e.nombre}</span>
                      {e.ambiguo && (
                        <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-fg-muted">
                    {e.pj}
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-fg-muted">
                    {e.dg > 0 ? `+${e.dg}` : e.dg}
                  </td>
                  <td className="px-2 py-1.5 text-center font-bold tabular-nums text-fg-strong">
                    {e.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selección manual de clasificados */}
      <div className="grid grid-cols-2 gap-3">
        <SelectEquipo
          etiqueta="1° lugar"
          value={primero}
          onChange={setPrimero}
          equipos={grupo.equipos}
          disabled={ocupado}
        />
        <SelectEquipo
          etiqueta="2° lugar"
          value={segundo}
          onChange={setSegundo}
          equipos={grupo.equipos}
          disabled={ocupado}
        />
      </div>
      {mismoEquipo && (
        <p className="t-caption text-destructive">
          El 1° y el 2° no pueden ser el mismo equipo.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={guardar}
          disabled={ocupado || mismoEquipo}
          className="flex-1"
        >
          {guardando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Guardar clasificados"
          )}
        </Button>
        {grupo.tieneManual && (
          <Button
            size="sm"
            variant="outline"
            onClick={limpiar}
            disabled={ocupado}
          >
            {limpiando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Usar automático"
            )}
          </Button>
        )}
      </div>
    </section>
  );
}

function SelectEquipo({
  etiqueta,
  value,
  onChange,
  equipos,
  disabled,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  equipos: EquipoFila[];
  disabled: boolean;
}) {
  return (
    <label className="block">
      <span className="t-caption mb-1 block font-semibold text-fg-muted">
        {etiqueta}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-lg border-2 border-border bg-surface px-2.5 text-base font-semibold text-fg-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted"
      >
        {equipos.map((e) => (
          <option key={e.equipoId} value={e.equipoId}>
            {e.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
