import { type NextRequest } from "next/server";
import { archivoBandera } from "@/lib/utils/banderas";

/**
 * Ícono "vs" para las notificaciones push de recordatorio: una bolita circular
 * con la bandera local en la mitad izquierda, la visitante en la derecha y un
 * badge "VS" al centro. Lo consume el Service Worker como `icon` (ver `app/sw.ts`).
 *
 * GET /api/notif-vs?l=<ISO3 local>&v=<ISO3 visitante>
 *
 * IMPORTANTE — *secure static mode*: un SVG usado como ícono de notificación
 * (igual que un `<img>`) NO carga recursos externos ni `data:`/`href` remotos.
 * Por eso aquí **inlineamos** el contenido de cada bandera dentro del SVG en vez
 * de referenciarlas con `<image href>`. Los `id` internos de cada bandera se
 * prefijan para que no colisionen al unir las dos en un mismo documento.
 *
 * Se compone en el espacio nativo de las banderas (`circle-flags`, viewBox
 * 0 0 512 512) SIN escalarlas con `transform`: la `mask` circular interna de
 * cada bandera no sigue bien a un `scale()` en varios renderers (queda recortada
 * a una esquina). El navegador reescala el ícono final al tamaño que necesite.
 *
 * PRIVACIDAD (CLAUDE.md §3.4): solo expone banderas de equipos; sin PII. La ruta
 * es pública (la pide el navegador al pintar la notificación, sin sesión).
 */
export const runtime = "nodejs";

/** Lado del lienzo = viewBox nativo de las banderas circle-flags. */
const V = 512;

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

/** Descarga el SVG de una bandera (mismo origen) y devuelve su cuerpo inline. */
async function leerBandera(
  iso3: string | null,
  origin: string,
  prefijo: string,
): Promise<string | null> {
  const archivo = archivoBandera(iso3);
  if (!archivo) return null;
  try {
    const res = await fetch(`${origin}/flags/${archivo}.svg`);
    if (!res.ok) return null;
    return prefijarIds(cuerpoSvg(await res.text()), prefijo);
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
  const { searchParams, origin } = new URL(request.url);

  const [bL, bR] = await Promise.all([
    leerBandera(searchParams.get("l"), origin, "l"),
    leerBandera(searchParams.get("v"), origin, "v"),
  ]);

  const c = V / 2; // centro
  const r = V / 2 - 3; // radio de la bolita (deja aire para el aro)
  const rBadge = Math.round(V * 0.17);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${V}" height="${V}" viewBox="0 0 ${V} ${V}">` +
    `<defs>` +
    `<clipPath id="bola"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath>` +
    `<clipPath id="izq"><rect x="0" y="0" width="${c}" height="${V}"/></clipPath>` +
    `<clipPath id="der"><rect x="${c}" y="0" width="${c}" height="${V}"/></clipPath>` +
    `</defs>` +
    `<g clip-path="url(#bola)">` +
    mitad(bL, "izq") +
    mitad(bR, "der") +
    `</g>` +
    // Aro sutil de la bolita.
    `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="6"/>` +
    // Badge "VS" al centro (cubre la costura entre banderas).
    `<circle cx="${c}" cy="${c}" r="${rBadge}" fill="#fff" stroke="rgba(0,0,0,0.12)" stroke-width="4"/>` +
    `<text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-weight="800" ` +
    `font-size="${Math.round(rBadge * 1.05)}" fill="#0f172a">VS</text>` +
    `</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Cacheable: el par de banderas es estable; aligera al push service/CDN.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
