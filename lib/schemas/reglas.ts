import { z } from "zod";

const enteroNoNegativo = (etiqueta: string) =>
  z
    .number({ message: `${etiqueta} debe ser un número` })
    .int(`${etiqueta} debe ser entero`)
    .min(0, `${etiqueta} no puede ser negativo`);

const porcentaje = (etiqueta: string) =>
  z
    .number({ message: `${etiqueta} debe ser un número` })
    .int()
    .min(0, `${etiqueta} entre 0 y 100`)
    .max(100, `${etiqueta} entre 0 y 100`);

export const reglasSchema = z
  .object({
    pts_marcador_exacto: enteroNoNegativo("Marcador exacto"),
    pts_ganador: enteroNoNegativo("Ganador acertado"),
    pts_gol_acertado: enteroNoNegativo("Gol acertado"),
    pts_prediccion_unica: enteroNoNegativo("Predicción única"),
    bono_dieciseisavos: enteroNoNegativo("Bono dieciseisavos"),
    bono_octavos: enteroNoNegativo("Bono octavos"),
    bono_cuartos: enteroNoNegativo("Bono cuartos"),
    bono_semifinales: enteroNoNegativo("Bono semifinales"),
    bono_final: enteroNoNegativo("Bono final"),
    valor_apuesta: z
      .number({ message: "Valor de apuesta debe ser un número" })
      .int("El valor debe ser un número entero de pesos")
      .min(0, "No puede ser negativo"),
    premio_primer_lugar: porcentaje("Premio 1er lugar"),
    premio_segundo_lugar: porcentaje("Premio 2do lugar"),
    premio_tercer_lugar: porcentaje("Premio 3er lugar"),
    // Parte del pozo reservada para gastos de administración (no entra al
    // reparto de premios). Los premios se calculan sobre el pozo neto.
    porcentaje_administracion: porcentaje("Administración"),
    minutos_cierre_prediccion: enteroNoNegativo("Minutos de cierre"),
    // Orden de desempate (a igualdad de puntos). Puede ir vacío → alfabético.
    criterios_desempate: z
      .array(z.enum(["exactos", "unicas", "aciertos"]))
      .max(3, "Máximo 3 criterios"),
  })
  .refine(
    (r) =>
      r.premio_primer_lugar + r.premio_segundo_lugar + r.premio_tercer_lugar ===
      100,
    {
      message: "Los premios deben sumar exactamente 100%",
      path: ["premio_primer_lugar"],
    },
  );
export type ReglasInput = z.infer<typeof reglasSchema>;

export const reglasDefault: ReglasInput = {
  pts_marcador_exacto: 5,
  pts_ganador: 2,
  pts_gol_acertado: 1,
  pts_prediccion_unica: 2,
  bono_dieciseisavos: 10,
  bono_octavos: 8,
  bono_cuartos: 4,
  bono_semifinales: 2,
  bono_final: 5,
  valor_apuesta: 0,
  premio_primer_lugar: 60,
  premio_segundo_lugar: 30,
  premio_tercer_lugar: 10,
  porcentaje_administracion: 0,
  minutos_cierre_prediccion: 5,
  criterios_desempate: ["exactos", "unicas", "aciertos"],
};
