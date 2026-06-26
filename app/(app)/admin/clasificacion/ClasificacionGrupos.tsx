"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  GitFork,
  Loader2,
  Medal,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Flag } from "@/components/shared/Flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Partido } from "@/lib/types/dominio";
import { BracketTorneo, etiquetaPlaceholder } from "./BracketTorneo";
import {
  guardarAsignacionTerceros,
  guardarClasificacion,
  guardarMejoresTerceros,
  limpiarAsignacionTerceros,
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
  pj: number | null;
  pts: number | null;
  dif: number | null;
  aFavor: number | null;
  determinado: boolean;
  grupoCerrado: boolean;
  posicion: number | null;
  asegurado: boolean;
  eliminado: boolean;
  clasificaAuto: boolean;
  manualClasifica: boolean;
};

/** Cruce del bracket que recibe a un mejor tercero (slot 74, 77, … en el Mundial). */
export type SlotTercero = {
  numeroPartido: number;
  fase: Partido["fase"];
  /** Rival ya resuelto (1° de grupo); null si todavía es placeholder. */
  rivalNombre: string | null;
  rivalCodigoIso: string | null;
  /** Placeholder del rival si aún no hay equipo (ej. '1A'); null si ya hay equipo. */
  rivalPlaceholder: string | null;
};

/**
 * Asignación efectiva de un tercero candidato a su cruce. `numeroPartido` es
 * null cuando el tercero está sin cruce asignado ("Ninguno"). El origen es FIFA
 * Annex C o, si existe, el override manual.
 */
export type AsignacionTercero = {
  grupo: string;
  numeroPartido: number | null;
  esManual: boolean;
  /** El conjunto de 8 aún no está firme (top provisional): puede cambiar. */
  esProvisional: boolean;
};

export type TorneoClasificacion = {
  id: string;
  nombre: string;
  grupos: GrupoClasificacion[];
  terceros: TerceroFila[];
  hayManualTerceros: boolean;
  ambiguoTerceros: boolean;
  /** Nº de terceros que clasifican al bracket (8 en el Mundial). */
  cupos: number;
  /** Partidos de la llave eliminatoria (sin fase de grupos). */
  bracket: Partido[];
  /** Cruces del bracket que reciben a un mejor tercero. */
  slotsTercero: SlotTercero[];
  /** Asignación efectiva de cada tercero clasificado a su cruce. */
  asignacionTerceros: AsignacionTercero[];
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

      <AsignacionCruces torneo={torneoActivo} />

      <BracketTorneo partidos={torneoActivo.bracket} />
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

function MejoresTerceros({ torneo }: { torneo: TorneoClasificacion }) {
  const { terceros, hayManualTerceros, ambiguoTerceros, cupos } = torneo;

  // Selección automática actual: la manual si existe; si no, los que clasifican
  // por cálculo (asegurados / dentro del corte).
  const autoSel = useMemo(
    () =>
      new Set(
        terceros
          .filter((t) =>
            hayManualTerceros ? t.manualClasifica : t.clasificaAuto,
          )
          .map((t) => t.grupo),
      ),
    [terceros, hayManualTerceros],
  );

  // `draft` = edición manual en curso (null = sigue lo automático/guardado).
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);
  const ocupado = guardando || limpiando;

  const seleccion = draft ?? autoSel;
  const cuenta = seleccion.size;
  const editando = draft !== null;
  const aseguradosCount = terceros.filter((t) => t.asegurado).length;
  const automaticoListo =
    !hayManualTerceros && cupos > 0 && aseguradosCount === cupos;

  function alternar(grupo: string, determinado: boolean) {
    if (!determinado || ocupado) return;
    setDraft(() => {
      const base = new Set(draft ?? autoSel);
      if (base.has(grupo)) base.delete(grupo);
      else base.add(grupo);
      return base;
    });
  }

  async function guardar() {
    setGuardando(true);
    const r = await guardarMejoresTerceros({
      torneoId: torneo.id,
      grupos: [...seleccion],
    });
    setGuardando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo guardar");
      return;
    }
    setDraft(null);
    toast.success(
      cuenta === cupos
        ? "Terceros clasificados guardados"
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
    setDraft(null);
    toast.success("Terceros: vuelve al cálculo automático");
  }

  return (
    <section className="surface-card space-y-4 rounded-2xl p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-h3 flex items-center gap-2 text-fg-strong">
          <Medal className="size-5 text-primary" /> Clasificación de terceros
        </h2>
        {hayManualTerceros ? (
          <Badge variant="secondary">Selección manual</Badge>
        ) : ambiguoTerceros ? (
          <Badge variant="warning">
            <AlertTriangle className="size-3" /> Empate en el corte
          </Badge>
        ) : automaticoListo ? (
          <Badge variant="success">
            <Check className="size-3" /> Clasificados
          </Badge>
        ) : (
          <Badge variant="info">En vivo</Badge>
        )}
      </header>

      <p className="t-body-sm text-fg-muted">
        Los terceros de todos los grupos se ordenan entre sí por{" "}
        <strong>puntos → diferencia de gol → goles a favor</strong>. Los{" "}
        <strong>{cupos} primeros</strong> clasifican al bracket. La tabla se
        actualiza en vivo aunque falten partidos: un tercero queda{" "}
        <strong>asegurado</strong> cuando ningún otro grupo lo puede sacar del
        corte, y entra al bracket apenas los {cupos} cupos están asegurados. Usa
        el check de <strong>Clasifica</strong> para forzar a mano qué terceros
        pasan al bracket (y, con eso, a partidos y predicciones).
      </p>

      {/* Tabla de clasificación de terceros (ya viene ordenada por posición) */}
      <div className="overflow-x-auto scroll-touch rounded-xl border border-border">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="bg-sunken text-fg-muted">
              <th className="px-2 py-1.5 text-left font-semibold">#</th>
              <th className="px-2 py-1.5 text-left font-semibold">Tercero</th>
              <th className="px-2 py-1.5 text-center font-semibold">PJ</th>
              <th className="px-2 py-1.5 text-center font-semibold">DG</th>
              <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
              <th className="px-2 py-1.5 text-right font-semibold">Estado</th>
              <th className="px-2 py-1.5 text-center font-semibold">Clasifica</th>
            </tr>
          </thead>
          <tbody>
            {terceros.map((t, i) => {
              const marcado = seleccion.has(t.grupo);
              const esCorte = !editando && !hayManualTerceros && i + 1 === cupos;
              return (
                <tr
                  key={t.grupo}
                  className={cn(
                    "border-t border-border",
                    marcado && "bg-primary-soft/40",
                    !marcado && t.eliminado && "opacity-60",
                    esCorte && "border-b-2 border-b-primary/60",
                  )}
                >
                  <td className="px-2 py-1.5 font-bold tabular-nums text-fg-muted">
                    {t.posicion ?? "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-2 font-semibold text-fg-strong">
                      <Flag code={t.codigoIso} size={18} round />
                      <span className="truncate">
                        {t.nombre ?? "3° sin definir"}
                      </span>
                      <span className="t-caption shrink-0 rounded bg-sunken px-1.5 py-0.5 font-bold text-fg-muted">
                        {t.grupo}
                      </span>
                      {!t.grupoCerrado && (
                        <span className="t-caption shrink-0 text-fg-muted">
                          en juego
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-fg-muted">
                    {t.pj ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-fg-muted">
                    {t.dif === null ? "—" : t.dif > 0 ? `+${t.dif}` : t.dif}
                  </td>
                  <td className="px-2 py-1.5 text-center font-bold tabular-nums text-fg-strong">
                    {t.pts ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <EstadoTercero fila={t} cupos={cupos} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={marcado}
                        aria-label={`Marcar el 3° del grupo ${t.grupo} como clasificado`}
                        disabled={!t.determinado || ocupado}
                        onClick={() => alternar(t.grupo, t.determinado)}
                        className={cn(
                          "grid size-9 place-items-center rounded-lg border-2 transition-colors active:scale-95",
                          marcado
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-surface text-transparent hover:border-primary/60",
                          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border",
                        )}
                      >
                        <Check className="size-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cupos > 0 && !editando && !hayManualTerceros && (
        <p className="t-caption text-fg-muted">
          La línea marca el corte automático: los {cupos} de arriba clasifican.
        </p>
      )}

      {(editando || hayManualTerceros) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-sunken/40 p-3">
          <div className="flex flex-col">
            <span
              className={cn(
                "t-caption font-semibold tabular-nums",
                cuenta === cupos ? "text-primary" : "text-fg-muted",
              )}
            >
              {cuenta}/{cupos} clasificados
              {editando && (
                <span className="ml-2 font-normal text-warning">
                  · sin guardar
                </span>
              )}
            </span>
            {cuenta !== cupos && (
              <span className="t-caption text-fg-muted">
                Faltan {Math.max(cupos - cuenta, 0)}; los cruces con 3° quedan
                por definir hasta completar {cupos}.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editando ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft(null)}
                  disabled={ocupado}
                >
                  Cancelar
                </Button>
                <Button size="sm" onClick={guardar} disabled={ocupado}>
                  {guardando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Guardar terceros"
                  )}
                </Button>
              </>
            ) : (
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
        </div>
      )}
    </section>
  );
}

function EstadoTercero({ fila, cupos }: { fila: TerceroFila; cupos: number }) {
  // Señal del CÁLCULO automático (independiente del marcado manual, que se ve
  // en el check de la fila).
  if (fila.asegurado) {
    return (
      <Badge variant="success">
        <Check className="size-3" /> Asegurado
      </Badge>
    );
  }
  if (fila.eliminado) {
    return <Badge variant="outline">Eliminado</Badge>;
  }
  if (cupos > 0 && fila.clasificaAuto) {
    return <Badge variant="info">En zona</Badge>;
  }
  return <Badge variant="neutral">Fuera</Badge>;
}

/** Etiqueta del cruce de un slot: "#74 · vs 1° E" o "#74 · vs Brasil". */
function etiquetaCruce(slot: SlotTercero): string {
  const rival = slot.rivalNombre ?? etiquetaPlaceholder(slot.rivalPlaceholder);
  return `#${slot.numeroPartido} · vs ${rival}`;
}

/**
 * Asignación del cruce de cada mejor tercero. Por defecto muestra el cruce que
 * dicta FIFA (Annex C); el admin puede cambiarlo a mano. Al elegir un cruce ya
 * ocupado por otro tercero, ambos se intercambian (la asignación es una
 * biyección entre los terceros clasificados y los slots del bracket).
 */
function AsignacionCruces({ torneo }: { torneo: TorneoClasificacion }) {
  const { slotsTercero, asignacionTerceros, terceros, cupos } = torneo;

  // País (nombre + bandera) por grupo, tomado de la tabla de terceros.
  const infoGrupo = useMemo(() => {
    const m = new Map<string, { nombre: string | null; codigoIso: string | null }>();
    for (const t of terceros)
      m.set(t.grupo, { nombre: t.nombre, codigoIso: t.codigoIso });
    return m;
  }, [terceros]);

  // Asignación efectiva guardada (grupo → cruce; null = "Ninguno", sin cruce).
  const baseAsignacion = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const a of asignacionTerceros) m.set(a.grupo, a.numeroPartido);
    return m;
  }, [asignacionTerceros]);

  const esManualGuardado = asignacionTerceros.some((a) => a.esManual);
  const esProvisional = asignacionTerceros.some((a) => a.esProvisional);

  // `draft` = edición en curso (null = sigue lo guardado/automático).
  const [draft, setDraft] = useState<Map<string, number | null> | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [limpiando, setLimpiando] = useState(false);
  const ocupado = guardando || limpiando;

  const asignacion = draft ?? baseAsignacion;
  const editando = draft !== null;

  // Terceros candidatos en su orden de ranking (terceros ya viene por posición).
  const grupos = useMemo(() => {
    const orden = new Map(terceros.map((t, i) => [t.grupo, i] as const));
    return [...baseAsignacion.keys()].sort(
      (a, b) => (orden.get(a) ?? 0) - (orden.get(b) ?? 0),
    );
  }, [baseAsignacion, terceros]);

  function cambiarCruce(grupo: string, nuevoNumero: number | null) {
    if (ocupado) return;
    setDraft(() => {
      const base = new Map(draft ?? baseAsignacion);
      const anterior = base.get(grupo) ?? null;
      if (anterior === nuevoNumero) return base;
      // Si se elige un cruce ya ocupado por otro tercero, ese otro recibe el
      // cruce anterior (que puede ser "Ninguno"): un cruce nunca queda doble.
      if (nuevoNumero !== null) {
        for (const [g, n] of base) {
          if (g !== grupo && n === nuevoNumero) {
            base.set(g, anterior);
            break;
          }
        }
      }
      base.set(grupo, nuevoNumero);
      return base;
    });
  }

  async function guardar() {
    setGuardando(true);
    // Solo se guardan los terceros con cruce asignado; los "Ninguno" se omiten
    // (sus slots quedan sin equipo en el bracket).
    const asignaciones = [...asignacion]
      .filter((e): e is [string, number] => e[1] !== null)
      .map(([grupo, numeroPartido]) => ({ grupo, numeroPartido }));
    const r = await guardarAsignacionTerceros({
      torneoId: torneo.id,
      asignaciones,
    });
    setGuardando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo guardar");
      return;
    }
    setDraft(null);
    toast.success(
      asignaciones.length === 0
        ? "Sin cruces manuales: vuelve al automático (FIFA)"
        : "Cruces de terceros guardados",
    );
  }

  async function limpiar() {
    setLimpiando(true);
    const r = await limpiarAsignacionTerceros({ torneoId: torneo.id });
    setLimpiando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo quitar");
      return;
    }
    setDraft(null);
    toast.success("Cruces: vuelve al automático (FIFA)");
  }

  // El torneo no usa mejores terceros (no hay slots): no se muestra la sección.
  if (slotsTercero.length === 0) return null;

  return (
    <section className="surface-card space-y-4 rounded-2xl p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-h3 flex items-center gap-2 text-fg-strong">
          <GitFork className="size-5 text-primary" /> Cruces de los mejores
          terceros
        </h2>
        {esManualGuardado ? (
          <Badge variant="secondary">Asignación manual</Badge>
        ) : esProvisional ? (
          <Badge variant="info">Provisional</Badge>
        ) : (
          <Badge variant="success">
            <Check className="size-3" /> Automático (FIFA)
          </Badge>
        )}
      </header>

      {asignacionTerceros.length === 0 ? (
        <p className="t-body-sm text-fg-muted">
          Todavía no hay un ranking de terceros para mostrar. Cuando los grupos
          tengan posiciones, aquí verás a qué cruce manda el reglamento FIFA a
          cada uno de los <strong>{cupos}</strong> mejores terceros y podrás
          ajustarlo a mano.
        </p>
      ) : (
        <>
          <p className="t-body-sm text-fg-muted">
            El cruce de cada tercero se calcula con el reglamento{" "}
            <strong>FIFA (Annex C)</strong> según qué grupos clasifican.
            Cámbialo si necesitas otra distribución: al elegir un cruce ya
            ocupado, los dos terceros se <strong>intercambian</strong>. Déjalo
            en <strong>Ninguno</strong> para no asignarlo: al guardar, solo se
            arman los partidos de los terceros con cruce (los demás quedan sin
            equipo). Apenas un cruce tiene equipo, habilita las predicciones.
          </p>

          {esProvisional && (
            <p className="t-caption flex items-start gap-1.5 rounded-lg bg-info-soft px-3 py-2 text-info-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Corte <strong>provisional</strong>: estos son los terceros que
                hoy van en zona. La lista puede cambiar hasta que terminen los
                grupos; el bracket real se llena cuando el corte quede firme.
              </span>
            </p>
          )}

          <ul className="space-y-2">
            {grupos.map((grupo) => {
              const info = infoGrupo.get(grupo);
              const numero = asignacion.get(grupo);
              return (
                <li
                  key={grupo}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:gap-3"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-fg-strong">
                    <Flag code={info?.codigoIso ?? null} size={18} round />
                    <span className="truncate">
                      {info?.nombre ?? "3° sin definir"}
                    </span>
                    <span className="t-caption shrink-0 rounded bg-sunken px-1.5 py-0.5 font-bold text-fg-muted">
                      3° {grupo}
                    </span>
                  </span>
                  <label className="flex items-center gap-2 sm:w-auto">
                    <span className="t-caption shrink-0 font-semibold text-fg-muted">
                      Cruce
                    </span>
                    <select
                      value={numero ?? ""}
                      onChange={(e) =>
                        cambiarCruce(
                          grupo,
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      disabled={ocupado}
                      aria-label={`Cruce del tercero del grupo ${grupo}`}
                      className="h-11 w-full min-w-0 rounded-lg border-2 border-border bg-surface px-2.5 text-base font-semibold text-fg-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted sm:w-64"
                    >
                      <option value="">Ninguno (sin cruce)</option>
                      {slotsTercero.map((s) => (
                        <option key={s.numeroPartido} value={s.numeroPartido}>
                          {etiquetaCruce(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {editando ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft(null)}
                  disabled={ocupado}
                >
                  Cancelar
                </Button>
                <Button size="sm" onClick={guardar} disabled={ocupado}>
                  {guardando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Guardar cruces"
                  )}
                </Button>
              </>
            ) : (
              esManualGuardado && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={limpiar}
                  disabled={ocupado}
                >
                  {limpiando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Usar automático (FIFA)"
                  )}
                </Button>
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}
