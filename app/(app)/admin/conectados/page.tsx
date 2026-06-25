import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Radio } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { PageContainer } from "@/components/shared/PageContainer";
import {
  obtenerConectados,
  obtenerHistorialActividad,
  obtenerResumenPwa,
} from "./actions";
import { PanelConectados } from "./PanelConectados";
import { PanelInstaladosPwa } from "./PanelInstaladosPwa";
import { HistorialActividad } from "./HistorialActividad";

export const metadata: Metadata = {
  title: "Admin · Conectados",
};

// Siempre datos frescos: es un tablero en vivo, no debe cachearse.
export const dynamic = "force-dynamic";

export default async function AdminConectadosPage() {
  // Reusa la sesión ya validada por el layout (acierto de caché, sin round-trip).
  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  // Solo super-admin de plataforma.
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const [inicial, resumenPwa, historial] = await Promise.all([
    obtenerConectados(),
    obtenerResumenPwa(),
    obtenerHistorialActividad(),
  ]);

  return (
    <PageContainer ancho="ancho" className="space-y-7">
      <header className="animate-fade-up">
        <p className="overline flex items-center gap-2 text-primary">
          <Radio className="size-4" /> Admin de plataforma
        </p>
        <h1 className="t-display mt-1.5">Usuarios conectados</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Quién está en la app ahora mismo, en qué sección y desde qué
          dispositivo. Se actualiza solo cada pocos segundos.
        </p>
      </header>

      <PanelConectados inicial={inicial} />

      <hr className="border-border" />

      <PanelInstaladosPwa resumen={resumenPwa} />

      <hr className="border-border" />

      <HistorialActividad datos={historial} />
    </PageContainer>
  );
}
