import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { VS_FONT_B64 } from "./vs-font-b64";

/**
 * Ruta a la fuente "Geist" en disco, lista para `resvg` (que solo acepta rutas,
 * no buffers, en la v2). La fuente va EMBEBIDA en el código (base64) y se escribe
 * una vez en el directorio temporal del runtime (`/tmp` en Netlify Functions, que
 * es escribible). Así no dependemos de que el empaquetado de Netlify incluya el
 * `.ttf` —que era la causa del 500 al rasterizar el comprobante—.
 */
let rutaCache: string | null = null;

export function rutaFuenteVS(): string {
  if (rutaCache && existsSync(rutaCache)) return rutaCache;
  const ruta = join(tmpdir(), "pollota-vs-font.ttf");
  if (!existsSync(ruta)) {
    writeFileSync(ruta, Buffer.from(VS_FONT_B64, "base64"));
  }
  rutaCache = ruta;
  return ruta;
}
