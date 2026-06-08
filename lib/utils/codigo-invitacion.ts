/**
 * Generación de códigos de invitación de 6 caracteres alfanuméricos.
 * Se excluyen caracteres ambiguos (0/O, 1/I) para facilitar dictado.
 * En producción, la unicidad se valida contra `tblGrupos.codigo_invitacion`.
 */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generarCodigoInvitacion(longitud = 6): string {
  let codigo = "";
  for (let i = 0; i < longitud; i++) {
    codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return codigo;
}

/** Normaliza un código ingresado por el usuario (mayúsculas, sin espacios). */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/\s+/g, "");
}
