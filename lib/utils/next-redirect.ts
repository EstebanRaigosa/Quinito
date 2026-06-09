/**
 * Saneo del parámetro `next` (destino tras login/registro). Solo se permiten
 * rutas internas absolutas (`/...`) para evitar open-redirects hacia dominios
 * externos. Cualquier valor sospechoso cae al destino por defecto.
 */
export function destinoSeguro(
  next: string | null | undefined,
  porDefecto = "/dashboard",
): string {
  if (!next) return porDefecto;
  // Debe empezar con "/" pero NO con "//" (protocol-relative → externo).
  if (!next.startsWith("/") || next.startsWith("//")) return porDefecto;
  // Descarta intentos de escapar con backslashes o saltos de línea.
  if (/[\\\n\r\t]/.test(next)) return porDefecto;
  return next;
}
