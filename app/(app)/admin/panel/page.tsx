import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardCheck,
  ListOrdered,
  Radio,
  Receipt,
  ScrollText,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { PageContainer } from "@/components/shared/PageContainer";

export const metadata: Metadata = {
  title: "Admin · Panel",
};

/** Secciones del panel de administración (solo super-admin de plataforma). */
const SECCIONES = [
  {
    href: "/admin",
    titulo: "Resultados",
    descripcion:
      "Ingresa el marcador real de cada partido. Al guardar se recalculan los puntos de todas las pollas.",
    Icono: ClipboardCheck,
  },
  {
    href: "/admin/clasificacion",
    titulo: "Clasificación",
    descripcion:
      "Revisa y ajusta la clasificación de los grupos antes de poblar las eliminatorias.",
    Icono: ListOrdered,
  },
  {
    href: "/admin/notificaciones",
    titulo: "Centro de notificaciones",
    descripcion:
      "Redacta y envía push a toda la plataforma, a una polla o a una persona.",
    Icono: Bell,
  },
  {
    href: "/admin/pollas",
    titulo: "Pollas",
    descripcion: "Explora todas las pollas creadas en la plataforma.",
    Icono: Trophy,
  },
  {
    href: "/admin/torneos",
    titulo: "Torneos",
    descripcion:
      "Marca qué torneos están disponibles en el wizard de creación de pollas.",
    Icono: CalendarDays,
  },
  {
    href: "/admin/comprobantes",
    titulo: "Comprobantes",
    descripcion:
      "Verifica un comprobante de pago por su código: cuándo se pagó y por cuánto.",
    Icono: Receipt,
  },
  {
    href: "/admin/conectados",
    titulo: "Conectados",
    descripcion:
      "Usuarios conectados en tiempo real y dispositivos con la PWA instalada.",
    Icono: Radio,
  },
  {
    href: "/admin/auditoria",
    titulo: "Auditoría",
    descripcion: "Registro de cambios y acciones sensibles por polla.",
    Icono: ScrollText,
  },
] as const;

export default async function AdminPanelPage() {
  // Reusa la sesión ya validada por el layout (acierto de caché, sin round-trip).
  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  // Solo super-admin de plataforma (no admin de grupo).
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  return (
    <PageContainer ancho="ancho" className="space-y-7">
      <header className="animate-fade-up">
        <p className="overline flex items-center gap-2 text-primary">
          <ShieldCheck className="size-4" /> Admin de plataforma
        </p>
        <h1 className="t-display mt-1.5">Administración</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Todo el control de la plataforma en un solo lugar. Escoge una sección
          para empezar.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECCIONES.map(({ href, titulo, descripcion, Icono }, i) => (
          <Link
            key={href}
            href={href}
            className="surface-card group animate-fade-up flex items-start gap-4 rounded-xl p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icono className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="t-h4 truncate">{titulo}</h2>
                <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="t-caption mt-1 text-fg-muted">{descripcion}</p>
            </div>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
