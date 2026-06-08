import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[0-9]/, "Debe incluir al menos un número");

export const loginSchema = z.object({
  email: z.string().min(1, "Ingresa tu email").email("Email no válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registroSchema = z
  .object({
    nombre_completo: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(80, "Máximo 80 caracteres"),
    email: z.string().min(1, "Ingresa tu email").email("Email no válido"),
    password: passwordSchema,
    confirmar: z.string(),
    terminos: z.boolean().refine((v) => v === true, {
      message: "Debes aceptar los términos",
    }),
  })
  .refine((data) => data.password === data.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });
export type RegistroInput = z.infer<typeof registroSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Ingresa tu email").email("Email no válido"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmar: z.string(),
  })
  .refine((data) => data.password === data.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
