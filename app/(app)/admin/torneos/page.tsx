import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageContainer } from "@/components/shared/PageContainer";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListaTorneos, type TorneoAdmin } from "./ListaTorneos";

export const metadata: Metadata = {
  title: "Admin · Torneos",
};

/**
 * Panel de superadmin: catálogo de torneos. Controla la visibilidad de cada uno
 * en el wizard de creación de pollas (Disponible / Pruebas / Oculto). Se lee con
 * el admin client (`service_role`) para ver también los ocultos y de prueba.
 */
export default async function AdminTorneosPage() {
  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  // Solo super-admin de plataforma.
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data } = await admin
    .from("tblTorneos")
    .select("id, nombre, codigo, pais_sede, fecha_inicio, fecha_fin, activo, es_prueba")
    .order("creado_en");

  // Deriva el estado de 3 valores a partir del par (activo, es_prueba).
  const torneos: TorneoAdmin[] = (data ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    codigo: t.codigo,
    pais_sede: t.pais_sede,
    fecha_inicio: t.fecha_inicio,
    fecha_fin: t.fecha_fin,
    visibilidad: t.activo ? "disponible" : t.es_prueba ? "pruebas" : "oculto",
  }));
  const disponibles = torneos.filter((t) => t.visibilidad === "disponible").length;

  return (
    <PageContainer ancho="ancho" className="space-y-5">
      <SectionHeader
        titulo="Torneos"
        sub="Define qué torneos aparecen en el wizard de creación de pollas."
        meta={`${disponibles}/${torneos.length} disponibles`}
      />

      {torneos.length === 0 ? (
        <EmptyState
          icono={Trophy}
          titulo="Aún no hay torneos"
          descripcion="Cuando se cargue un torneo al catálogo aparecerá aquí."
        />
      ) : (
        <ListaTorneos torneos={torneos} />
      )}
    </PageContainer>
  );
}
