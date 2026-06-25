"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { FaseTorneo, Partido } from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";
import { usePartidosTorneo } from "@/lib/queries/partidos";
import { cerradoAlCrear, compararPartidos } from "@/lib/utils/prediccion";
import { useWizardGrupo } from "@/lib/stores/wizard-grupo";
import { createClient } from "@/lib/supabase/client";
import { formatearFechaCorta, formatearHoraBogota } from "@/lib/utils/fechas";
import { formatearMonto } from "@/lib/utils/texto";
import { Flag } from "@/components/shared/Flag";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ORDEN_FASES: FaseTorneo[] = [
  "fase_grupos",
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinales",
  "tercer_lugar",
  "final",
];

function LadoMatch({
  partido,
  lado,
}: {
  partido: Partido;
  lado: "local" | "visitante";
}) {
  const equipo = lado === "local" ? partido.equipo_local : partido.equipo_visitante;
  const placeholder =
    lado === "local" ? partido.placeholder_local : partido.placeholder_visitante;
  const izq = lado === "local";

  if (equipo) {
    return (
      <span
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2",
          izq ? "justify-end" : "justify-start",
        )}
      >
        {!izq && <Flag code={equipo.codigo_iso} size={20} />}
        <span className="truncate text-sm font-semibold text-fg">
          {equipo.nombre}
        </span>
        {izq && <Flag code={equipo.codigo_iso} size={20} />}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex-1 truncate text-sm italic text-fg-subtle",
        izq ? "text-right" : "text-left",
      )}
    >
      {placeholder ? `Por definir (${placeholder})` : "Por definir"}
    </span>
  );
}

export function PasoPartidos() {
  const router = useRouter();
  const {
    torneoId,
    datos,
    reglas,
    partidosSeleccionados,
    togglePartido,
    toggleFase,
    inicializarPartidos,
    anterior,
  } = useWizardGrupo();
  const [creando, setCreando] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<FaseTorneo>>(
    new Set(["fase_grupos", "dieciseisavos"]),
  );

  const { data: partidos = [], isLoading, isError } = usePartidosTorneo(torneoId);

  useEffect(() => {
    if (partidos.length > 0) {
      inicializarPartidos(partidos.map((p) => p.id));
    }
  }, [partidos, inicializarPartidos]);

  const porFase = useMemo(() => {
    const mapa = new Map<FaseTorneo, Partido[]>();
    for (const p of partidos) {
      const lista = mapa.get(p.fase) ?? [];
      lista.push(p);
      mapa.set(p.fase, lista);
    }
    // Dentro de cada fase: por fecha y, ante igual fecha (partidos sin fecha
    // centinela), por grupo (A, B, C, D…) y número.
    for (const lista of mapa.values()) lista.sort(compararPartidos);
    return mapa;
  }, [partidos]);

  function toggleAbierta(fase: FaseTorneo) {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(fase)) next.delete(fase);
      else next.add(fase);
      return next;
    });
  }

  async function crearGrupo() {
    if (!torneoId) {
      toast.error("Selecciona un torneo");
      return;
    }
    if (partidosSeleccionados.size === 0) {
      toast.error("Selecciona al menos un partido");
      return;
    }
    setCreando(true);
    // RPC transaccional: crea grupo + participante admin + reglas + partidos.
    const supabase = createClient();
    const { data: grupoId, error } = await supabase.rpc("crear_grupo", {
      p_nombre: datos.nombre,
      p_descripcion: datos.descripcion ?? "",
      p_reglas: reglas,
      p_partido_ids: [...partidosSeleccionados],
      p_torneo_id: torneoId,
    });
    if (error || !grupoId) {
      toast.error("No se pudo crear el grupo. Intenta de nuevo.");
      setCreando(false);
      return;
    }
    toast.success(`Grupo "${datos.nombre}" creado`);

    // Aviso inmediato si la polla quedó con partidos ya cerrados (nadie pudo
    // predecirlos): el admin debe cargar el "arranque" de cada jugador. El
    // detalle del grupo muestra además un banner con la lista y un atajo.
    const ahora = new Date();
    const cerrados = partidos.filter(
      (p) =>
        partidosSeleccionados.has(p.id) &&
        cerradoAlCrear(p, reglas.minutos_cierre_prediccion, ahora),
    ).length;
    if (cerrados > 0) {
      toast.warning(
        cerrados === 1
          ? "Incluiste 1 partido ya cerrado. Carga el arranque de cada jugador en Participantes."
          : `Incluiste ${cerrados} partidos ya cerrados. Carga el arranque de cada jugador en Participantes.`,
        { duration: 8000 },
      );
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-fg-muted">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="t-body-sm">Cargando los partidos del torneo…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center text-sm text-fg-muted">
        No se pudieron cargar los partidos. Recarga la página e intenta de nuevo.
      </div>
    );
  }

  const totalPartidos = partidos.length;
  const totalSeleccionados = partidosSeleccionados.size;
  const valorApuesta = Number.isNaN(reglas.valor_apuesta)
    ? 0
    : reglas.valor_apuesta;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {ORDEN_FASES.filter((f) => porFase.has(f)).map((fase) => {
          const lista = porFase.get(fase)!;
          const ids = lista.map((p) => p.id);
          const seleccionados = ids.filter((id) =>
            partidosSeleccionados.has(id),
          ).length;
          const estadoFase: boolean | "indeterminate" =
            seleccionados === 0
              ? false
              : seleccionados === ids.length
                ? true
                : "indeterminate";
          const abierta = abiertas.has(fase);

          return (
            <section
              key={fase}
              className="surface-card overflow-hidden rounded-2xl"
            >
              <div className="flex items-center gap-1 bg-sunken px-4 py-3">
                {/* Área táctil de 44px alrededor del checkbox (§6); el margen
                    negativo evita que crezca la altura de la fila. */}
                <label className="-my-3 -ml-2 grid size-11 cursor-pointer place-items-center">
                  <Checkbox
                    checked={estadoFase}
                    onCheckedChange={(v) => toggleFase(ids, v === true)}
                    aria-label={`Seleccionar todos los partidos de ${ETIQUETA_FASE[fase]}`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => toggleAbierta(fase)}
                  aria-expanded={abierta}
                  className="flex flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-extrabold tracking-tight text-fg-strong">
                      {ETIQUETA_FASE[fase]}
                    </span>
                    <span className="block text-2xs font-medium text-fg-muted">
                      {seleccionados} de {ids.length} seleccionados
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 text-fg-muted transition-transform",
                      abierta && "rotate-180",
                    )}
                  />
                </button>
              </div>

              {abierta && (
                <ul className="divide-y divide-border">
                  {lista.map((p) => {
                    const activo = partidosSeleccionados.has(p.id);
                    return (
                      <li key={p.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
                            activo ? "bg-surface" : "bg-muted/40",
                          )}
                        >
                          <Checkbox
                            checked={activo}
                            onCheckedChange={() => togglePartido(p.id)}
                            aria-label={`Incluir partido número ${p.numero_partido}`}
                          />
                          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-sunken text-2xs font-bold tabular-nums text-fg-subtle">
                            {p.numero_partido}
                          </span>
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <LadoMatch partido={p} lado="local" />
                            <span className="text-2xs font-extrabold tracking-wider text-fg-subtle">
                              VS
                            </span>
                            <LadoMatch partido={p} lado="visitante" />
                          </div>
                          <div className="shrink-0 text-right tabular-nums">
                            <div className="text-2xs font-bold text-fg-strong">
                              {formatearHoraBogota(p.fecha_hora)}
                            </div>
                            <div className="text-2xs text-fg-muted">
                              {formatearFechaCorta(p.fecha_hora)}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* Footer de navegación */}
      <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] -mx-4 border-t border-border bg-app px-4 py-3 md:static md:bottom-auto md:mx-0 md:rounded-2xl md:border md:bg-surface md:px-5 md:py-4">
        <p className="t-caption mb-2.5 text-center tabular-nums">
          <span className="font-bold text-fg-strong">
            {totalSeleccionados} de {totalPartidos}
          </span>{" "}
          partidos
          {valorApuesta > 0 && (
            <>
              {" · apuesta "}
              <span className="font-bold text-fg-strong">
                {formatearMonto(valorApuesta)}
              </span>
            </>
          )}
        </p>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={anterior}
            aria-label="Volver al paso anterior"
            className="shrink-0 px-4 md:px-8"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden md:inline">Atrás</span>
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={crearGrupo}
            disabled={creando}
            className="flex-1"
          >
            {creando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" strokeWidth={3} />
            )}
            Crear grupo
          </Button>
        </div>
      </div>
    </div>
  );
}
