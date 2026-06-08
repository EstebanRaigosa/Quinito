/** Utilidades de texto para la UI. */

/** Iniciales para avatares: "Raigo Marín" → "RM". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}

/** Formatea pesos colombianos: 50000 → "$50.000". */
export function formatearCOP(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Monto corto con símbolo y separador de miles: 600000 → "$600.000". */
export function formatearMonto(valor: number): string {
  return "$" + new Intl.NumberFormat("es-CO").format(valor);
}

/** Sufijo ordinal en español para posiciones. 1 → "1.º". */
export function posicionOrdinal(posicion: number): string {
  return `${posicion}.º`;
}
