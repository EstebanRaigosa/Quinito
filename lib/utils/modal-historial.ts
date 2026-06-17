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

type Entrada = { cerrar: () => void };

const pila: Entrada[] = [];
let escuchando = false;
/** Entrada que se está cerrando por el botón atrás (no debemos re-hacer back). */
let cerradaPorBack: Entrada | null = null;
/** El próximo popstate lo provocamos nosotros (history.back de limpieza). */
let popPropio = false;

function alPopState() {
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
  const entrada: Entrada = { cerrar };
  if (typeof window === "undefined") return entrada;
  if (!escuchando) {
    window.addEventListener("popstate", alPopState);
    escuchando = true;
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
  // Guarda: solo si la entrada superior del historial sigue siendo de una modal;
  // si el usuario navegó desde dentro de la modal (un Link), `history.state` ya
  // no es nuestro y un back() desharía esa navegación.
  if (window.history.state?.__modalAtras != null) {
    popPropio = true;
    window.history.back();
  }
}
