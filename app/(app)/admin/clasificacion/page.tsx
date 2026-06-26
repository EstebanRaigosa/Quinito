import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListOrdered, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPartidosTorneo } from "@/lib/queries/partidos-torneo";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { PageContainer } from "@/components/shared/PageContainer";
import {
  ClasificacionGrupos,
  type TorneoClasificacion,
  type EquipoFila,
  type TerceroFila,
  type SlotTercero,
  type AsignacionTercero,
} from "./ClasificacionGrupos";

export const metadata: Metadata = {
  title: "Admin · Clasificación de grupos",
};

export default async function AdminClasificacionPage() {
  const supabase = await createClient();
  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const { data: torneos } = await supabase
    .from("tblTorneos")
    .select("id, nombre")
    .order("nombre");

  // Por cada torneo, los dos RPCs (posiciones + terceros) corren en paralelo, y
  // los torneos entre sí también. Antes era un loop secuencial con 2N+1 olas de
  // latencia encadenadas; ahora son 2 olas (torneos → todos los RPCs a la vez).
  const resultados = await Promise.all(
    (torneos ?? []).map(async (t): Promise<TorneoClasificacion | null> => {
      const [
        { data: filas },
        { data: filasTerceros },
        { data: filasAsignacion },
        partidos,
      ] = await Promise.all([
        supabase.rpc("posiciones_admin", { p_torneo_id: t.id }),
        supabase.rpc("clasificacion_terceros_provisional", {
          p_torneo_id: t.id,
        }),
        supabase.rpc("asignacion_terceros_actual", { p_torneo_id: t.id }),
        getPartidosTorneo(t.id),
      ]);

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

      // Terceros EN VIVO: una fila por grupo con su 3° provisional, ya ordenada
      // por posición (la RPC ordena por puntos -> dif -> a favor).
      const terceros: TerceroFila[] = (filasTerceros ?? []).map((f) => ({
        grupo: f.grupo,
        equipoId: f.equipo_id,
        nombre: f.nombre,
        codigoIso: f.codigo_iso,
        pj: f.pj,
        pts: f.pts,
        dif: f.dif,
        aFavor: f.a_favor,
        determinado: f.determinado,
        grupoCerrado: f.grupo_cerrado,
        posicion: f.posicion,
        asegurado: f.asegurado,
        eliminado: f.eliminado,
        clasificaAuto: f.clasifica_auto,
        manualClasifica: f.manual_clasifica,
      }));
      const hayManualTerceros = (filasTerceros ?? []).some((f) => f.hay_manual);
      const ambiguoTerceros = (filasTerceros ?? []).some((f) => f.ambiguo_corte);
      const cupos = (filasTerceros ?? [])[0]?.cupos ?? 0;

      // Partidos de la llave eliminatoria (sin fase de grupos).
      const bracket = partidos.filter((p) => p.fase !== "fase_grupos");

      // Slots de tercero: partidos del bracket cuyo placeholder es de tercero
      // (3 + 2 o más letras de grupo). Cada uno es un cruce al que se asigna un
      // mejor tercero; el rival es el otro lado (equipo real o placeholder).
      const esPlaceholderTercero = (ph: string | null) =>
        ph !== null && /^3[A-L]{2,}$/.test(ph);
      const slotsTercero: SlotTercero[] = bracket
        .filter(
          (p) =>
            esPlaceholderTercero(p.placeholder_local) ||
            esPlaceholderTercero(p.placeholder_visitante),
        )
        .map((p) => {
          const terceroEsLocal = esPlaceholderTercero(p.placeholder_local);
          const rival = terceroEsLocal ? p.equipo_visitante : p.equipo_local;
          const rivalPh = terceroEsLocal
            ? p.placeholder_visitante
            : p.placeholder_local;
          return {
            numeroPartido: p.numero_partido,
            fase: p.fase,
            rivalNombre: rival?.nombre ?? null,
            rivalCodigoIso: rival?.codigo_iso ?? null,
            rivalPlaceholder: rival ? null : rivalPh,
          };
        })
        .sort((a, b) => a.numeroPartido - b.numeroPartido);

      // Mapeo efectivo slot→grupo (manual si existe, si no FIFA Annex C). Vacío
      // hasta que el conjunto de terceros clasificados esté determinado.
      const asignacionTerceros: AsignacionTercero[] = (
        filasAsignacion ?? []
      ).map((a) => ({
        grupo: a.grupo,
        numeroPartido: a.numero_partido,
        esManual: a.es_manual,
        esProvisional: a.es_provisional,
      }));

      if (grupos.length === 0) return null;
      return {
        id: t.id,
        nombre: t.nombre,
        grupos,
        terceros,
        hayManualTerceros,
        ambiguoTerceros,
        cupos,
        bracket,
        slotsTercero,
        asignacionTerceros,
      };
    }),
  );
  // Quitar los torneos sin grupos (null) preservando el tipo.
  const datos: TorneoClasificacion[] = resultados.filter(
    (d): d is TorneoClasificacion => d !== null,
  );

  return (
    <PageContainer ancho="ancho" className="space-y-7">
      <header className="animate-fade-up">
        <p className="overline flex items-center gap-2 text-primary">
          <ListOrdered className="size-4" /> Admin de plataforma
        </p>
        <h1 className="t-display mt-1.5">Clasificación de grupos</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Define el 1°, 2° y 3° de cada grupo y los 8 mejores terceros que pasan
          al bracket. Normalmente se calcula solo; cuando hay un empate que no se
          resuelve por reglas, selecciónalos a mano.
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
