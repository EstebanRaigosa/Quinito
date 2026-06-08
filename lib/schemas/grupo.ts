import { z } from "zod";

export const datosGrupoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(50, "Máximo 50 caracteres"),
  descripcion: z
    .string()
    .trim()
    .max(280, "Máximo 280 caracteres")
    .optional()
    .or(z.literal("")),
});
export type DatosGrupoInput = z.infer<typeof datosGrupoSchema>;
