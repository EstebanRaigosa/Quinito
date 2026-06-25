"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { reglasSchema, type ReglasInput } from "@/lib/schemas/reglas";
import { useWizardGrupo } from "@/lib/stores/wizard-grupo";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { CamposReglas } from "@/components/grupos/CamposReglas";

export function PasoReglas() {
  const { reglas, setReglas, siguiente, anterior } = useWizardGrupo();

  const form = useForm<ReglasInput>({
    resolver: zodResolver(reglasSchema),
    defaultValues: reglas,
    mode: "onTouched",
  });

  function onSubmit(values: ReglasInput) {
    setReglas(values);
    siguiente();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <CamposReglas control={form.control} />

        {/* Footer de navegación */}
        <div
          className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] -mx-4 flex items-center gap-3 border-t border-border bg-app px-4 py-3 md:static md:bottom-auto md:mx-0 md:rounded-2xl md:border md:bg-surface md:px-5 md:py-4"
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={anterior}
            aria-label="Volver al paso anterior"
            className="shrink-0 px-4 md:flex-1 md:px-8"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden md:inline">Atrás</span>
          </Button>
          <Button type="submit" size="lg" className="flex-1">
            Siguiente <ArrowRight className="size-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
