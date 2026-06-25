/**
 * Manejo del botón/gesto "atrás" para modales (Dialog/Sheet).
 *
 * Objetivo (móvil): el "atrás" — botón físico de Android o swipe-back de iOS —
 * debe CERRAR la modal abierta y dejar al usuario en la misma página que la
 * abrió, en vez de navegar a la pantalla anterior.
 *
 * Cómo: al abrir una modal empujamos una entrada de historial SIN cambiar la URL
 * (se conserva `history.state` de Next para no romper su router). Si el usuario
 * pulsa atrás, el navegador consume esa entrada y disparamos el cierre de la
 * modal superior. Si la modal se cierra por otra vía (botón X, tocar afuera,
 * Escape), quitamos esa entrada nosotros para no ensuciar el historial.
 *
 * Se maneja una PILA: con modales anidadas, cada "atrás" cierra solo la de
 * arriba. La pila asume cierre LIFO (lo normal en modales).
 */

type Entrada = { cerrar: () => void; url: string };

const pila: Entrada[] = [];
let escuchando = false;
/** Entrada que se está cerrando por el botón atrás (no debemos re-hacer back). */
let cerradaPorBack: Entrada | null = null;
/** El próximo popstate lo provocamos nosotros (history.back de limpieza). */
let popPropio = false;
/**
 * `history.back()` de limpieza diferido (ver `quitarModal`). Clave para sobrevivir
 * a React StrictMode (dev): StrictMode monta → desmonta → vuelve a montar el efecto
 * en el MISMO tick. Sin diferir, el desmontaje falso dispara un `history.back()`
 * que se entrelaza con el re-`pushState` y descoloca la pila → "atrás" termina
 * navegando en vez de cerrar la modal. Al diferirlo, el re-montaje lo cancela y
 * reutiliza la entrada de historial existente (sin volver a empujar).
 */
let backProgramado: ReturnType<typeof setTimeout> | null = null;

/** URL "lógica" actual (sin el hash): ruta + query. */
function urlActual(): string {
  return window.location.pathname + window.location.search;
}

function alPopState() {
  // Un "atrás" real cancela cualquier limpieza pendiente (evita un back extra).
  if (backProgramado !== null) {
    clearTimeout(backProgramado);
    backProgramado = null;
  }
  if (popPropio) {
    popPropio = false;
    return;
  }
  const tope = pila[pila.length - 1];
  if (!tope) return;
  cerradaPorBack = tope;
  tope.cerrar();
}

/** Registra una modal recién abierta. Devuelve su entrada para `quitarModal`. */
export function empujarModal(cerrar: () => void): Entrada {
  if (typeof window === "undefined") return { cerrar, url: "" };
  const entrada: Entrada = { cerrar, url: urlActual() };
  if (!escuchando) {
    window.addEventListener("popstate", alPopState);
    escuchando = true;
  }

  // Re-montaje de StrictMode: el `quitarModal` que acaba de correr dejó un back de
  // limpieza programado. Lo cancelamos y REUTILIZAMOS la entrada de historial que
  // sigue en el tope — NO hacemos otro `pushState` (si no, acumularíamos entradas).
  if (backProgramado !== null) {
    clearTimeout(backProgramado);
    backProgramado = null;
    pila.push(entrada);
    return entrada;
  }

  pila.push(entrada);
  // Conservamos el state de Next (sus marcadores internos) y sumamos el nuestro.
  window.history.pushState(
    { ...window.history.state, __modalAtras: pila.length },
    "",
  );
  return entrada;
}

/** Da de baja una modal al cerrarse (por la vía que sea). */
export function quitarModal(entrada: Entrada) {
  if (typeof window === "undefined") return;
  const idx = pila.indexOf(entrada);
  if (idx === -1) return;
  pila.splice(idx, 1);

  if (cerradaPorBack === entrada) {
    // El navegador ya quitó la entrada al pulsar atrás: nada que limpiar.
    cerradaPorBack = null;
    return;
  }

  // Cerrada por otra vía (X, overlay, Escape): quitamos la entrada que añadimos.
  // Guarda: solo hacemos back() si seguimos en la MISMA URL en la que se abrió la
  // modal. Así sabemos que el tope del historial sigue siendo nuestra entrada y no
  // una navegación real hecha desde dentro de la modal (un Link). Comparamos por
  // URL — NO por `history.state` — porque el App Router de Next reescribe
  // `history.state` en cada cambio de estado del router (p. ej. un `router.refresh`
  // de la tabla en vivo) y borraría cualquier marcador nuestro.
  if (urlActual() !== entrada.url) return;

  // DIFERIDO (no inmediato): si es un re-montaje de StrictMode, `empujarModal`
  // correrá en este mismo tick y cancelará este back antes de que se ejecute. En
  // un cierre real no hay re-montaje, así que el back se dispara y limpia la
  // entrada. El `setTimeout(0)` es el punto de sincronización con StrictMode.
  backProgramado = setTimeout(() => {
    backProgramado = null;
    popPropio = true;
    window.history.back();
  }, 0);
}
