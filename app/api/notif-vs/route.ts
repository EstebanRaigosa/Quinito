import { type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { archivoBandera } from "@/lib/utils/banderas";
import { rutaFuenteVS } from "@/app/api/_assets/vs-font";

/**
 * Ícono "vs" para las notificaciones push de recordatorio: una bolita circular
 * con la bandera local en la mitad izquierda, la visitante en la derecha y un
 * badge "VS" al centro. Lo consume el Service Worker como `icon` (ver `app/sw.ts`).
 *
 * GET /api/notif-vs?l=<ISO3 local>&v=<ISO3 visitante>
 *
 * IMPORTANTE — devuelve **PNG**, no SVG. Chrome en Android NO renderiza íconos
 * de notificación en SVG (el sistema los decodifica como bitmap): un SVG sale
 * como notificación "sin ícono". Componemos la bolita en SVG (las banderas son
 * `circle-flags`, viewBox 0 0 512 512) y la rasterizamos a PNG con `resvg`.
 *
 * Las banderas se leen del filesystem (`public/flags/`) y se **inlinean** dentro
 * del SVG (no `<image href>`): así resvg resuelve sus `mask`/`clipPath` internos.
 * Los `id` de cada bandera se prefijan para que no colisionen al unir las dos.
 *
 * El texto "VS" usa una fuente embebida (`_assets/vs-font.ttf`) en vez de fuentes
 * del sistema: el servidor de producción puede no tener ninguna instalada.
 *
 * PRIVACIDAD (CLAUDE.md §3.4): solo expone banderas de equipos; sin PII. La ruta
 * es pública (la pide el navegador al pintar la notificación, sin sesión).
 */
export const runtime = "nodejs";

/** Lado del lienzo = viewBox nativo de las banderas circle-flags. */
const V = 512;
/** Tamaño del PNG de salida (suficiente para el ícono de notificación). */
const SALIDA = 256;

/** Prefija todos los `id` de un fragmento SVG para evitar colisiones al unir. */
function prefijarIds(svg: string, prefijo: string): string {
  return svg
    .replace(/id="([^"]+)"/g, (_m, id) => `id="${prefijo}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_m, id) => `url(#${prefijo}-${id})`)
    .replace(/(xlink:)?href="#([^"]+)"/g, (_m, xl, id) => `${xl ?? ""}href="#${prefijo}-${id}"`);
}

/** Contenido interno de un SVG de bandera (sin el `<svg>` envolvente). */
function cuerpoSvg(svg: string): string {
  return svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

/** Lee el SVG de una bandera del filesystem y devuelve su cuerpo inline. */
async function leerBandera(
  iso3: string | null,
  prefijo: string,
): Promise<string | null> {
  const archivo = archivoBandera(iso3);
  if (!archivo) return null;
  try {
    const ruta = path.join(process.cwd(), "public", "flags", `${archivo}.svg`);
    return prefijarIds(cuerpoSvg(await readFile(ruta, "utf8")), prefijo);
  } catch {
    return null;
  }
}

/** Una mitad de la bolita: la bandera (o un gris neutro si falta). */
function mitad(cuerpo: string | null, clip: string): string {
  const contenido = cuerpo ?? `<rect width="${V}" height="${V}" fill="#cbd5e1"/>`;
  return `<g clip-path="url(#${clip})">${contenido}</g>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const [bL, bR] = await Promise.all([
    leerBandera(searchParams.get("l"), "l"),
    leerBandera(searchParams.get("v"), "v"),
  ]);

  const c = V / 2; // centro
  const r = V / 2 - 3; // radio de la bolita (deja aire para el aro)
  const rBadge = Math.round(V * 0.17);

  // Array + join, NO concatenación con `+`: el minificador de `next build` (SWC)
  // corrompe la cadena larga de template-literals con `+` (descarta el texto tras
  // el último `${}` de cada template), rompiendo el SVG solo en producción. Mismo
  // motivo que en `app/api/comprobante-pago/route.ts`.
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${V}" height="${V}" viewBox="0 0 ${V} ${V}">`,
    `<defs>`,
    `<clipPath id="bola"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath>`,
    `<clipPath id="izq"><rect x="0" y="0" width="${c}" height="${V}"/></clipPath>`,
    `<clipPath id="der"><rect x="${c}" y="0" width="${c}" height="${V}"/></clipPath>`,
    `</defs>`,
    `<g clip-path="url(#bola)">`,
    mitad(bL, "izq"),
    mitad(bR, "der"),
    `</g>`,
    // Aro sutil de la bolita.
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="6"/>`,
    // Badge "VS" al centro (cubre la costura entre banderas).
    `<circle cx="${c}" cy="${c}" r="${rBadge}" fill="#fff" stroke="rgba(0,0,0,0.12)" stroke-width="4"/>`,
    `<text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central" font-family="Geist" font-weight="700" font-size="${Math.round(rBadge * 1.05)}" fill="#0f172a">VS</text>`,
    `</svg>`,
  ].join("");

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: SALIDA },
    font: { loadSystemFonts: false, fontFiles: [rutaFuenteVS()], defaultFontFamily: "Geist" },
  });
  const png = resvg.render().asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Cacheable: el par de banderas es estable; aligera al push service/CDN.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
