"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { datosGrupoSchema, type DatosGrupoInput } from "@/lib/schemas/grupo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { actualizarGrupo } from "@/app/(app)/grupos/[id]/configurar/actions";

const MAX_NOMBRE = 50;
const MAX_DESC = 280;

/**
 * Formulario para editar el nombre y la descripción de una polla existente.
 * Reusa `datosGrupoSchema` (mismo que el wizard) y persiste vía la server action
 * `actualizarGrupo`. Solo el creador puede guardar (validado en el servidor +
 * RLS). Al guardar, refresca para reflejar el cambio sin recargar a mano.
 */
export function FormularioEditarGrupo({
  grupoId,
  nombre,
  descripcion,
}: {
  grupoId: string;
  nombre: string;
  descripcion: string | null;
}) {
  const router = useRouter();
  const [guardando, startTransition] = useTransition();

  const form = useForm<DatosGrupoInput>({
    resolver: zodResolver(datosGrupoSchema),
    defaultValues: { nombre, descripcion: descripcion ?? "" },
    mode: "onTouched",
  });

  const nombreActual = useWatch({ control: form.control, name: "nombre" }) ?? "";
  const descActual =
    useWatch({ control: form.control, name: "descripcion" }) ?? "";

  function onSubmit(values: DatosGrupoInput) {
    startTransition(async () => {
      const res = await actualizarGrupo(grupoId, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Datos de la polla actualizados");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      enterKeyHint="done"
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
                        {nombreActual.length}/{MAX_NOMBRE}
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
                      {descActual.length}/{MAX_DESC} caracteres
                    </span>
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="lg"
              disabled={guardando || !form.formState.isDirty}
              className="w-full sm:w-auto"
            >
              <Save className="size-4" />
              {guardando ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
