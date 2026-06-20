import {
  dehydrate,
  hydrate,
  onlineManager,
  type QueryClient,
} from "@tanstack/react-query";
import {
  guardarPrediccion,
  type GuardarPrediccionVars,
} from "./predicciones";

/**
 * Cola de mutaciones de predicción que SOBREVIVE a cierres, navegaciones y a la
 * suspensión de la PWA en iOS.
 *
 * EL PROBLEMA QUE RESUELVE (regla de oro del producto: una predicción "pendiente"
 * perdida antes del cierre es un bug funcional grave — COMPATIBILIDAD-STACK §6):
 * con `networkMode:"online"` una mutación sin red se PAUSA, pero esa cola vive en
 * MEMORIA. Si el usuario navega, bloquea el teléfono o iOS congela la app, la
 * mutación pausada desaparece y la predicción se pierde en silencio —mientras la
 * UI seguía prometiendo "se guardará al reconectar".
 *
 * LA SOLUCIÓN: registrar la mutación con una `mutationKey` estable + `mutationFn`
 * por defecto (para que sea reanudable sin el componente que la creó) y persistir
 * SOLO las mutaciones pausadas en `localStorage`, reanudándolas al arrancar y al
 * recuperar conexión.
 *
 * PRIVACIDAD (CLAUDE.md §3.4): se persiste únicamente la mutación PROPIA del
 * usuario (su marcador, en su dispositivo), que él ya puede ver. NUNCA se
 * persiste ninguna query ni predicción de terceros (`shouldDehydrateQuery` fijo
 * en `false`). No hay PII de nadie más en disco.
 */
export const KEY_GUARDAR_PREDICCION = ["guardarPrediccion"] as const;

/** Clave de almacenamiento (versionada por si cambia la forma serializada). */
const STORAGE_KEY = "pollota:mutaciones-pendientes:v1";

/**
 * Registra el `mutationFn` y la política de reintentos por defecto de la
 * mutación de predicción. DEBE llamarse antes de hidratar/reanudar la cola, para
 * que las mutaciones restauradas (sin componente) tengan con qué ejecutarse.
 */
export function registrarDefaultsMutaciones(client: QueryClient) {
  client.setMutationDefaults(KEY_GUARDAR_PREDICCION, {
    mutationFn: async (vars: GuardarPrediccionVars) => {
      const { ok, error } = await guardarPrediccion(vars);
      // Lanzar en error hace que TanStack reintente (red) o falle visiblemente
      // (cierre cerrado). El RLS del servidor sigue siendo la última palabra:
      // si la cola reanuda tras el cierre, la BD rechaza y no se cuela nada.
      if (!ok) throw new Error(error ?? "No se pudo guardar");
      return vars;
    },
    networkMode: "online",
    retry: 3,
    retryDelay: (intento) => Math.min(1000 * 2 ** intento, 15_000),
  });
}

/**
 * Instala el `onlineManager` de TanStack Query basado en los eventos reales del
 * navegador (`online`/`offline`) en vez del flag estático. Detecta el modo avión
 * real para pausar/persistir; el timeout del fetch cubre el WiFi "mentiroso" de
 * estadio (que reporta online sin salida a internet).
 */
export function instalarOnlineManager() {
  onlineManager.setEventListener((setOnline) => {
    if (typeof window === "undefined") return () => {};
    const actualizar = () => setOnline(navigator.onLine);
    actualizar();
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  });
}

/**
 * Hidrata la cola pendiente de un cierre anterior, la persiste ante cada cambio
 * y la reanuda al arrancar y al recuperar conexión. Devuelve una función de
 * limpieza. Llamar DESPUÉS de `registrarDefaultsMutaciones`.
 */
export function instalarPersistenciaMutaciones(client: QueryClient): () => void {
  if (typeof window === "undefined") return () => {};

  // 1) Restaurar la cola pendiente que quedó de una sesión anterior.
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) hydrate(client, JSON.parse(raw));
  } catch {
    // Storage no disponible o JSON corrupto: empezar limpio, sin romper.
  }

  // 2) Persistir SOLO las mutaciones pausadas (cola propia; jamás queries).
  const persistir = () => {
    try {
      const estado = dehydrate(client, {
        shouldDehydrateQuery: () => false,
        shouldDehydrateMutation: (m) => m.state.isPaused,
      });
      if (estado.mutations.length > 0) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Cuota llena / modo privado: no es fatal, la cola sigue en memoria.
    }
  };
  const desuscribirCache = client.getMutationCache().subscribe(persistir);

  // 3) Reanudar al arrancar (lo que se restauró) y cada vez que vuelva la red.
  void client.resumePausedMutations();
  const desuscribirOnline = onlineManager.subscribe((online) => {
    if (online) void client.resumePausedMutations();
  });

  return () => {
    desuscribirCache();
    desuscribirOnline();
  };
}
