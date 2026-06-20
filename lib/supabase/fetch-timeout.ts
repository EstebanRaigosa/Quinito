/**
 * `fetch` con timeout vía `AbortController`, para inyectar en los clientes
 * Supabase (`global.fetch`).
 *
 * POR QUÉ (causa raíz del "con internet malo no funciona"): `supabase-js` usa
 * `fetch` SIN timeout. Con red intermitente —el WiFi de estadio que se asocia
 * al AP pero pierde paquetes, o un portal cautivo— la conexión TCP se abre pero
 * la respuesta nunca llega: la request queda colgada hasta el timeout del SO
 * (decenas de segundos, o nunca en algunos móviles). El usuario ve un spinner
 * eterno y NUNCA se dispara `onError`/`retry`/`isPaused`, porque nada rechaza.
 *
 * Un timeout convierte ese cuelgue en un RECHAZO → reactiva toda la maquinaria
 * de reintentos y pausa de TanStack Query (cliente) y los `catch` de red del
 * middleware/RSC (servidor), que hoy están inertes.
 *
 * COMPATIBILIDAD (CLAUDE.md §3.3): NO se usa `AbortSignal.any` (no existe en
 * iOS < 17.4). La señal externa que pasa TanStack Query (cancelación por
 * desmontaje) se encadena a mano para no romper en iOS 15.
 */
export function crearFetchConTimeout(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      // `abort(reason)` ignora el argumento en navegadores viejos (iOS 15) pero
      // igual aborta: el rechazo resultante basta para disparar retry/catch.
      try {
        controller.abort(
          new DOMException("Tiempo de espera de red agotado", "TimeoutError"),
        );
      } catch {
        controller.abort();
      }
    }, timeoutMs);

    // Encadenar la señal externa (si vino) sin `AbortSignal.any`.
    const externa = init?.signal;
    if (externa) {
      if (externa.aborted) controller.abort();
      else
        externa.addEventListener("abort", () => controller.abort(), {
          once: true,
        });
    }

    return fetch(input, { ...init, signal: controller.signal }).finally(() =>
      clearTimeout(timer),
    );
  };
}
