import { z } from "zod";

/**
 * Nombre visible del usuario (el que ven los demás en pollas, tablas y
 * participantes). Mismo rango que el registro para mantener consistencia.
 */
export const nombrePerfilSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(80, "Máximo 80 caracteres"),
});
export type NombrePerfilInput = z.infer<typeof nombrePerfilSchema>;
