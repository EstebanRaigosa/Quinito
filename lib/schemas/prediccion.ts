import { z } from "zod";

export const prediccionSchema = z.object({
  goles_local: z
    .number({ message: "Ingresa los goles" })
    .int("Solo números enteros")
    .min(0, "No puede ser negativo")
    .max(99, "Máximo 99"),
  goles_visitante: z
    .number({ message: "Ingresa los goles" })
    .int("Solo números enteros")
    .min(0, "No puede ser negativo")
    .max(99, "Máximo 99"),
});
export type PrediccionInput = z.infer<typeof prediccionSchema>;
