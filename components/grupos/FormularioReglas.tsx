"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";
import {
  reglasSchema,
  reglasDefault,
  type ReglasInput,
} from "@/lib/schemas/reglas";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { CamposReglas } from "@/components/grupos/CamposReglas";
import { actualizarReglas } from "@/app/(app)/grupos/[id]/configurar/actions";

/**
 * Formulario de edición de reglas de una polla existente. Reusa los mismos
 * campos del wizard (`CamposReglas`) y persiste vía la server action
 * `actualizarReglas`. Al guardar, vuelve al detalle del grupo.
 */
export function FormularioReglas({
  grupoId,
  reglas,
}: {
  grupoId: string;
  reglas: ReglasInput;
}) {
  const router = useRouter();
  const [guardando, startTransition] = useTransition();

  const form = useForm<ReglasInput>({
    resolver: zodResolver(reglasSchema),
    // Mezclamos con los defaults para garantizar que TODOS los campos tengan
    // valor inicial (si alguno faltara, el input saldría en blanco). `reglas`
    // puede traer claves extra (ej. grupo_id) que el schema ignora.
    defaultValues: { ...reglasDefault, ...reglas },
    mode: "onTouched",
  });

  function onSubmit(values: ReglasInput) {
    startTransition(async () => {
      const res = await actualizarReglas(grupoId, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Reglas actualizadas");
      router.push(`/grupos/${grupoId}`);
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <CamposReglas control={form.control} />

        {/* Footer de acción */}
        <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] -mx-4 flex items-center gap-3 border-t border-border bg-app px-4 py-3 md:static md:bottom-auto md:mx-0 md:rounded-2xl md:border md:bg-surface md:px-5 md:py-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push(`/grupos/${grupoId}`)}
            disabled={guardando}
            className="shrink-0 px-4 md:flex-1 md:px-8"
          >
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={guardando} className="flex-1">
            <Save className="size-4" />
            {guardando ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
