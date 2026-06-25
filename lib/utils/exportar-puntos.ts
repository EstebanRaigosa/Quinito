import type {
  BonoFase,
  FilaTablaPosiciones,
  Partido,
  Prediccion,
  ReglasGrupo,
} from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";
import { desglosePuntaje, nivelAcierto } from "@/lib/utils/prediccion";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";

/**
 * Exporta a Excel (.xlsx) con formato el detalle de puntos de UN participante,
 * pensado para VALIDAR que la suma de puntos cuadra: tabla con bordes y
 * encabezados de color, desglose por partido (cada concepto que puntuó), bonos
 * de fase, puntaje de arranque y una fila de TOTAL con fórmula `SUM` real más la
 * comparación contra el TOTAL oficial de la tabla.
 *
 * `exceljs` se carga de forma diferida (dynamic import) para no inflar el bundle
 * principal: solo se descarga cuando el usuario pulsa "Exportar".
 */

/** Predicción cruzada con su partido (solo partidos finalizados). */
export type ItemPuntos = { partido: Partido; prediccion: Prediccion };

/** Columnas de la tabla de partidos (en orden). */
const COLUMNAS = [
  { titulo: "Fecha", ancho: 22 },
  { titulo: "Fase", ancho: 16 },
  { titulo: "Grupo", ancho: 8 },
  { titulo: "Local", ancho: 18 },
  { titulo: "Visitante", ancho: 18 },
  { titulo: "Marcador real", ancho: 13 },
  { titulo: "Predicción", ancho: 12 },
  { titulo: "Tipo de acierto", ancho: 14 },
  { titulo: "Única", ancho: 8 },
  { titulo: "Marcador exacto", ancho: 15 },
  { titulo: "Predicción única", ancho: 15 },
  { titulo: "Ganador", ancho: 10 },
  { titulo: "Gol local", ancho: 10 },
  { titulo: "Gol visitante", ancho: 12 },
  { titulo: "Puntos partido", ancho: 13 },
] as const;

/** Total de columnas de la tabla. */
const N_COLS = COLUMNAS.length;
/** Índice (1-based) de la columna "Puntos partido". */
const COL_PUNTOS = N_COLS;

/** Paleta sobria (ARGB). */
const COLOR = {
  encabezado: "FF0F172A", // slate-900
  encabezadoTexto: "FFFFFFFF",
  subtotal: "FFE2E8F0", // slate-200
  cebra: "FFF8FAFC", // slate-50
  total: "FFDCFCE7", // emerald-100
  borde: "FFCBD5E1", // slate-300
} as const;

/** Borde fino gris en los cuatro lados. */
const BORDE_FINO = {
  top: { style: "thin", color: { argb: COLOR.borde } },
  left: { style: "thin", color: { argb: COLOR.borde } },
  bottom: { style: "thin", color: { argb: COLOR.borde } },
  right: { style: "thin", color: { argb: COLOR.borde } },
} as const;

/** Etiqueta legible del tipo de acierto. */
const ETIQUETA_NIVEL: Record<string, string> = {
  unico: "Único",
  exacto: "Exacto",
  parcial: "Parcial",
  ninguno: "—",
};

/** Suma los puntos del desglose que correspondan a una etiqueta concreta. */
function puntosDe(
  desglose: ReturnType<typeof desglosePuntaje>,
  label: string,
): number {
  return desglose
    .filter((d) => d.label === label)
    .reduce((acc, d) => acc + d.puntos, 0);
}

/** Convierte el nombre del participante en un slug seguro para el archivo. */
function slugArchivo(nombre: string): string {
  return (
    nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "participante"
  );
}

/** Dispara la descarga de un Blob (compatible con iOS 15+/Android). */
function descargar(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Genera y descarga el .xlsx con el detalle de puntos del participante. Async
 * porque `exceljs` se importa de forma diferida y el armado del libro es awaitable.
 */
export async function exportarDetalleParticipante({
  fila,
  items,
  bonos,
  reglas,
}: {
  fila: FilaTablaPosiciones;
  items: ItemPuntos[];
  bonos: BonoFase[];
  reglas: ReglasGrupo;
}): Promise<void> {
  const mod = await import("exceljs");
  const ExcelJS: typeof import("exceljs") =
    (mod as { default?: typeof import("exceljs") }).default ?? mod;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Pollota";
  const ws = wb.addWorksheet("Puntos");

  // Anchos de columna.
  COLUMNAS.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.ancho;
  });

  // ── Encabezado / metadatos ────────────────────────────────────────────────
  const titulo = ws.addRow(["Detalle de puntos"]);
  ws.mergeCells(titulo.number, 1, titulo.number, N_COLS);
  titulo.getCell(1).font = {
    bold: true,
    size: 16,
    color: { argb: COLOR.encabezado },
  };
  titulo.height = 24;

  const filaPart = ws.addRow(["Participante", fila.nombre_completo]);
  filaPart.getCell(1).font = { bold: true };
  ws.mergeCells(filaPart.number, 2, filaPart.number, 5);

  const filaPuesto = ws.addRow(["Puesto", fila.posicion]);
  filaPuesto.getCell(1).font = { bold: true };

  ws.addRow([]); // separador

  // ── Tabla de partidos ─────────────────────────────────────────────────────
  const encabezado = ws.addRow(COLUMNAS.map((c) => c.titulo));
  encabezado.height = 30;
  for (let c = 1; c <= N_COLS; c++) {
    const cell = encabezado.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR.encabezado },
    };
    cell.font = { bold: true, color: { argb: COLOR.encabezadoTexto } };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = BORDE_FINO;
  }

  const primeraFilaDatos = encabezado.number + 1;
  // Columnas que van centradas (marcadores, única y todas las de puntos).
  const COLS_CENTRO = new Set([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  items.forEach(({ partido, prediccion }, idx) => {
    const desglose = desglosePuntaje(prediccion, partido, reglas);
    const nivel = nivelAcierto(prediccion, partido);

    const r = ws.addRow([
      formatearFechaHoraBogota(partido.fecha_hora),
      ETIQUETA_FASE[partido.fase],
      partido.grupo ?? "",
      partido.equipo_local?.nombre ?? "—",
      partido.equipo_visitante?.nombre ?? "—",
      `${partido.goles_local}-${partido.goles_visitante}`,
      `${prediccion.goles_local}-${prediccion.goles_visitante}`,
      ETIQUETA_NIVEL[nivel] ?? "—",
      prediccion.prediccion_unica ? "Sí" : "No",
      puntosDe(desglose, "Marcador exacto"),
      puntosDe(desglose, "Predicción única"),
      puntosDe(desglose, "Ganador acertado"),
      puntosDe(desglose, "Gol del local"),
      puntosDe(desglose, "Gol del visitante"),
      prediccion.puntos_obtenidos,
    ]);

    for (let c = 1; c <= N_COLS; c++) {
      const cell = r.getCell(c);
      cell.border = BORDE_FINO;
      if (COLS_CENTRO.has(c)) cell.alignment = { horizontal: "center" };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLOR.cebra },
        };
      }
    }
    r.getCell(COL_PUNTOS).font = { bold: true };
  });

  const ultimaFilaDatos = primeraFilaDatos + items.length - 1;

  // Subtotal de partidos (fórmula SUM real sobre la columna de puntos).
  const subPartidos = ws.addRow([]);
  ws.mergeCells(subPartidos.number, 1, subPartidos.number, N_COLS - 1);
  subPartidos.getCell(1).value = "Subtotal partidos";
  subPartidos.getCell(1).alignment = { horizontal: "right" };
  subPartidos.getCell(1).font = { bold: true };
  subPartidos.getCell(COL_PUNTOS).value =
    items.length > 0
      ? {
          formula: `SUM(O${primeraFilaDatos}:O${ultimaFilaDatos})`,
          result: items.reduce(
            (a, it) => a + it.prediccion.puntos_obtenidos,
            0,
          ),
        }
      : 0;
  subPartidos.getCell(COL_PUNTOS).font = { bold: true };
  for (let c = 1; c <= N_COLS; c++) {
    subPartidos.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR.subtotal },
    };
    subPartidos.getCell(c).border = BORDE_FINO;
  }
  const celSubPartidos = `O${subPartidos.number}`;

  // ── Bonos de fase (opcional) ──────────────────────────────────────────────
  let celSubBonos: string | null = null;
  if (bonos.length > 0) {
    ws.addRow([]); // separador
    const encBonos = ws.addRow(["Bonos de fase", "Puntos"]);
    for (let c = 1; c <= 2; c++) {
      const cell = encBonos.getCell(c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLOR.encabezado },
      };
      cell.font = { bold: true, color: { argb: COLOR.encabezadoTexto } };
      cell.alignment = { horizontal: c === 1 ? "left" : "center" };
      cell.border = BORDE_FINO;
    }

    const primerBono = encBonos.number + 1;
    bonos.forEach((bono) => {
      const r = ws.addRow([ETIQUETA_FASE[bono.fase], bono.puntos]);
      r.getCell(1).border = BORDE_FINO;
      r.getCell(2).border = BORDE_FINO;
      r.getCell(2).alignment = { horizontal: "center" };
    });
    const ultimoBono = primerBono + bonos.length - 1;

    const subBonos = ws.addRow(["Subtotal bonos", null]);
    subBonos.getCell(2).value = {
      formula: `SUM(B${primerBono}:B${ultimoBono})`,
      result: bonos.reduce((a, b) => a + b.puntos, 0),
    };
    for (let c = 1; c <= 2; c++) {
      subBonos.getCell(c).font = { bold: true };
      subBonos.getCell(c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLOR.subtotal },
      };
      subBonos.getCell(c).border = BORDE_FINO;
    }
    subBonos.getCell(2).alignment = { horizontal: "center" };
    celSubBonos = `B${subBonos.number}`;
  }

  // ── Totales y validación ──────────────────────────────────────────────────
  ws.addRow([]); // separador

  let celIniciales: string | null = null;
  if (fila.puntos_iniciales > 0) {
    const rIni = ws.addRow(["Puntaje de arranque", fila.puntos_iniciales]);
    rIni.getCell(1).font = { bold: true };
    rIni.getCell(2).alignment = { horizontal: "center" };
    celIniciales = `B${rIni.number}`;
  }

  // TOTAL calculado = subtotal partidos (+ bonos) (+ arranque), como fórmula.
  const partesFormula = [celSubPartidos];
  if (celSubBonos) partesFormula.push(celSubBonos);
  if (celIniciales) partesFormula.push(celIniciales);
  const totalCalculado =
    items.reduce((a, it) => a + it.prediccion.puntos_obtenidos, 0) +
    bonos.reduce((a, b) => a + b.puntos, 0) +
    fila.puntos_iniciales;

  const rTotalCalc = ws.addRow(["TOTAL calculado", null]);
  rTotalCalc.getCell(2).value = {
    formula: partesFormula.join("+"),
    result: totalCalculado,
  };
  for (let c = 1; c <= 2; c++) {
    rTotalCalc.getCell(c).font = { bold: true };
    rTotalCalc.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLOR.total },
    };
    rTotalCalc.getCell(c).border = BORDE_FINO;
  }
  rTotalCalc.getCell(2).alignment = { horizontal: "center" };
  const celTotalCalc = `B${rTotalCalc.number}`;

  const rTotalOficial = ws.addRow([
    "TOTAL oficial (tabla)",
    fila.puntos_totales,
  ]);
  rTotalOficial.getCell(1).font = { bold: true };
  rTotalOficial.getCell(2).font = { bold: true };
  rTotalOficial.getCell(2).alignment = { horizontal: "center" };
  for (let c = 1; c <= 2; c++) rTotalOficial.getCell(c).border = BORDE_FINO;
  const celTotalOficial = `B${rTotalOficial.number}`;

  const rCoincide = ws.addRow(["¿Coincide?", null]);
  rCoincide.getCell(1).font = { bold: true };
  rCoincide.getCell(2).value = {
    formula: `IF(${celTotalCalc}=${celTotalOficial},"Sí","NO — revisar")`,
    result: totalCalculado === fila.puntos_totales ? "Sí" : "NO — revisar",
  };
  rCoincide.getCell(2).alignment = { horizontal: "center" };
  for (let c = 1; c <= 2; c++) rCoincide.getCell(c).border = BORDE_FINO;

  // Congelar el encabezado de la tabla al hacer scroll.
  ws.views = [{ state: "frozen", ySplit: encabezado.number }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  descargar(blob, `puntos_${slugArchivo(fila.nombre_completo)}.xlsx`);
}
