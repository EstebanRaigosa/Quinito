/**
 * Ventana (en hora de Bogotá) durante la cual se ofrecen los avisos de novedades
 * del torneo: la modal de inicio de eliminatorias y el avisito del nuevo orden
 * del detalle. FUENTE ÚNICA para que todos compartan el mismo rango y baste
 * cambiar las fechas en un solo lugar.
 *
 * Se definen en ISO con offset de Colombia (`-05:00`, sin horario de verano):
 * son un INSTANTE fijo, independiente de la zona del dispositivo, y Safari las
 * parsea bien. NUNCA usar `new Date("YYYY-MM-DD HH:MM")` (con espacio) → "Invalid
 * Date" en WebKit (COMPATIBILIDAD-MOVIL §12).
 *
 * Configurada: del 28-jun 6:00 a.m. al 29-jun 12:00 de la noche (medianoche =
 * 24:00, fin del día 29). Como el rango es `[INICIO, FIN)`, el FIN se expresa
 * como las 00:00 del 30-jun (el instante en que termina el 29).
 */
export const ANUNCIO_INICIO = new Date("2026-06-28T06:00:00-05:00").getTime();
export const ANUNCIO_FIN = new Date("2026-06-30T00:00:00-05:00").getTime();

/**
 * ¿El instante `ahora` (ms epoch, típicamente `Date.now()`) cae dentro de la
 * ventana de anuncios `[INICIO, FIN)`? Compara instantes UTC, así no depende de
 * la zona del navegador.
 */
export function dentroVentanaAnuncio(ahora: number): boolean {
  return ahora >= ANUNCIO_INICIO && ahora < ANUNCIO_FIN;
}
