import { type NextRequest } from "next/server";
import path from "node:path";
import { formatearFechaLarga } from "@/lib/utils/fechas";
import { APP_DESCRIPCION } from "@/lib/constants";

/**
 * Comprobante de pago de un abono, en formato "ticket" (PNG), pensado para
 * compartir por WhatsApp o descargar desde la gestión de pagos. Cada abono tiene
 * su propio comprobante con un CÓDIGO único (ver migración 0072): ese código se
 * imprime en el talón y permite al admin/superadmin verificar después cuándo y
 * por cuánto se pagó (RPC `buscar_comprobante`).
 *
 * GET /api/comprobante-pago?g=&p=&a=&v=&m=&c=&f=
 *   g: nombre de la polla            p: nombre del participante
 *   a: monto del abono (pesos)       v: valor de la inscripción (pesos)
 *   m: método/nota del abono (opc.)  c: código del comprobante (ej. CMP-XXXX)
 *   f: fecha ISO del abono (cuándo se pagó)
 *
 * Devuelve **PNG** (no SVG): se rasteriza con `resvg` reutilizando la fuente
 * embebida del ícono "vs" (ver `app/api/notif-vs/route.ts`); el servidor de
 * producción puede no tener fuentes del SO instaladas.
 *
 * PRIVACIDAD (CLAUDE.md §3.4): el comprobante lo genera el admin para
 * entregárselo al propio participante. No hay acceso a BD aquí: el contenido
 * viene en los parámetros que arma el cliente admin. Se marca `private, no-store`
 * para que ninguna capa intermedia (CDN) cachee un comprobante con datos
 * personales. La ruta exige sesión (la protege el middleware).
 */
export const runtime = "nodejs";

/** Fuente embebida (compartida con el ícono de notificaciones). */
const RUTA_FUENTE = path.join(
  process.cwd(),
  "app/api/notif-vs/_assets/vs-font.ttf",
);

/**
 * Escapa los caracteres con significado en XML/SVG. Primero elimina caracteres
 * de control C0 ilegales en XML 1.0 (NULL, backspace, tab vertical, form feed…
 * todo 0x00–0x1F salvo tab/LF/CR), que el parser de resvg rechaza y que a veces
 * se cuelan al copiar/pegar nombres. No toca emojis ni acentos.
 */
function esc(s: string): string {
  // eslint-disable-next-line no-control-regex -- limpieza deliberada de C0
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Recorta a `max` caracteres con elipsis (no podemos medir glifos en SVG). */
function recortar(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

/** Pesos con separador de miles es-CO: 60000 → "$60.000". */
function pesos(n: number): string {
  return "$" + new Intl.NumberFormat("es-CO").format(Math.round(n));
}

/** Entero >= 0 a partir de un parámetro de query (descarta NaN/negativos). */
function entero(v: string | null): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** Contenido del logo de marca (public/icon.svg), viewBox 0 0 512 512. */
const LOGO_INNER =
  '<rect width="512" height="512" rx="115" ry="115" fill="#0B1C30"/>' +
  '<polyline points="133.12 276.48 220.16 353.28 337.92 204.80" fill="none" stroke="#22C55E" stroke-width="53.76" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<circle cx="381.44" cy="153.60" r="61.44" fill="#22C55E"/>' +
  '<polygon points="381.44,129.02 404.81,146.01 395.89,173.48 366.99,173.48 358.07,146.01" fill="#0B1C30"/>' +
  '<line x1="381.44" y1="129.02" x2="381.44" y2="92.16" stroke="#0B1C30" stroke-width="8.29" stroke-linecap="round"/>' +
  '<line x1="404.81" y1="146.01" x2="439.87" y2="134.61" stroke="#0B1C30" stroke-width="8.29" stroke-linecap="round"/>' +
  '<line x1="395.89" y1="173.48" x2="417.55" y2="203.31" stroke="#0B1C30" stroke-width="8.29" stroke-linecap="round"/>' +
  '<line x1="366.99" y1="173.48" x2="345.33" y2="203.31" stroke="#0B1C30" stroke-width="8.29" stroke-linecap="round"/>' +
  '<line x1="358.07" y1="146.01" x2="323.01" y2="134.61" stroke="#0B1C30" stroke-width="8.29" stroke-linecap="round"/>';

/** Coloca el logo (lado `lado`) en (x, y). */
function logoEn(x: number, y: number, lado: number): string {
  return `<g transform="translate(${x} ${y}) scale(${lado / 512})">${LOGO_INNER}</g>`;
}

type DatosTicket = {
  grupo: string;
  participante: string;
  abono: number;
  valor: number;
  metodo: string;
  codigo: string;
  fechaISO: string;
};

/** Construye el SVG del ticket. Dimensiones fijas 1080×1720 (vertical). */
function construirSvg({
  grupo,
  participante,
  abono,
  valor,
  metodo,
  codigo,
  fechaISO,
}: DatosTicket): string {
  // La píldora muestra el método de pago; si no hay, un estado neutro.
  const pillTxt = (metodo.trim() || "PAGO REGISTRADO").toUpperCase();
  const pillW = Math.round(Math.min(pillTxt.length, 22) * 22 + 96);
  // Color por método: transferencia en azul, efectivo (y el resto) en verde.
  const pillBg = /transfer/i.test(metodo) ? "#2563EB" : "#16A34A";

  const W = 1080;
  const H = 1600;
  const P = 64;
  const tX = P;
  const tW = W - P * 2;
  const tTop = 56;
  const headerH = 210;
  const radius = 48;
  const cx = W / 2;
  const baseY = tTop + headerH;

  const fechaTxt = formatearFechaLarga(fechaISO);

  const perfY = 1130;
  const notchR = 34;

  const rowsStart = 920;
  const rowGap = 82;
  const filas: [string, string][] = [
    ["Valor de la polla", pesos(valor)],
    ["Fecha del pago", fechaTxt],
  ];

  const filasSvg = filas
    .map(([k, v], i) => {
      const y = rowsStart + i * rowGap;
      return (
        `<text x="${tX + 56}" y="${y}" font-family="Geist" font-size="34" fill="#64748B">${esc(k)}</text>` +
        `<text x="${tX + tW - 56}" y="${y}" text-anchor="end" font-family="Geist" font-weight="700" font-size="34" fill="#0B1C30">${esc(v)}</text>` +
        `<line x1="${tX + 56}" y1="${y + 26}" x2="${tX + tW - 56}" y2="${y + 26}" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>`
      );
    })
    .join("");

  // Código de barras decorativo en el talón (no codifica datos).
  const bx0 = tX + 56;
  const bw = tW - 112;
  let barras = "";
  let bcx = bx0;
  let i = 0;
  while (bcx < bx0 + bw - 8) {
    const w = i % 3 === 0 ? 8 : i % 2 === 0 ? 4 : 6;
    barras += `<rect x="${bcx}" y="${perfY + 165}" width="${w}" height="56" rx="1.5" fill="#0B1C30" opacity="${i % 4 === 0 ? 0.9 : 0.55}"/>`;
    bcx += w + 6;
    i++;
  }

  // OJO: ensamblamos con un array + join, NO con concatenación de strings (`+`).
  // El minificador de `next build` (SWC) tiene un bug con la cadena larga de
  // template-literals con `+`: descarta el texto que va DESPUÉS del último `${}`
  // de cada template (y los templates 100% literales como `<defs>` enteros),
  // produciendo un SVG roto solo en producción ("SVG data parsing failed"). El
  // array no pasa por ese camino del minificador.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1C30"/><stop offset="1" stop-color="#052E16"/></linearGradient>`,
    `<linearGradient id="head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16A34A"/><stop offset="1" stop-color="#0D9488"/></linearGradient>`,
    `<clipPath id="card"><rect x="${tX}" y="${tTop}" width="${tW}" height="${H - tTop * 2}" rx="${radius}"/></clipPath>`,
    `</defs>`,
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>`,
    // Sombra falsa de la tarjeta (resvg no rasteriza filtros de forma fiable).
    `<rect x="${tX + 6}" y="${tTop + 14}" width="${tW}" height="${H - tTop * 2}" rx="${radius}" fill="#000000" opacity="0.25"/>`,
    `<rect x="${tX}" y="${tTop}" width="${tW}" height="${H - tTop * 2}" rx="${radius}" fill="#FFFFFF"/>`,
    `<g clip-path="url(#card)">`,
    // Cabecera de marca.
    `<rect x="${tX}" y="${tTop}" width="${tW}" height="${headerH}" fill="url(#head)"/>`,
    logoEn(tX + 52, tTop + 50, 110),
    `<text x="${tX + 190}" y="${tTop + 108}" font-family="Geist" font-weight="700" font-size="62" fill="#FFFFFF">Pollota</text>`,
    `<text x="${tX + 192}" y="${tTop + 156}" font-family="Geist" font-size="34" fill="#D1FAE5">Mundial 2026</text>`,
    // Eyebrow + nombre de la polla.
    `<text x="${cx}" y="${baseY + 86}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="30" letter-spacing="8" fill="#0D9488">COMPROBANTE DE PAGO</text>`,
    `<text x="${cx}" y="${baseY + 162}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="58" fill="#0B1C30">${esc(recortar(grupo, 26))}</text>`,
    // Bloque destacado: participante + monto del abono.
    `<rect x="${tX + 56}" y="${baseY + 210}" width="${tW - 112}" height="300" rx="32" fill="#ECFDF5"/>`,
    `<text x="${cx}" y="${baseY + 268}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="28" letter-spacing="6" fill="#15803D">PARTICIPANTE</text>`,
    `<text x="${cx}" y="${baseY + 330}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="46" fill="#0B1C30">${esc(recortar(participante, 26))}</text>`,
    `<text x="${cx}" y="${baseY + 452}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="104" fill="#15803D">${esc(pesos(abono))}</text>`,
    // Píldora con el método de pago.
    `<g transform="translate(${cx} ${baseY + 540})">`,
    `<rect x="${-pillW / 2}" y="-44" width="${pillW}" height="74" rx="37" fill="${pillBg}"/>`,
    `<text x="0" y="6" text-anchor="middle" font-family="Geist" font-weight="700" font-size="34" letter-spacing="3" fill="#FFFFFF">${esc(recortar(pillTxt, 22))}</text>`,
    `</g>`,
    filasSvg,
    // Perforación + talón con el CÓDIGO (clave de verificación).
    `<line x1="${tX + 40}" y1="${perfY}" x2="${tX + tW - 40}" y2="${perfY}" stroke="#CBD5E1" stroke-width="3" stroke-dasharray="14 12" stroke-linecap="round"/>`,
    `<text x="${cx}" y="${perfY + 85}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="24" letter-spacing="6" fill="#0D9488">CÓDIGO DE COMPROBANTE</text>`,
    `<text x="${cx}" y="${perfY + 130}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="32" letter-spacing="2" fill="#0B1C30">${esc(codigo)}</text>`,
    barras,
    `<text x="${cx}" y="${perfY + 295}" text-anchor="middle" font-family="Geist" font-weight="700" font-size="30" letter-spacing="4" fill="#0B1C30">pollota.com</text>`,
    `<text x="${cx}" y="${perfY + 337}" text-anchor="middle" font-family="Geist" font-size="26" fill="#94A3B8">${esc(APP_DESCRIPCION)}</text>`,
    `</g>`,
    // Muescas de la perforación (pintadas con el color del fondo → ilusión de corte).
    `<circle cx="${tX}" cy="${perfY}" r="${notchR}" fill="url(#bg)"/>`,
    `<circle cx="${tX + tW}" cy="${perfY}" r="${notchR}" fill="url(#bg)"/>`,
    `</svg>`,
  ].join("");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const grupo = (searchParams.get("g") ?? "").trim() || "Polla";
    const participante = (searchParams.get("p") ?? "").trim() || "Participante";
    const abono = entero(searchParams.get("a"));
    const valor = entero(searchParams.get("v"));
    const metodo = (searchParams.get("m") ?? "").trim();
    const codigo = (searchParams.get("c") ?? "").trim() || "—";
    const fechaParam = searchParams.get("f");
    const fechaISO =
      fechaParam && !Number.isNaN(new Date(fechaParam).getTime())
        ? fechaParam
        : new Date().toISOString();

    const svg = construirSvg({
      grupo,
      participante,
      abono,
      valor,
      metodo,
      codigo,
      fechaISO,
    });

    // Import perezoso: si el binario nativo de resvg no carga en la función
    // serverless (empaquetado de Netlify), el fallo cae en este try/catch y se
    // reporta con detalle, en vez de tumbar el módulo entero ("Internal Server
    // Error" opaco al fallar en el import de arriba).
    const { Resvg } = await import("@resvg/resvg-js");
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1080 },
      font: {
        loadSystemFonts: false,
        fontFiles: [RUTA_FUENTE],
        defaultFontFamily: "Geist",
      },
    });
    const png = resvg.render().asPng();

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Comprobante personal: que no lo cachee ninguna capa intermedia.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    // Sin esto, cualquier fallo al rasterizar (fuente ausente, binario nativo de
    // resvg que no carga, SVG inválido…) devolvía un 500 mudo y el cliente solo
    // mostraba "No se pudo generar el comprobante". Logueamos el error real en el
    // servidor para poder diagnosticarlo; en dev lo exponemos en el cuerpo.
    console.error("[comprobante-pago] Fallo al generar el PNG:", error);
    const detalle =
      error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      process.env.NODE_ENV === "development"
        ? `No se pudo generar el comprobante: ${detalle}`
        : "No se pudo generar el comprobante",
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
