"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Medal, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Flag } from "@/components/shared/Flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  guardarClasificacion,
  guardarMejoresTerceros,
  limpiarClasificacion,
  limpiarMejoresTerceros,
} from "../actions";

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

export type TerceroFila = {
  grupo: string;
  equipoId: string | null;
  nombre: string | null;
  codigoIso: string | null;
  pts: number | null;
  dif: number | null;
  aFavor: number | null;
  determinado: boolean;
  posicionAuto: number | null;
  clasificaAuto: boolean;
  manualClasifica: boolean;
};

export type TorneoClasificacion = {
  id: string;
  nombre: string;
  grupos: GrupoClasificacion[];
  terceros: TerceroFila[];
  hayManualTerceros: boolean;
  ambiguoTerceros: boolean;
  tercerosCompletos: boolean;
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

      <MejoresTerceros torneo={torneoActivo} />
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
  // así que los tres primeros son el 1°, 2° y 3° actuales.
  const [primero, setPrimero] = useState(grupo.equipos[0]?.equipoId ?? "");
  const [segundo, setSegundo] = useState(grupo.equipos[1]?.equipoId ?? "");
  const [tercero, setTercero] = useState(grupo.equipos[2]?.equipoId ?? "");
  const [guardando, setGuardando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  const elegidos = [primero, segundo, tercero].filter(Boolean);
  const hayRepetido = new Set(elegidos).size !== elegidos.length;
  const ocupado = guardando || limpiando;

  async function guardar() {
    if (!primero || !segundo || !tercero) {
      toast.error("Selecciona el 1°, 2° y 3°");
      return;
    }
    if (hayRepetido) {
      toast.error("El 1°, 2° y 3° deben ser distintos");
      return;
    }
    setGuardando(true);
    const r = await guardarClasificacion({
      torneoId,
      grupo: grupo.grupo,
      primeroId: primero,
      segundoId: segundo,
      terceroId: tercero,
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
              const clasifica = i < 2; // 1° y 2° pasan directo
              const esTercero = i === 2; // candidato a mejor tercero
              return (
                <tr
                  key={e.equipoId}
                  className={cn(
                    "border-t border-border",
                    clasifica && "bg-primary-soft/40",
                    esTercero && "bg-warning/10",
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

      {/* Selección manual de clasificados (1°, 2° y 3°) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <SelectEquipo
          etiqueta="3° lugar"
          value={tercero}
          onChange={setTercero}
          equipos={grupo.equipos}
          disabled={ocupado}
        />
      </div>
      {hayRepetido && (
        <p className="t-caption text-destructive">
          El 1°, 2° y 3° no pueden repetir equipo.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={guardar}
          disabled={ocupado || hayRepetido}
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

const TOTAL_TERCEROS = 8;

function MejoresTerceros({ torneo }: { torneo: TorneoClasificacion }) {
  const { terceros, hayManualTerceros, ambiguoTerceros, tercerosCompletos } =
    torneo;

  // Mapa grupo -> datos del tercero, para pintar bandera/stats junto al cupo.
  const porGrupo = useMemo(() => {
    const m = new Map<string, TerceroFila>();
    for (const t of terceros) m.set(t.grupo, t);
    return m;
  }, [terceros]);

  // Estado: 8 cupos. Cada cupo guarda la LETRA del grupo cuyo 3° clasifica, o
  // "" = Ninguno. El bracket solo depende del CONJUNTO de grupos elegidos, no
  // del orden de los cupos. Inicial: la selección manual si existe; si no, la
  // que clasifica automático.
  const inicial = useMemo(() => {
    const base = hayManualTerceros
      ? terceros.filter((t) => t.manualClasifica)
      : terceros.filter((t) => t.clasificaAuto);
    const arr = base.map((t) => t.grupo).slice(0, TOTAL_TERCEROS);
    while (arr.length < TOTAL_TERCEROS) arr.push("");
    return arr;
  }, [terceros, hayManualTerceros]);

  const [cupos, setCupos] = useState<string[]>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  const ocupado = guardando || limpiando;
  const elegidos = cupos.filter(Boolean);
  const cuenta = elegidos.length;
  const completo = cuenta === TOTAL_TERCEROS;

  function cambiarCupo(indice: number, grupo: string) {
    if (ocupado) return;
    setCupos((prev) => {
      const next = [...prev];
      next[indice] = grupo;
      return next;
    });
  }

  async function guardar() {
    setGuardando(true);
    const r = await guardarMejoresTerceros({
      torneoId: torneo.id,
      grupos: elegidos,
    });
    setGuardando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo guardar");
      return;
    }
    toast.success(
      completo
        ? "Mejores terceros guardados"
        : "Terceros guardados; faltan cupos, los cruces con 3° quedan por definir",
    );
  }

  async function limpiar() {
    setLimpiando(true);
    const r = await limpiarMejoresTerceros({ torneoId: torneo.id });
    setLimpiando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo quitar");
      return;
    }
    toast.success("Mejores terceros: vuelve al cálculo automático");
  }

  return (
    <section className="surface-card space-y-4 rounded-2xl p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-h3 flex items-center gap-2 text-fg-strong">
          <Medal className="size-5 text-primary" /> Mejores terceros
        </h2>
        {hayManualTerceros ? (
          <Badge variant="secondary">Selección manual</Badge>
        ) : !tercerosCompletos ? (
          <Badge variant="warning">
            <AlertTriangle className="size-3" /> Faltan 3° por definir
          </Badge>
        ) : ambiguoTerceros ? (
          <Badge variant="warning">
            <AlertTriangle className="size-3" /> Empate en el corte
          </Badge>
        ) : (
          <Badge variant="success">
            <Check className="size-3" /> Automático
          </Badge>
        )}
      </header>

      <p className="t-body-sm text-fg-muted">
        Solo <strong>8 de los 12</strong> terceros pasan al bracket; los otros 4
        grupos quedan sin tercero clasificado. Asigna cada cupo a un grupo (o
        déjalo en <em>Ninguno</em>). Un grupo no se puede repetir: para cambiar
        uno, primero libera su cupo. El bracket recién asigna los terceros cuando
        los <strong>8 cupos</strong> tienen grupo; si falta alguno, los cruces
        con 3° quedan por definir. Normalmente se calcula solo; ajústalo a mano
        si el corte entre el 8° y 9° queda empatado.
      </p>

      {!tercerosCompletos && (
        <p className="t-caption rounded-lg bg-warning/10 px-3 py-2 text-warning-foreground">
          Algunos grupos aún no tienen su 3° definido; solo puedes asignar a los
          que ya están determinados.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cupos.map((grupoSel, i) => {
          const sel = grupoSel ? porGrupo.get(grupoSel) : undefined;
          return (
            <div
              key={i}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 py-2 transition-colors",
                grupoSel ? "border-primary bg-primary-soft/50" : "border-border",
              )}
            >
              <span className="t-caption w-12 shrink-0 font-bold text-fg-muted">
                Cupo {i + 1}
              </span>
              {sel?.determinado && (
                <Flag code={sel.codigoIso} size={18} round />
              )}
              <select
                value={grupoSel}
                onChange={(e) => cambiarCupo(i, e.target.value)}
                disabled={ocupado}
                aria-label={`Cupo ${i + 1} de mejores terceros`}
                className="h-11 min-w-0 flex-1 rounded-lg border-2 border-border bg-surface px-2.5 text-base font-semibold text-fg-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted"
              >
                <option value="">Ninguno</option>
                {terceros.map((t) => {
                  const usadoEnOtro = cupos.some(
                    (g, j) => j !== i && g === t.grupo,
                  );
                  return (
                    <option
                      key={t.grupo}
                      value={t.grupo}
                      disabled={!t.determinado || usadoEnOtro}
                    >
                      {t.grupo} ·{" "}
                      {t.determinado ? t.nombre : "3° sin definir"}
                      {t.posicionAuto ? ` (${t.posicionAuto}°)` : ""}
                    </option>
                  );
                })}
              </select>
              {sel?.determinado && (
                <span className="t-caption shrink-0 tabular-nums text-fg-muted">
                  {sel.pts} pts
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "t-caption font-semibold tabular-nums",
            completo ? "text-primary" : "text-fg-muted",
          )}
        >
          {cuenta}/{TOTAL_TERCEROS} cupos
        </span>
        <div className="flex items-center gap-2">
          {hayManualTerceros && (
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
          <Button size="sm" onClick={guardar} disabled={ocupado}>
            {guardando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Guardar terceros"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
