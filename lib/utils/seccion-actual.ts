/**
 * Traduce el `pathname` actual a un nombre de sección legible para el panel de
 * "Usuarios conectados" del admin. Deliberadamente genérico en las rutas con id
 * (pollas) para no exponer de más: basta con saber que el usuario "está en una
 * polla", no en cuál.
 */
export function nombreSeccion(pathname: string): string {
  if (!pathname || pathname === "/" || pathname === "/dashboard") return "Inicio";
  if (pathname.startsWith("/partidos")) return "Partidos";
  if (pathname === "/grupos/buscar") return "Buscar polla";
  if (pathname === "/grupos/crear") return "Creando una polla";
  if (pathname.endsWith("/configurar")) return "Configurando una polla";
  if (pathname.startsWith("/grupos/")) return "En una polla";
  if (pathname.startsWith("/perfil")) return "Perfil";
  if (pathname.startsWith("/notificaciones")) return "Notificaciones";
  if (pathname.startsWith("/admin")) return "Administración";
  return "Navegando";
}
