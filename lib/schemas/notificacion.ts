import { z } from "zod";

/**
 * Validación de una notificación del centro (superadmin). El título y el cuerpo
 * son obligatorios; el resto opcional. `url` se valida como ruta interna o URL
 * absoluta. La audiencia decide qué identificador es obligatorio (lo refuerza el
 * RPC `crear_notificacion` en la BD).
 */
export const notificacionSchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .min(1, "Escribe un título")
      .max(80, "Máximo 80 caracteres"),
    cuerpo: z
      .string()
      .trim()
      .min(1, "Escribe el mensaje")
      .max(180, "Máximo 180 caracteres"),
    url: z
      .string()
      .trim()
      .max(300, "El enlace es muy largo")
      .optional()
      .or(z.literal("")),
    imagen_url: z
      .string()
      .trim()
      .url("Debe ser una URL válida (https://…)")
      .optional()
      .or(z.literal("")),
    accion_label: z
      .string()
      .trim()
      .max(24, "Máximo 24 caracteres")
      .optional()
      .or(z.literal("")),
    audiencia_tipo: z.enum(["plataforma", "polla", "usuario"]),
    grupo_id: z.string().uuid().optional().or(z.literal("")),
    usuario_id: z.string().uuid().optional().or(z.literal("")),
  })
  .refine(
    (d) => d.audiencia_tipo !== "polla" || (d.grupo_id && d.grupo_id !== ""),
    { message: "Elige la polla destino", path: ["grupo_id"] },
  )
  .refine(
    (d) => d.audiencia_tipo !== "usuario" || (d.usuario_id && d.usuario_id !== ""),
    { message: "Elige el usuario destino", path: ["usuario_id"] },
  );

export type NotificacionInput = z.infer<typeof notificacionSchema>;
