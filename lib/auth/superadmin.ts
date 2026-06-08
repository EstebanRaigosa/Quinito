/**
 * Super-admin de PLATAFORMA (no es el admin de un grupo). Solo este rol puede
 * registrar el marcador real de los partidos (afecta a todas las pollas).
 *
 * Se configura por email vía `SUPERADMIN_EMAILS` (lista separada por comas).
 * Si no está definida, cae al correo del dueño del proyecto.
 */
const EMAILS_SUPERADMIN = (
  process.env.SUPERADMIN_EMAILS ?? "raigo.16@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** ¿El email pertenece a un super-admin de plataforma? */
export function esSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return EMAILS_SUPERADMIN.includes(email.toLowerCase());
}
