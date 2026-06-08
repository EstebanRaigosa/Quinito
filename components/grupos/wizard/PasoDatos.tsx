"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Trophy } from "lucide-react";
import { datosGrupoSchema, type DatosGrupoInput } from "@/lib/schemas/grupo";
import { useWizardGrupo } from "@/lib/stores/wizard-grupo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

export function PasoDatos() {
  const { datos, setDatos, siguiente } = useWizardGrupo();

  const form = useForm<DatosGrupoInput>({
    resolver: zodResolver(datosGrupoSchema),
    defaultValues: datos,
    mode: "onTouched",
  });

  const nombre = form.watch("nombre") ?? "";
  const descripcion = form.watch("descripcion") ?? "";

  function onSubmit(values: DatosGrupoInput) {
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

        {/* Torneo activo */}
        <div className="surface-card flex items-center gap-3.5 rounded-2xl p-4 sm:p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Trophy className="size-6" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="t-body font-extrabold text-fg-strong">
              Mundial 2026
            </div>
            <div className="t-caption mt-0.5">
              11 jun – 19 jul · 48 selecciones · 104 partidos
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">
            Único torneo activo
          </Badge>
        </div>

        {/* Footer de navegación */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <span className="t-caption hidden font-semibold sm:inline">
            Paso 1 de 3
          </span>
          <Button
            type="submit"
            size="lg"
            className="w-full sm:ml-auto sm:w-auto"
          >
            Siguiente <ArrowRight className="size-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
