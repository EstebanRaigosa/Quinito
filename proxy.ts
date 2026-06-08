import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy (antes "middleware"). Refresca la sesión de Supabase en cada request y
 * protege rutas. Next 16 renombró la convención `middleware` → `proxy`.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todo excepto:
     * - archivos estáticos de Next (_next/static, _next/image)
     * - favicon, manifest PWA y banderas locales (public/flags)
     * - imágenes (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|flags|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
