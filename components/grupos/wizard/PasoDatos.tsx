"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Loader2, Trophy } from "lucide-react";
import { datosGrupoSchema, type DatosGrupoInput } from "@/lib/schemas/grupo";
import { useWizardGrupo } from "@/lib/stores/wizard-grupo";
import { useTorneosActivos } from "@/lib/queries/torneos";
import { formatearFechaCorta } from "@/lib/utils/fechas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  const { data: torneosActivos = [], isLoading, isError } = useTorneosActivos();

  // Oculta del wizard los torneos vetados (ej. "Mundial 2"), sin desactivarlos
  // en la BD para no afectar el resto de la app.
  const torneos = torneosActivos.filter(
    (t) => !TORNEOS_OCULTOS_WIZARD.has(t.codigo),
  );

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
            <div role="radiogroup" aria-label="Torneo" className="space-y-2.5">
              {torneos.map((t) => {
                const seleccionado = torneoId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={seleccionado}
                    onClick={() => setTorneo(t.id)}
                    className={cn(
                      "surface-card flex w-full items-center gap-3.5 rounded-2xl p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5",
                      seleccionado
                        ? "ring-2 ring-primary"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-xl",
                        seleccionado
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "bg-muted text-fg-muted",
                      )}
                    >
                      <Trophy className="size-6" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="t-body font-extrabold text-fg-strong">
                        {t.nombre}
                      </div>
                      <div className="t-caption mt-0.5">
                        {rangoFechas(t.fecha_inicio, t.fecha_fin)}
                        {t.pais_sede ? ` · ${t.pais_sede}` : ""}
                      </div>
                    </div>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                        seleccionado
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {seleccionado && (
                        <Check className="size-3.5" strokeWidth={3} />
                      )}
                    </span>
                  </button>
                );
              })}
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
