import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { BotonGoogle } from "@/components/auth/BotonGoogle";
import { FormularioRegistro } from "@/components/auth/FormularioRegistro";
import { IlustracionFutbolHero } from "@/components/auth/IlustracionFutbolHero";
import { PanelEstadio } from "@/components/auth/PanelEstadio";
import { ReflectoresFondo } from "@/components/auth/ReflectoresFondo";
import { Logo } from "@/components/shared/Logo";
import { destinoSeguro } from "@/lib/utils/next-redirect";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

function BadgeMundial() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-mustard-100 px-3 py-1 text-2xs font-extrabold uppercase tracking-[0.12em] text-mustard-700 shadow-xs">
      <Trophy className="size-3.5" />
      Mundial 2026
    </span>
  );
}

function Separador({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-border" />
      <span className="text-2xs font-extrabold uppercase tracking-[0.18em] text-fg-subtle">
        {texto}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Campos + Google + link — orden compartido entre mobile y desktop. */
function ContenidoRegistro({ destino }: { destino: string }) {
  const esDefault = destino === "/dashboard";
  const loginHref = esDefault
    ? "/login"
    : `/login?next=${encodeURIComponent(destino)}`;

  return (
    <>
      <div className="space-y-5">
        <FormularioRegistro destino={destino} />
        <Separador texto="O regístrate con Google" />
        <BotonGoogle texto="Registrarse con Google" next={destino} />
      </div>

      <p className="t-body-sm text-center text-fg-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={loginHref}
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </>
  );
}

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destino = destinoSeguro(next);

  return (
    <>
      {/* ───────── Mobile: hero de color + hoja blanca ───────── */}
      <div className="flex min-h-dvh flex-col md:hidden">
        <header className="relative px-6 pb-16 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
          <IlustracionFutbolHero className="absolute inset-0" />
          <div className="relative animate-fade-up">
            <Link
              href={destino === "/dashboard" ? "/login" : `/login?next=${encodeURIComponent(destino)}`}
              className="t-body-sm inline-flex min-h-11 items-center gap-1.5 font-semibold text-white/90 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" /> Volver a iniciar sesión
            </Link>
            <h1 className="t-display mt-3 text-white drop-shadow-sm">¡Bienvenido!</h1>
            <p className="t-body-sm mt-1 max-w-[16rem] text-white/85">
              Crea tu cuenta en Pollota, las pollas del Mundial.
            </p>
          </div>
        </header>

        <main className="relative -mt-9 flex-1 rounded-t-3xl bg-surface px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-8 shadow-lg">
          <div className="animate-fade-up space-y-6 [animation-delay:80ms]">
            <div className="space-y-2">
              <BadgeMundial />
              <h2 className="t-h2 text-fg-strong">Crear cuenta</h2>
            </div>
            <ContenidoRegistro destino={destino} />
            <p className="t-caption text-center text-fg-subtle">
              Al continuar aceptas los términos y la política de privacidad de Pollota.
            </p>
          </div>
        </main>
      </div>

      {/* ───────── Desktop: marco split sobre fondo verde con reflectores ───────── */}
      <div className="relative hidden min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-mustard-500 via-mustard-700 to-mustard-900 px-6 py-10 md:flex">
        <ReflectoresFondo />
        <div className="relative w-full max-w-6xl animate-fade-up">
          <div className="overflow-hidden rounded-3xl bg-clay-900 p-2.5 shadow-xl ring-1 ring-mustard-400/20">
            <div className="grid overflow-hidden rounded-[1.4rem] md:grid-cols-2">
              {/* Imagen con texto + stats superpuestos */}
              <PanelEstadio
                titulo="¡Únete al juego!"
                descripcion="Crea tu cuenta y arma tu polla del Mundial 2026 con tus amigos."
                className="min-h-[720px]"
              />

              {/* Formulario */}
              <div className="flex flex-col justify-center gap-6 bg-surface p-10 lg:p-12">
                <div>
                  <Logo size={20} />
                  <h1 className="t-h1 mt-5">Crear cuenta</h1>
                  <p className="t-body-sm mt-1.5 text-fg-muted">
                    Completa tus datos para empezar a jugar.
                  </p>
                </div>
                <ContenidoRegistro destino={destino} />
                <p className="t-caption text-fg-subtle">
                  Al continuar aceptas los términos y la política de privacidad de Pollota.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
