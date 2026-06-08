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
