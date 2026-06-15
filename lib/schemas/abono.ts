import { z } from "zod";

/**
 * Validación de un abono (pago parcial). El tope superior depende del saldo
 * pendiente (dinámico) y se valida en el cliente para UX y, de forma dura, en el
 * RPC `registrar_abono`. Aquí solo lo estructural: monto positivo y nota corta.
 */
export const abonoSchema = z.object({
  monto: z
    .number({ message: "El monto debe ser un número" })
    .positive("El monto debe ser mayor a cero"),
  nota: z
    .string()
    .trim()
    .max(120, "La nota es muy larga (máx. 120 caracteres)")
    .optional()
    .or(z.literal("")),
});

export type AbonoInput = z.infer<typeof abonoSchema>;
