"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { usePresencia } from "@/lib/stores/presencia";
import { GrupoTabsContext } from "@/components/grupos/grupo-tabs-context";
import { RecorridoArranque } from "@/components/grupos/RecorridoArranque";

/** Pestañas cuyos datos cambian con la actividad de la polla. */
const PESTANAS_CON_DATOS_VIVOS = new Set(["jugar", "partidos", "tabla"]);

/**
 * Ventana de frescura: tras un render del servidor, los datos vivos (marcadores,
 * tabla) se consideran frescos por este tiempo. Entrar a una pestaña dentro de la
 * ventana NO dispara `router.refresh()`, así la página no "se recarga a media
 * lectura" mientras el usuario cambia de pestaña o hace scroll. Pasada la ventana,
 * la próxima entrada a una pestaña viva refresca una vez.
 *
 * Esto NO sacrifica liveness: los cambios reales en vivo (un marcador que carga el
 * admin, el paso a "En juego") llegan igual por `RealtimePartidos` y el cierre por
 * tiempo por `AutoRefrescoCierre`, ambos independientes de este refresco por clic.
 */
const FRESCURA_MS = 60_000;

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
  // El server ya resuelve la pestaña inicial desde `?tab=` (deep-link de
  // notificación o restauración tras una recarga completa), así que aquí no hay
  // que releerla del `window.location`: llega correcta en `defaultValue`.
  const [activa, setActiva] = React.useState(defaultValue);
  // Recorrido guiado que señala el botón "Arranque" (lo dispara el aviso de
  // partidos cerrados al crear, para guiar al admin hasta la acción).
  const [tourArranque, setTourArranque] = React.useState(false);
  const setDetalle = usePresencia((s) => s.setDetalle);
  // Raíz de los Tabs: la usamos como ancla para subir el scroll al cambiar de
  // pestaña, de modo que el contenido nuevo siempre arranque desde arriba.
  const raizRef = React.useRef<HTMLDivElement>(null);
  // Marca del último momento en que los datos del servidor estuvieron frescos
  // (montaje o último `router.refresh()`). Gobierna la ventana de `FRESCURA_MS`
  // para no refrescar al entrar a una pestaña si los datos son recientes.
  const ultimoFrescoRef = React.useRef(0);
  React.useEffect(() => {
    // El render del servidor en el montaje ya es fresco.
    ultimoFrescoRef.current = Date.now();
  }, []);

  /**
   * Sube el scroll para dejar la barra de pestañas pegada bajo el header.
   * En móvil el header es fijo (`h-14` + safe-area) y el `TabsList` es sticky a
   * esa misma altura: descontamos el alto del header para no tapar contenido.
   * En desktop el header está oculto (`offsetHeight` 0) y las pestañas son
   * estáticas, así que el ancla cae en su posición natural. Solo desplazamos
   * hacia arriba (nunca empujamos hacia abajo si ya estás cerca del tope).
   */
  const desplazarAlTope = React.useCallback(() => {
    const raiz = raizRef.current;
    if (!raiz) return;
    const header = document.querySelector("header");
    const offset = header instanceof HTMLElement ? header.offsetHeight : 0;
    const objetivo =
      raiz.getBoundingClientRect().top + window.scrollY - offset;
    if (window.scrollY > objetivo) {
      window.scrollTo({ top: Math.max(0, objetivo), behavior: "auto" });
    }
  }, []);

  // Abre "Participantes" e inicia el recorrido guiado hacia "Arranque".
  const irAParticipantes = React.useCallback(() => {
    setActiva("gente");
    desplazarAlTope();
    setTourArranque(true);
  }, [desplazarAlTope]);

  const finalizarTour = React.useCallback(() => setTourArranque(false), []);

  // Publica "{polla} · {pestaña}" mientras esté montado; limpia al salir.
  React.useEffect(() => {
    if (!grupoNombre) return;
    const etiqueta = ETIQUETA_PESTANA[activa] ?? "Predicciones";
    setDetalle(`${grupoNombre} · ${etiqueta}`);
    return () => setDetalle(null);
  }, [grupoNombre, activa, setDetalle]);

  return (
    <GrupoTabsContext.Provider
      value={{ irAParticipantes, tourArranque, finalizarTour }}
    >
      <Tabs
        ref={raizRef}
        value={activa}
        className={className}
        onValueChange={(valor) => {
          setActiva(valor);
          // Persistimos la pestaña en la URL (`?tab=`) sin navegar, para que
          // sobreviva a un remount/recarga. Si Next degrada un `router.refresh()`
          // a recarga completa del documento (p. ej. rotación de cookies de
          // Supabase justo tras login), la página vuelve a la MISMA pestaña en
          // vez de saltar a "Predicciones". `replaceState` no dispara navegación
          // ni middleware y es seguro en iOS Safari (no toca el scroll).
          //
          // IMPORTANTE: preservar `window.history.state` (NO pasar `null`). Ese
          // state guarda los marcadores internos del App Router de Next; si se
          // nulifican, al volver "atrás" desde una modal abierta en esta pestaña
          // (p. ej. el detalle de la tabla de posiciones) Next no reconoce la
          // entrada y la trata como navegación real → te SACA de la vista en vez
          // de solo cerrar la modal. Ver `lib/utils/modal-historial.ts`.
          const url = new URL(window.location.href);
          if (valor === "jugar") url.searchParams.delete("tab");
          else url.searchParams.set("tab", valor);
          window.history.replaceState(window.history.state, "", url);
          desplazarAlTope();
          // Cambiar de pestaña a mano cancela el recorrido guiado en curso.
          if (tourArranque) setTourArranque(false);
          // Solo refrescamos al entrar a una pestaña viva si los datos ya están
          // "viejos" (fuera de la ventana de frescura). Así, navegar entre
          // pestañas o hacer scroll recién cargada la página NO dispara una
          // recarga a media lectura. La liveness real la cubre `RealtimePartidos`.
          if (
            PESTANAS_CON_DATOS_VIVOS.has(valor) &&
            Date.now() - ultimoFrescoRef.current > FRESCURA_MS
          ) {
            ultimoFrescoRef.current = Date.now();
            startTransition(() => router.refresh());
          }
        }}
      >
        {children}
      </Tabs>
      <RecorridoArranque />
    </GrupoTabsContext.Provider>
  );
}
