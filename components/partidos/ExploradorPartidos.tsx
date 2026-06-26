"use client";

import { forwardRef, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Globe2,
  SearchX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/shared/Flag";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { TarjetaPartido } from "@/components/partidos/TarjetaPartido";
import { DestelloPartido } from "@/components/partidos/DestelloPartido";
import { compararPartidos, firmaPartido } from "@/lib/utils/prediccion";
import {
  agruparPorDia,
  claveDiaBogota,
  etiquetaDiaRelativa,
} from "@/lib/utils/fechas";
import type { Partido, Prediccion, ReglasGrupo } from "@/lib/types/dominio";

type Vista = "recientes" | "pendientes";
type OpcionPais = { id: string; nombre: string; codigo_iso: string | null };
type OpcionFecha = { clave: string; etiqueta: string; count: number };

/**
 * Explorador de la pestaña "Partidos". Combina:
 * - Toggle base "Recientes" / "Pendientes" (vistas ya renderizadas en servidor).
 * - Barra de filtros por país (selección) y por fecha. Al activar cualquiera, el
 *   toggle queda en segundo plano (override) y se muestra un listado plano
 *   filtrado, con chips de los filtros activos.
 *
 * El listado filtrado se renderiza en cliente porque depende del estado de los
 * filtros; las tarjetas (`TarjetaPartido`) no usan código server-only, así que
 * pueden montarse aquí sin problema.
 *
 * Compatibilidad iOS/Safari (§3.3): inputs con `text-base` (16px, sin zoom),
 * tap targets ≥ 44px (h-11 / min-h-11), Popover de Radix (focus trap), sin
 * sticky ni unidades de viewport conflictivas.
 */
export function ExploradorPartidos({
  recientes,
  pendientes,
  countRecientes,
  countPendientes,
  partidos,
  misPredicciones,
  reglas,
  ahora,
  grupoId,
  participanteActualId,
  totalParticipantes,
}: {
  recientes: React.ReactNode;
  pendientes: React.ReactNode;
  countRecientes: number;
  countPendientes: number;
  partidos: Partido[];
  misPredicciones: Prediccion[];
  reglas: ReglasGrupo;
  ahora: Date;
  grupoId: string;
  participanteActualId?: string;
  totalParticipantes: number;
}) {
  const [vista, setVista] = useState<Vista>("recientes");
  const [pais, setPais] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);

  const filtrosActivos = pais !== null || fecha !== null;
  // Clave del día actual (zona Bogotá): los pendientes de hoy conservan el
  // acento verde aun dentro del listado filtrado.
  const claveHoy = claveDiaBogota(ahora);

  const prediccionPorPartido = useMemo(
    () => new Map(misPredicciones.map((p) => [p.partido_id, p])),
    [misPredicciones],
  );

  // Países (selecciones) que aparecen en algún partido del grupo, ordenados por
  // nombre. Los partidos eliminatorios sin equipos definidos no aportan país.
  const paises = useMemo<OpcionPais[]>(() => {
    const mapa = new Map<string, OpcionPais>();
    for (const p of partidos) {
      for (const e of [p.equipo_local, p.equipo_visitante]) {
        if (e && !mapa.has(e.id)) {
          mapa.set(e.id, { id: e.id, nombre: e.nombre, codigo_iso: e.codigo_iso });
        }
      }
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [partidos]);

  // Fechas con partidos (orden cronológico ascendente), con etiqueta relativa.
  const fechas = useMemo<OpcionFecha[]>(() => {
    const grupos = agruparPorDia([...partidos].sort(compararPartidos));
    return grupos.map(([clave, lista]) => ({
      clave,
      etiqueta: etiquetaDiaRelativa(lista[0]!.fecha_hora, ahora),
      count: lista.length,
    }));
  }, [partidos, ahora]);

  // Listado plano filtrado (solo se calcula cuando hay filtros activos).
  const resultados = useMemo(() => {
    if (!filtrosActivos) return [] as [string, Partido[]][];
    const filtrados = partidos.filter((p) => {
      if (pais && p.equipo_local?.id !== pais && p.equipo_visitante?.id !== pais)
        return false;
      if (fecha && claveDiaBogota(p.fecha_hora) !== fecha) return false;
      return true;
    });
    return agruparPorDia([...filtrados].sort(compararPartidos));
  }, [filtrosActivos, partidos, pais, fecha]);

  const totalResultados = resultados.reduce((n, [, l]) => n + l.length, 0);
  const paisSel = pais ? paises.find((p) => p.id === pais) ?? null : null;
  const fechaSel = fecha ? fechas.find((f) => f.clave === fecha) ?? null : null;

  return (
    <div className="space-y-4">
      {/* Toggle base. Cuando hay filtros activos queda inerte (override). */}
      <div
        role="tablist"
        aria-label="Vista de partidos"
        className={cn(
          "grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-muted p-1.5 shadow-sm transition-opacity",
          filtrosActivos && "pointer-events-none opacity-50",
        )}
      >
        <BotonVista
          activo={vista === "recientes"}
          onClick={() => setVista("recientes")}
          etiqueta="Recientes"
          count={countRecientes}
        />
        <BotonVista
          activo={vista === "pendientes"}
          onClick={() => setVista("pendientes")}
          etiqueta="Pendientes"
          count={countPendientes}
        />
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <FiltroPais paises={paises} seleccion={paisSel} onChange={setPais} />
        <FiltroFecha fechas={fechas} seleccion={fechaSel} onChange={setFecha} />
      </div>

      {/* Chips de filtros activos + contador + limpiar */}
      {filtrosActivos && (
        <div className="flex flex-wrap items-center gap-2">
          {paisSel && (
            <ChipFiltro onClear={() => setPais(null)}>
              <Flag code={paisSel.codigo_iso} size={16} />
              {paisSel.nombre}
            </ChipFiltro>
          )}
          {fechaSel && (
            <ChipFiltro onClear={() => setFecha(null)}>
              <CalendarDays className="size-3.5" aria-hidden />
              {capitalizar(fechaSel.etiqueta)}
            </ChipFiltro>
          )}
          <span className="text-xs font-semibold text-fg-muted">
            {totalResultados}{" "}
            {totalResultados === 1 ? "partido" : "partidos"}
          </span>
          <button
            type="button"
            onClick={() => {
              setPais(null);
              setFecha(null);
            }}
            className="ml-auto text-xs font-bold text-primary underline-offset-2 hover:underline"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Contenido: listado filtrado (override) o las vistas base */}
      {filtrosActivos ? (
        totalResultados === 0 ? (
          <EmptyState
            icono={SearchX}
            titulo="Sin partidos para ese filtro"
            descripcion="Prueba con otra selección o fecha, o limpia los filtros."
          />
        ) : (
          <div className="space-y-6">
            {resultados.map(([clave, lista]) => (
              <section
                key={clave}
                className="border-t border-strong pt-6 first:border-t-0 first:pt-0"
              >
                <EncabezadoDia
                  etiqueta={etiquetaDiaRelativa(lista[0]!.fecha_hora, ahora)}
                  count={lista.length}
                />
                <div className="grid gap-2.5 md:grid-cols-2">
                  {lista.map((p) => (
                    <DestelloPartido key={p.id} firma={firmaPartido(p)}>
                      <TarjetaPartido
                        partido={p}
                        miPrediccion={prediccionPorPartido.get(p.id)}
                        reglas={reglas}
                        ahora={ahora}
                        grupoId={grupoId}
                        participanteActualId={participanteActualId}
                        totalParticipantes={totalParticipantes}
                        esHoy={clave === claveHoy}
                      />
                    </DestelloPartido>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : (
        <>
          <div className={cn(vista !== "recientes" && "hidden")}>{recientes}</div>
          <div className={cn(vista !== "pendientes" && "hidden")}>
            {pendientes}
          </div>
        </>
      )}
    </div>
  );
}

/** Capitaliza la inicial (las etiquetas de fecha vienen en minúscula en locale es). */
function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Normaliza para búsqueda insensible a mayúsculas y a tildes/diacríticos:
 * "México" y "mexico" comparan igual. Descompone (NFD) y quita los diacríticos.
 */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function BotonVista({
  activo,
  onClick,
  etiqueta,
  count,
}: {
  activo: boolean;
  onClick: () => void;
  etiqueta: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors",
        activo
          ? "bg-card text-fg-strong shadow-sm ring-1 ring-inset ring-border/60"
          : "text-fg-muted hover:text-fg-strong",
      )}
    >
      {etiqueta}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums",
          activo
            ? "bg-primary text-primary-foreground"
            : "bg-border/60 text-fg-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Botón disparador de un filtro (pill). Verde cuando hay valor seleccionado.
 * Usa `forwardRef` + spread de props porque va dentro de `<PopoverTrigger asChild>`:
 * Radix clona este hijo e inyecta el `onClick`/`ref` que abren el popover. Sin
 * reenviarlos, el disparador no se conectaría y el popover no abriría.
 */
const DisparadorFiltro = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & {
    icono: React.ReactNode;
    etiqueta: string;
    activo: boolean;
  }
>(({ icono, etiqueta, activo, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex h-11 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      activo
        ? "border-primary/40 bg-primary-soft text-primary shadow-glow"
        : "border-border/70 bg-card text-fg-strong hover:bg-muted",
      className,
    )}
    {...props}
  >
    {icono}
    <span className="max-w-[8.5rem] truncate">{etiqueta}</span>
    <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
  </button>
));
DisparadorFiltro.displayName = "DisparadorFiltro";

function FiltroPais({
  paises,
  seleccion,
  onChange,
}: {
  paises: OpcionPais[];
  seleccion: OpcionPais | null;
  onChange: (id: string | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return paises;
    return paises.filter(
      (p) =>
        normalizar(p.nombre).includes(q) ||
        normalizar(p.codigo_iso ?? "").includes(q),
    );
  }, [paises, busqueda]);

  function elegir(id: string | null) {
    onChange(id);
    setAbierto(false);
    setBusqueda("");
  }

  // Tecla "Ir"/"Buscar" del teclado móvil (submit del form): aplica el primer
  // país que coincide. Sin texto escrito no hace nada (evita elegir al azar).
  function buscarPrimera() {
    if (!busqueda.trim()) return;
    if (filtradas.length > 0) elegir(filtradas[0].id);
  }

  return (
    // Dialog (no Popover): el Popover queda anclado al botón y el teclado lo
    // tapa. DialogContent se reposiciona sobre el área visible con el teclado
    // abierto (useViewportModal, COMPATIBILIDAD-MOVIL §4.1), así la lista queda
    // siempre por encima del teclado y se puede seleccionar.
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o);
        if (!o) setBusqueda("");
      }}
    >
      <DialogTrigger asChild>
        <DisparadorFiltro
          activo={seleccion !== null}
          etiqueta={seleccion ? seleccion.nombre : "País"}
          icono={
            seleccion ? (
              <Flag code={seleccion.codigo_iso} size={18} />
            ) : (
              <Globe2 className="size-4 shrink-0 text-primary" aria-hidden />
            )
          }
        />
      </DialogTrigger>
      <DialogContent
        className="flex max-w-sm flex-col gap-0 overflow-hidden p-0"
        // No enfocar el input al abrir: en móvil eso abriría el teclado de
        // golpe. El usuario toca el campo si quiere escribir.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="px-4 pb-2 pr-12 pt-4 text-base">
          Filtrar por país
        </DialogTitle>
        <DialogDescription className="sr-only">
          Escribe para buscar una selección y tócala para filtrar los partidos.
        </DialogDescription>
        <form
          className="border-b border-border px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            buscarPrimera();
          }}
        >
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar selección…"
            aria-label="Buscar selección"
            type="search"
            enterKeyHint="search"
          />
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto scroll-touch p-1">
          <OpcionLista activo={seleccion === null} onClick={() => elegir(null)}>
            <Globe2 className="size-5 shrink-0 text-fg-muted" aria-hidden />
            Todos los países
          </OpcionLista>
          {filtradas.map((p) => (
            <OpcionLista
              key={p.id}
              activo={seleccion?.id === p.id}
              onClick={() => elegir(p.id)}
            >
              <Flag code={p.codigo_iso} size={22} />
              <span className="truncate">{p.nombre}</span>
            </OpcionLista>
          ))}
          {filtradas.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-fg-muted">
              Sin resultados
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FiltroFecha({
  fechas,
  seleccion,
  onChange,
}: {
  fechas: OpcionFecha[];
  seleccion: OpcionFecha | null;
  onChange: (clave: string | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  function elegir(clave: string | null) {
    onChange(clave);
    setAbierto(false);
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <DisparadorFiltro
          activo={seleccion !== null}
          etiqueta={seleccion ? capitalizar(seleccion.etiqueta) : "Fecha"}
          icono={
            <CalendarDays
              className={cn(
                "size-4 shrink-0",
                seleccion ? "text-primary" : "text-primary",
              )}
              aria-hidden
            />
          }
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1">
        <div className="max-h-72 overflow-y-auto">
          <OpcionLista activo={seleccion === null} onClick={() => elegir(null)}>
            <CalendarDays className="size-5 shrink-0 text-fg-muted" aria-hidden />
            Todas las fechas
          </OpcionLista>
          {fechas.map((f) => (
            <OpcionLista
              key={f.clave}
              activo={seleccion?.clave === f.clave}
              onClick={() => elegir(f.clave)}
            >
              <span className="truncate">{capitalizar(f.etiqueta)}</span>
              <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-2xs font-bold text-fg-muted">
                {f.count}
              </span>
            </OpcionLista>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OpcionLista({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors",
        activo
          ? "bg-primary-soft font-semibold text-primary"
          : "text-fg-strong hover:bg-muted",
      )}
    >
      {children}
      {activo && <Check className="ml-auto size-4 shrink-0 text-primary" aria-hidden />}
    </button>
  );
}

function ChipFiltro({
  onClear,
  children,
}: {
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft py-1 pl-2.5 pr-1.5 text-xs font-semibold text-primary">
      {children}
      <button
        type="button"
        onClick={onClear}
        aria-label="Quitar filtro"
        className="grid size-5 place-items-center rounded-full transition-colors hover:bg-primary/15"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

/** Encabezado de día para el listado filtrado (mismo lenguaje visual que la vista base). */
function EncabezadoDia({ etiqueta, count }: { etiqueta: string; count: number }) {
  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-full border border-clay-200 bg-clay-100 py-1.5 pl-3 pr-1.5 text-clay-800 shadow-sm">
          <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="text-sm font-bold">{capitalizar(etiqueta)}</span>
          <span className="rounded-full bg-primary px-2 py-0.5 text-2xs font-bold text-primary-foreground">
            {count} {count === 1 ? "partido" : "partidos"}
          </span>
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-border to-transparent"
        />
      </h3>
    </div>
  );
}
