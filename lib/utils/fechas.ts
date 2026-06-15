import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

/**
 * Helpers de fecha. Regla dura (CLAUDE.md §3.5): los timestamps se guardan en UTC
 * y SIEMPRE se renderizan en America/Bogota, sin depender de la zona del navegador.
 */
export const ZONA_BOGOTA = "America/Bogota";

/** Ej. "jue 11 jun · 2:00 p. m." */
export function formatearFechaHoraBogota(iso: string | Date): string {
  return formatInTimeZone(iso, ZONA_BOGOTA, "EEE d MMM · h:mm a", { locale: es });
}

/** Ej. "11 jun" */
export function formatearFechaCorta(iso: string | Date): string {
  return formatInTimeZone(iso, ZONA_BOGOTA, "d MMM", { locale: es });
}

/** Ej. "2:00 p. m." */
export function formatearHoraBogota(iso: string | Date): string {
  return formatInTimeZone(iso, ZONA_BOGOTA, "h:mm a", { locale: es });
}

/** Ej. "jueves 11 de junio de 2026" */
export function formatearFechaLarga(iso: string | Date): string {
  return formatInTimeZone(iso, ZONA_BOGOTA, "EEEE d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
}

/** Día agrupador estable (clave) en zona Bogotá. Ej. "2026-06-11". */
export function claveDiaBogota(iso: string | Date): string {
  return formatInTimeZone(iso, ZONA_BOGOTA, "yyyy-MM-dd");
}

/** Límite de la fecha centinela "sin fecha" (partidos con fecha anterior a 1901). */
const SIN_FECHA_LIMITE = Date.UTC(1901, 0, 1);

/**
 * Encabezado de día para listados de partidos. Igual que `formatearFechaLarga`,
 * salvo que los partidos con fecha centinela (1900) se rotulan como
 * "Sin fecha" en vez de mostrar un "1 de enero de 1900" confuso.
 */
export function etiquetaDiaListado(iso: string | Date): string {
  if (new Date(iso).getTime() < SIN_FECHA_LIMITE) return "Sin fecha";
  return formatearFechaLarga(iso);
}

/**
 * Agrupa una lista (partidos, predicciones con fecha) por día calendario en zona
 * Bogotá, conservando el orden de entrada. Devuelve pares [claveDía, items].
 * Genérico para no acoplar este módulo a tipos del dominio.
 */
export function agruparPorDia<T extends { fecha_hora: string }>(
  items: T[],
): [string, T[]][] {
  const mapa = new Map<string, T[]>();
  for (const it of items) {
    const dia = claveDiaBogota(it.fecha_hora);
    const lista = mapa.get(dia);
    if (lista) lista.push(it);
    else mapa.set(dia, [it]);
  }
  return [...mapa.entries()];
}

/**
 * Tiempo restante humano hasta una fecha. Ej. "en 2h 14m", "en 3 d", "ya empezó".
 * `ahora` es inyectable para mantener el mock determinista.
 */
export function tiempoRestante(iso: string | Date, ahora: Date): string {
  const ms = new Date(iso).getTime() - ahora.getTime();
  if (ms <= 0) return "ya empezó";
  const min = Math.floor(ms / 60000);
  const dias = Math.floor(min / 1440);
  if (dias >= 1) return `en ${dias} d`;
  const horas = Math.floor(min / 60);
  const mins = min % 60;
  if (horas >= 1) return `en ${horas}h ${mins}m`;
  return `en ${mins}m`;
}

/**
 * Cuenta regresiva compacta sin prefijo. Ej. "9h 14m", "45m", "2 d", "cerrada".
 * Para chips de cierre de apuesta donde el contexto ya implica "faltan".
 */
export function cuentaRegresivaCorta(iso: string | Date, ahora: Date): string {
  const ms = new Date(iso).getTime() - ahora.getTime();
  if (ms <= 0) return "cerrada";
  const min = Math.floor(ms / 60000);
  const dias = Math.floor(min / 1440);
  if (dias >= 1) return `${dias} d`;
  const horas = Math.floor(min / 60);
  const mins = min % 60;
  if (horas >= 1) return `${horas}h ${mins}m`;
  return `${mins}m`;
}
