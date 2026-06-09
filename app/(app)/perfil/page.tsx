import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMisGrupos } from "@/lib/queries/grupos";
import { getPerfilActual, getUsuarioActual } from "@/lib/auth/usuario-actual";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { PageContainer } from "@/components/shared/PageContainer";
import { BotonInstalarPWA } from "@/components/shared/BotonInstalarPWA";
import { Card } from "@/components/ui/card";
import { AccionesPerfil } from "@/components/perfil/AccionesPerfil";

export const metadata: Metadata = {
  title: "Mi perfil",
};

/** Una métrica del bloque de stats del perfil (número héroe + etiqueta). */
function StatPerfil({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 px-2 py-1 text-center">
      <span className="t-stat leading-none">{valor}</span>
      <span className="overline text-fg-subtle">{etiqueta}</span>
    </div>
  );
}

export default async function PerfilPage() {
  // Reutiliza los helpers cacheados por request (`cache()` de React): el layout
  // `(app)` ya resolvió usuario, perfil y grupos en este mismo render, así que
  // aquí son aciertos de caché en vez de 3 round-trips nuevos a la base.
  const [user, perfil, grupos] = await Promise.all([
    getUsuarioActual(),
    getPerfilActual(),
    getMisGrupos(),
  ]);
  if (!user) redirect("/login");

  const nombre = perfil?.nombre_completo ?? user.email ?? "Usuario";
  const email = perfil?.email ?? user.email ?? "";
  const puntosTotales = grupos.reduce((acc, g) => acc + g.mis_puntos, 0);
  const mejorPosicionNum = grupos.length
    ? Math.min(...grupos.map((g) => g.mi_posicion ?? Infinity))
    : 0;
  const mejorPosicion = Number.isFinite(mejorPosicionNum)
    ? `#${mejorPosicionNum}`
    : "—";

  return (
    <PageContainer ancho="estrecho" className="space-y-6">
      {/* Cabecera: avatar centrado + nombre + email (estilo mockup móvil) */}
      <header className="flex animate-fade-up flex-col items-center gap-3 pt-2 text-center">
        <AvatarNotion
          nombre={nombre}
          size="xl"
          tint="clay"
          className="size-20 shadow-md ring-2 ring-app"
        />
        <div className="min-w-0">
          <h1 className="t-h3 truncate">{nombre}</h1>
          <p className="t-body-sm mt-0.5 truncate text-fg-muted">{email}</p>
        </div>
      </header>

      {/* Resumen: una sola tarjeta con 3 stats separadas por líneas */}
      {grupos.length > 0 && (
        <Card className="flex animate-fade-up items-stretch divide-x divide-border p-2 [animation-delay:60ms]">
          <StatPerfil valor={puntosTotales} etiqueta="Puntos" />
          <StatPerfil valor={mejorPosicion} etiqueta="Mejor pos." />
          <StatPerfil valor={grupos.length} etiqueta="Grupos" />
        </Card>
      )}

      {/* Instalar como app (PWA): solo aparece si es elegible y no está instalada */}
      <div className="animate-fade-up [animation-delay:100ms]">
        <BotonInstalarPWA />
      </div>

      {/* Ajustes + cerrar sesión (interactivo) */}
      <div className="animate-fade-up [animation-delay:120ms]">
        <AccionesPerfil nombre={nombre} />
      </div>
    </PageContainer>
  );
}
