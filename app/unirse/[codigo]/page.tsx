import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Trophy, Users } from "lucide-react";
import { IlustracionFutbolHero } from "@/components/auth/IlustracionFutbolHero";
import { Logo } from "@/components/shared/Logo";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";

/** Normaliza el código de la URL: mayúsculas, solo alfanuméricos, máx. 6. */
function normalizar(codigo: string): string {
  return decodeURIComponent(codigo)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo: raw } = await params;
  const codigo = normalizar(raw);
  const titulo = "Te invitaron a una polla del Mundial 2026";
  const descripcion = `Únete con el código ${codigo}. Predice marcadores, compite con tu parche y corona al campeón.`;

  return {
    title: "Te invitaron a jugar",
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      url: `/unirse/${codigo}`,
      images: [
        {
          url: "/images/estadio.png",
          width: 1200,
          height: 630,
          alt: "Estadio de fútbol lleno visto desde la grada, con las luces encendidas",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descripcion,
      images: ["/images/estadio.png"],
    },
  };
}

export default async function UnirsePage({ params }: Props) {
  const { codigo: raw } = await params;
  const codigo = normalizar(raw);

  // Destino final: la pantalla de búsqueda con el código pre-cargado.
  const destino = `/grupos/buscar?codigo=${codigo}`;

  // Si ya hay sesión, lo llevamos directo a unirse (sin fricción).
  const user = await getUsuarioActual();
  if (user) redirect(destino);

  const loginHref = `/login?next=${encodeURIComponent(destino)}`;
  const registroHref = `/registro?next=${encodeURIComponent(destino)}`;

  return (
    <div className="flex min-h-dvh flex-col bg-app">
      {/* Hero con la foto del estadio */}
      <header className="relative px-6 pb-20 pt-[calc(env(safe-area-inset-top)+3rem)]">
        <IlustracionFutbolHero className="absolute inset-0" />
        <div className="relative animate-fade-up">
          <Logo size={18} className="[&_span:last-child]:text-white" />
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-pill bg-mustard-400/90 px-3 py-1 text-2xs font-extrabold uppercase tracking-[0.12em] text-mustard-900 shadow-glow">
            <Trophy className="size-3.5" />
            Mundial 2026
          </span>
          <h1 className="t-display mt-4 text-white drop-shadow-sm">
            ¡Te invitaron a jugar!
          </h1>
          <p className="t-body-sm mt-1.5 max-w-[18rem] text-white/85">
            Un amigo te invitó a su polla del Mundial 2026. Únete, predice los
            marcadores y compite por la corona.
          </p>
        </div>
      </header>

      {/* Hoja con el código y CTAs */}
      <main className="relative -mt-10 flex-1 rounded-t-3xl bg-surface px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-8 shadow-lg">
        <div className="mx-auto max-w-sm animate-fade-up space-y-6 [animation-delay:80ms]">
          <div className="space-y-2 text-center">
            <span className="overline block">Código de invitación</span>
            <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-primary bg-primary-soft/40 px-5 py-3">
              <span className="text-3xl font-extrabold uppercase tracking-[0.3em] text-fg-strong">
                {codigo}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-xl bg-sunken px-4 py-3 text-center">
            <Users className="size-4 shrink-0 text-primary" />
            <p className="t-body-sm text-fg-muted">
              Inicia sesión o crea tu cuenta para unirte al grupo.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href={loginHref}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
            >
              Iniciar sesión y unirme
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={registroHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-input bg-surface text-base font-bold text-fg-strong transition-colors hover:border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Crear cuenta nueva
            </Link>
          </div>

          <p className="t-caption text-center text-fg-subtle">
            Al continuar aceptas los términos y la política de privacidad de Polla.
          </p>
        </div>
      </main>
    </div>
  );
}
