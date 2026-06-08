import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListOrdered, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { PageContainer } from "@/components/shared/PageContainer";
import {
  ClasificacionGrupos,
  type TorneoClasificacion,
  type EquipoFila,
} from "./ClasificacionGrupos";

export const metadata: Metadata = {
  title: "Admin · Clasificación de grupos",
};

export default async function AdminClasificacionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const { data: torneos } = await supabase
    .from("tblTorneos")
    .select("id, nombre")
    .order("nombre");

  const datos: TorneoClasificacion[] = [];
  for (const t of torneos ?? []) {
    const { data: filas } = await supabase.rpc("posiciones_admin", {
      p_torneo_id: t.id,
    });

    // Agrupar las filas por grupo conservando el orden devuelto por la RPC
    // (ya viene ordenado por posición efectiva: manual si existe, si no auto).
    const porGrupo = new Map<string, EquipoFila[]>();
    for (const f of filas ?? []) {
      const fila: EquipoFila = {
        equipoId: f.equipo_id,
        nombre: f.nombre,
        codigoIso: f.codigo_iso,
        pj: f.pj,
        gf: f.gf,
        gc: f.gc,
        dg: f.dg,
        pts: f.pts,
        posicion: f.posicion,
        ambiguo: f.ambiguo,
        manualPosicion: f.manual_posicion,
      };
      const lista = porGrupo.get(f.grupo);
      if (lista) lista.push(fila);
      else porGrupo.set(f.grupo, [fila]);
    }

    const grupos = [...porGrupo.entries()].map(([grupo, equipos]) => ({
      grupo,
      equipos,
      tieneManual: equipos.some((e) => e.manualPosicion !== null),
      hayAmbiguo: equipos.some((e) => e.ambiguo),
    }));

    if (grupos.length > 0) datos.push({ id: t.id, nombre: t.nombre, grupos });
  }

  return (
    <PageContainer ancho="ancho" className="space-y-7">
      <header className="animate-fade-up">
        <p className="overline flex items-center gap-2 text-primary">
          <ListOrdered className="size-4" /> Admin de plataforma
        </p>
        <h1 className="t-display mt-1.5">Clasificación de grupos</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Define el 1° y 2° de cada grupo para armar los cruces. Normalmente se
          calcula solo; cuando hay un empate que no se resuelve por reglas,
          selecciónalos a mano.
        </p>
        <Link
          href="/admin"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ShieldCheck className="size-4" /> Registrar resultados
        </Link>
      </header>

      <ClasificacionGrupos torneos={datos} />
    </PageContainer>
  );
}
