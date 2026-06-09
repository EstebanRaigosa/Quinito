"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { nombrePerfilSchema, type NombrePerfilInput } from "@/lib/schemas/perfil";
import { guardarNombrePerfil } from "@/lib/actions/perfil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * Formulario de nombre visible, reutilizado por el modal de onboarding y por la
 * edición en Perfil. Llama al server action `guardarNombrePerfil` y avisa al
 * contenedor (`onGuardado`) para cerrar el diálogo.
 */
export function FormularioNombre({
  nombreInicial,
  textoBoton = "Guardar",
  onGuardado,
  onCancelar,
}: {
  nombreInicial: string;
  textoBoton?: string;
  onGuardado: (nombre: string) => void;
  /** Si se pasa, muestra un botón "Cancelar" (edición). El onboarding lo omite. */
  onCancelar?: () => void;
}) {
  const [cargando, startTransition] = useTransition();

  const form = useForm<NombrePerfilInput>({
    resolver: zodResolver(nombrePerfilSchema),
    defaultValues: { nombre_completo: nombreInicial },
  });

  function onSubmit(values: NombrePerfilInput) {
    startTransition(async () => {
      const res = await guardarNombrePerfil(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Nombre actualizado");
      onGuardado(res.nombre);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre_completo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  autoFocus
                  placeholder="¿Cómo quieres que te vean?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancelar && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancelar}
              disabled={cargando}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={cargando}>
            {cargando && <Loader2 className="size-4 animate-spin" />}
            {textoBoton}
          </Button>
        </div>
      </form>
    </Form>
  );
}
