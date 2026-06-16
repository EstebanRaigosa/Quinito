"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { usePresencia } from "@/lib/stores/presencia";

/** Pestañas cuyos datos cambian con la actividad de la polla. */
const PESTANAS_CON_DATOS_VIVOS = new Set(["jugar", "partidos", "tabla"]);

/**
 * Pestañas válidas para el deep-link `?tab=` (ej. una notificación que enlaza
 * directo a la tabla: `/grupos/<id>?tab=tabla`). Un valor fuera de este set se
 * ignora y se cae al `defaultValue`.
 */
const PESTANAS_VALIDAS = new Set([
  "jugar",
  "partidos",
  "tabla",
  "reglas",
  "gente",
]);

/** Nombre legible de cada pestaña para el panel de presencia (admin). */
const ETIQUETA_PESTANA: Record<string, string> = {
  jugar: "Predicciones",
  partidos: "Partidos",
  tabla: "Tabla de posiciones",
  reglas: "Reglas",
  gente: "Participantes",
};

/**
 * Envuelve los Tabs del detalle de grupo y refresca los datos del servidor
 * (`router.refresh`) al entrar a una pestaña con datos vivos (Predecir,
 * Partidos, Tabla). Así no se queda "pegada" la información cuando alguien más
 * predijo, se cargó un resultado o cambió la tabla mientras la página seguía
 * abierta. El refresco es no bloqueante: la pestaña cambia al instante y los
 * datos se actualizan al llegar.
 *
 * Además publica la pestaña activa en el store de presencia (`grupoNombre`),
 * para que el panel de admin sepa en qué sección de la polla está cada usuario.
 */
export function TabsConRefresh({
  defaultValue,
  className,
  grupoNombre,
  children,
}: {
  defaultValue: string;
  className?: string;
  /** Nombre de la polla; se compone en el detalle de presencia. Omitir = no publica. */
  grupoNombre?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  // Arranca en `defaultValue` para que SSR e hidratación coincidan (sin desfase).
  const [activa, setActiva] = React.useState(defaultValue);
  const setDetalle = usePresencia((s) => s.setDetalle);

  // Deep-link: si la URL trae `?tab=<pestaña>` válida (ej. desde una
  // notificación que enlaza a la tabla), abre esa pestaña tras montar. Se lee
  // de `window.location` (no `useSearchParams`) para no forzar un Suspense extra.
  React.useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && PESTANAS_VALIDAS.has(tab)) setActiva(tab);
  }, []);

  // Publica "{polla} · {pestaña}" mientras esté montado; limpia al salir.
  React.useEffect(() => {
    if (!grupoNombre) return;
    const etiqueta = ETIQUETA_PESTANA[activa] ?? "Predicciones";
    setDetalle(`${grupoNombre} · ${etiqueta}`);
    return () => setDetalle(null);
  }, [grupoNombre, activa, setDetalle]);

  return (
    <Tabs
      value={activa}
      className={className}
      onValueChange={(valor) => {
        setActiva(valor);
        if (PESTANAS_CON_DATOS_VIVOS.has(valor)) {
          startTransition(() => router.refresh());
        }
      }}
    >
      {children}
    </Tabs>
  );
}
