"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import { datosGrupoSchema, type DatosGrupoInput } from "@/lib/schemas/grupo";
import { useWizardGrupo } from "@/lib/stores/wizard-grupo";
import { useTorneosDisponibles } from "@/lib/queries/torneos";
import { formatearFechaCorta } from "@/lib/utils/fechas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const MAX_NOMBRE = 50;
const MAX_DESC = 280;

/**
 * Torneos ocultos del selector del wizard (por `codigo`). Siguen activos en la
 * BD (calendario de Partidos, etc.); solo no se ofrecen al crear una polla.
 */
const TORNEOS_OCULTOS_WIZARD = new Set(["mundial-2"]);

/** "11 jun – 19 jul". Ancla a mediodía para que la conversión a Bogotá de una
 *  fecha sin hora (date) no se corra un día. */
function rangoFechas(inicio: string, fin: string): string {
  return `${formatearFechaCorta(`${inicio}T12:00:00`)} – ${formatearFechaCorta(
    `${fin}T12:00:00`,
  )}`;
}

export function PasoDatos() {
  const { datos, torneoId, setTorneo, setDatos, siguiente } = useWizardGrupo();
  const { data: torneosDisponibles = [], isLoading, isError } =
    useTorneosDisponibles();

  // Oculta del wizard los torneos vetados (ej. "Mundial 2"), sin desactivarlos
  // en la BD para no afectar el resto de la app.
  const torneos = torneosDisponibles.filter(
    (t) => !TORNEOS_OCULTOS_WIZARD.has(t.codigo),
  );

  // Torneo elegido (para mostrar su detalle bajo el desplegable).
  const torneoSeleccionado = torneos.find((t) => t.id === torneoId);

  // Preselecciona el primer torneo disponible si no hay uno elegido —o si el
  // elegido quedó oculto (ej. estaba persistido "Mundial 2" en el store).
  useEffect(() => {
    if (torneos.length === 0) return;
    const elegidoVisible = torneos.some((t) => t.id === torneoId);
    if (!elegidoVisible) {
      setTorneo(torneos[0]!.id);
    }
  }, [torneoId, torneos, setTorneo]);

  const form = useForm<DatosGrupoInput>({
    resolver: zodResolver(datosGrupoSchema),
    defaultValues: datos,
    mode: "onTouched",
  });

  // useWatch aislado (no `form.watch()` global, que re-renderiza en cada tecla).
  const nombre = useWatch({ control: form.control, name: "nombre" }) ?? "";
  const descripcion =
    useWatch({ control: form.control, name: "descripcion" }) ?? "";

  function onSubmit(values: DatosGrupoInput) {
    if (!torneoId) return; // El botón está deshabilitado sin torneo.
    setDatos(values);
    siguiente();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="surface-card space-y-6 rounded-2xl p-5 sm:p-6">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Nombre del grupo
                  <span className="text-primary" aria-hidden>
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej. La oficina · Mundial 2026"
                    maxLength={MAX_NOMBRE}
                    autoCapitalize="sentences"
                    enterKeyHint="next"
                    {...field}
                  />
                </FormControl>
                <div className="flex items-center justify-between gap-3">
                  <FormMessage />
                  <span
                    className="t-caption ml-auto shrink-0 tabular-nums"
                    aria-live="polite"
                  >
                    <span className="font-semibold text-fg-muted">
                      {nombre.length}/{MAX_NOMBRE}
                    </span>{" "}
                    · visible para los participantes
                  </span>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    maxLength={MAX_DESC}
                    placeholder="¿De qué se trata tu grupo? Ej. Quiniela del equipo. Premio: pizza."
                    {...field}
                  />
                </FormControl>
                <div className="flex items-center justify-between gap-3">
                  <FormMessage />
                  <span
                    className="t-caption ml-auto shrink-0 tabular-nums"
                    aria-live="polite"
                  >
                    {descripcion.length}/{MAX_DESC} caracteres
                  </span>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Selector de torneo */}
        <fieldset className="space-y-2.5">
          <legend className="t-body font-extrabold text-fg-strong">
            Torneo
            <span className="text-primary" aria-hidden>
              {" "}
              *
            </span>
          </legend>

          {isLoading ? (
            <div className="surface-card flex items-center justify-center gap-2.5 rounded-2xl py-8 text-fg-muted">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="t-body-sm">Cargando torneos…</span>
            </div>
          ) : isError ? (
            <div className="surface-card rounded-2xl p-4 text-center text-sm text-fg-muted">
              No se pudieron cargar los torneos. Recarga la página e intenta de
              nuevo.
            </div>
          ) : torneos.length === 0 ? (
            <div className="surface-card rounded-2xl p-4 text-center text-sm text-fg-muted">
              No hay torneos disponibles por ahora.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <select
                  aria-label="Torneo"
                  value={torneoId ?? ""}
                  onChange={(e) => setTorneo(e.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-border bg-surface pl-3.5 pr-10 text-base font-semibold text-fg-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {torneos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                      {t.es_prueba ? " · Pruebas" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-fg-muted"
                  aria-hidden
                />
              </div>

              {torneoSeleccionado && (
                <p className="t-caption flex flex-wrap items-center gap-x-2 gap-y-1 px-0.5 text-fg-muted">
                  <span>
                    {rangoFechas(
                      torneoSeleccionado.fecha_inicio,
                      torneoSeleccionado.fecha_fin,
                    )}
                    {torneoSeleccionado.pais_sede
                      ? ` · ${torneoSeleccionado.pais_sede}`
                      : ""}
                  </span>
                  {torneoSeleccionado.es_prueba && (
                    <span className="shrink-0 rounded-pill bg-warning/15 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-warning">
                      Pruebas
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </fieldset>

        {/* Footer de navegación */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <span className="t-caption hidden font-semibold sm:inline">
            Paso 1 de 3
          </span>
          <Button
            type="submit"
            size="lg"
            disabled={!torneoId}
            className="w-full sm:ml-auto sm:w-auto"
          >
            Siguiente <ArrowRight className="size-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
