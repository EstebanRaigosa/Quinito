/**
 * Mapeo de banderas: código ISO-3 del dominio (`Equipo.codigo_iso`) → nombre de
 * archivo en `public/flags/` (ISO-2 o variante `gb-*`, estilo `circle-flags`).
 *
 * Fuente única usada por:
 * - `components/shared/Flag.tsx` (banderas en la UI).
 * - `app/api/notif-vs/route.ts` (ícono "vs" de las notificaciones push).
 *
 * Para agregar una bandera: descarga el SVG circular a `public/flags/<iso2>.svg`
 * y añade aquí la entrada ISO-3 → ISO-2.
 */
export const ISO3_A_ARCHIVO: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
  // Alias: el mock usa SUI; por si llega CHE desde otra fuente.
  CHE: "ch",
};

/** ISO-3 → nombre de archivo de bandera (sin extensión), o `undefined` si no hay. */
export function archivoBandera(iso3: string | null | undefined): string | undefined {
  return iso3 ? ISO3_A_ARCHIVO[iso3] : undefined;
}
