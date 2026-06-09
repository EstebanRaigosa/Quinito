import type { AuthError } from "@supabase/supabase-js";

/**
 * Traduce errores de Supabase Auth a mensajes en español (es-CO) para la UI.
 * No exponer detalles técnicos al usuario (CLAUDE.md §4.6).
 */
export function mensajeErrorAuth(error: AuthError | null): string {
  if (!error) return "Algo salió mal. Intenta de nuevo.";

  const code = error.code ?? "";
  const msg = error.message.toLowerCase();

  if (code === "invalid_credentials" || msg.includes("invalid login"))
    return "Email o contraseña incorrectos.";
  if (code === "email_not_confirmed" || msg.includes("email not confirmed"))
    return "Confirma tu correo antes de iniciar sesión.";
  if (code === "user_already_exists" || msg.includes("already registered"))
    return "Ya tienes una cuenta con este correo. Inicia sesión con tu contraseña o con Google; si no la recuerdas, usa '¿Olvidaste tu contraseña?'.";
  if (code === "weak_password" || msg.includes("password"))
    return "La contraseña no cumple los requisitos (mínimo 8 caracteres y 1 número).";
  if (code === "over_email_send_rate_limit" || msg.includes("rate limit"))
    return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
  if (code === "validation_failed" || msg.includes("invalid email"))
    return "El email no es válido.";

  return "No se pudo completar la acción. Intenta de nuevo.";
}
