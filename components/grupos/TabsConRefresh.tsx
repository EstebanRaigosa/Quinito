"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

/** Pestañas cuyos datos cambian con la actividad de la polla. */
const PESTANAS_CON_DATOS_VIVOS = new Set(["jugar", "partidos", "tabla"]);

/**
 * Envuelve los Tabs del detalle de grupo y refresca los datos del servidor
 * (`router.refresh`) al entrar a una pestaña con datos vivos (Predecir,
 * Partidos, Tabla). Así no se queda "pegada" la información cuando alguien más
 * predijo, se cargó un resultado o cambió la tabla mientras la página seguía
 * abierta. El refresco es no bloqueante: la pestaña cambia al instante y los
 * datos se actualizan al llegar.
 */
export function TabsConRefresh({
  defaultValue,
  className,
  children,
}: {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();

  return (
    <Tabs
      defaultValue={defaultValue}
      className={className}
      onValueChange={(valor) => {
        if (PESTANAS_CON_DATOS_VIVOS.has(valor)) {
          startTransition(() => router.refresh());
        }
      }}
    >
      {children}
    </Tabs>
  );
}
