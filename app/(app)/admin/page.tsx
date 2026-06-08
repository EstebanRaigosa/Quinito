import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListOrdered, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { getPartidosTorneo } from "@/lib/queries/partidos-torneo";
import { ETIQUETA_FASE } from "@/lib/types/dominio";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { PageContainer } from "@/components/shared/PageContainer";
import { FilaResultado, type PartidoAdmin } from "./FilaResultado";
import { PanelResultados, type SeccionTorneo } from "./PanelResultados";

export const metadata: Metadata = {
  title: "Admin · Resultados",
};

export default async function AdminResultadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Solo super-admin de plataforma (no admin de grupo).
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const [partidos, { data: torneos }] = await Promise.all([
    getPartidosTorneo(),
    supabase.from("tblTorneos").select("id, nombre"),
  ]);
  const nombreTorneo = new Map((torneos ?? []).map((t) => [t.id, t.nombre]));

  // Agrupar por torneo, conservando el orden cronológico global.
  const porTorneo = new Map<string, typeof partidos>();
  for (const p of partidos) {
    const lista = porTorneo.get(p.torneo_id);
    if (lista) lista.push(p);
    else porTorneo.set(p.torneo_id, [p]);
  }

  // Pre-renderizar los partidos de cada torneo; el selector (cliente) decide
  // cuál se muestra. FilaResultado es client component y se hidrata normalmente.
  const secciones: SeccionTorneo[] = [...porTorneo.entries()].map(
    ([torneoId, lista]) => ({
      id: torneoId,
      nombre: nombreTorneo.get(torneoId) ?? "Torneo",
      // Solo cuentan los partidos con equipos definidos (registrables).
      totalPartidos: lista.filter((p) => p.equipo_local && p.equipo_visitante)
        .length,
      registrados: lista.filter((p) => p.estado === "finalizado").length,
      contenido: lista.map((p) => {
        if (!p.equipo_local || !p.equipo_visitante) {
          return (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-dashed border-border px-3 py-2.5 text-fg-subtle"
            >
              <span className="t-caption font-semibold">
                {ETIQUETA_FASE[p.fase]} · #{p.numero_partido}
              </span>
              <span className="t-caption">Equipos por definir</span>
            </div>
          );
        }
        const datos: PartidoAdmin = {
          id: p.id,
          etiqueta:
            p.fase === "fase_grupos" && p.grupo
              ? `Grupo ${p.grupo}`
              : ETIQUETA_FASE[p.fase],
          fechaTexto: formatearFechaHoraBogota(p.fecha_hora),
          localNombre: p.equipo_local.nombre,
          localIso: p.equipo_local.codigo_iso,
          visitanteNombre: p.equipo_visitante.nombre,
          visitanteIso: p.equipo_visitante.codigo_iso,
          estado: p.estado,
          golesLocal: p.goles_local,
          golesVisitante: p.goles_visitante,
        };
        return <FilaResultado key={p.id} partido={datos} />;
      }),
    }),
  );

  return (
    <PageContainer ancho="ancho" className="space-y-7">
      <header className="animate-fade-up">
        <p className="overline flex items-center gap-2 text-primary">
          <ShieldCheck className="size-4" /> Admin de plataforma
        </p>
        <h1 className="t-display mt-1.5">Registrar resultados</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Escoge el torneo e ingresa el marcador real de cada partido. Al guardar
          se recalculan los puntos de todas las pollas que lo apuestan.
        </p>
        <Link
          href="/admin/clasificacion"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ListOrdered className="size-4" /> Clasificación de grupos
        </Link>
      </header>

      <PanelResultados secciones={secciones} />
    </PageContainer>
  );
}
