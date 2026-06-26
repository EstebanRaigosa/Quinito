import { Ban, BarChart3, Clock } from "lucide-react";
import type { Partido, Prediccion, ReglasGrupo } from "@/lib/types/dominio";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { prediccionCerrada } from "@/lib/utils/prediccion";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/shared/Flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EtiquetaFase } from "@/components/partidos/EtiquetaFase";
import { PuntajeDesglose } from "@/components/partidos/PuntajeDesglose";
import { DefinicionPartido } from "@/components/partidos/DefinicionPartido";
import { EstadisticasGrupo } from "@/components/partidos/EstadisticasGrupo";
import { EstadisticasGrupoResumen } from "@/components/partidos/EstadisticasGrupoResumen";

function Lado({
  iso,
  nombre,
  placeholder,
  alineacion,
}: {
  iso?: string | null;
  nombre?: string;
  placeholder?: string | null;
  alineacion: "izq" | "der";
}) {
  if (nombre) {
    return (
      <span
        className={cn(
          "flex min-w-0 items-center gap-2 text-sm font-semibold text-fg-strong",
          alineacion === "der" && "flex-row-reverse",
        )}
      >
        <Flag code={iso} size={22} />
        <span className="truncate">{nombre}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex min-w-0 items-center text-sm italic text-fg-subtle",
        alineacion === "der" && "justify-end",
      )}
    >
      <span className="truncate">
        {placeholder ? `Por definir (${placeholder})` : "Por definir"}
      </span>
    </span>
  );
}

export function TarjetaPartido({
  partido,
  miPrediccion,
  reglas,
  ahora,
  grupoId,
  participanteActualId,
  totalParticipantes,
  esHoy = false,
}: {
  partido: Partido;
  miPrediccion?: Prediccion;
  /**
   * La tarjeta pertenece a la jornada de HOY: en ese caso un partido pendiente
   * conserva el acento/borde verde de marca (en el resto del listado el
   * pendiente va en naranja).
   */
  esHoy?: boolean;
  /** Reglas del grupo: habilitan el desglose de puntos al hacer clic. */
  reglas?: ReglasGrupo;
  /** Momento actual (servidor) para calcular si la polla ya cerró. */
  ahora?: Date;
  /** Grupo al que pertenece la tarjeta: habilita el panel de estadísticas. */
  grupoId?: string;
  /** Id del participante que mira: marca su fila con "Tú" en las estadísticas. */
  participanteActualId?: string;
  /**
   * Nº de integrantes del grupo (umbral de privacidad del agregado). Opcional:
   * en el calendario global no hay grupo. Aquí el panel solo se ve tras el
   * cierre, donde el umbral no aplica, así que el valor es informativo.
   */
  totalParticipantes?: number;
}) {
  const finalizado = partido.estado === "finalizado";
  const cancelado = partido.estado === "cancelado";
  // La polla cierra `minutos_cierre` antes del kickoff. Sin reglas/ahora (ej.
  // calendario global del torneo) caemos al estado de la BD.
  const cerrada =
    reglas && ahora
      ? prediccionCerrada(partido, reglas.minutos_cierre_prediccion, ahora)
      : partido.estado !== "programado";
  // "En juego": la polla ya cerró pero aún no hay resultado cargado.
  const enJuego = cerrada && !finalizado && !cancelado;
  const equiposDefinidos = !!partido.equipo_local && !!partido.equipo_visitante;
  // Tras el cierre las predicciones de los integrantes ya son públicas para el
  // grupo: mostramos el panel de estadísticas (agregados + lista nominal).
  const mostrarEstadisticas =
    cerrada && equiposDefinidos && !!grupoId && !!reglas && !!ahora;
  // El marcador real solo se muestra cuando ya hay resultado.
  const tieneResultado =
    partido.goles_local != null && partido.goles_visitante != null;

  return (
    <div
      className={cn(
        "surface-card hover-lift relative overflow-hidden rounded-xl p-3.5 pl-4",
        // Acento lateral izquierdo, del mismo color que el borde según el estado.
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        finalizado
          ? "before:bg-info"
          : cancelado
            ? "before:bg-border"
            : enJuego
              ? "before:bg-warning"
              : esHoy
                ? "before:bg-primary"
                : "before:bg-orange-400",
        // Borde distintivo por estado: verde = pendiente de HOY, naranja =
        // pendiente de otra fecha, ámbar = en juego, azul = finalizado ("ya
        // jugado"), neutro = cancelado. Una sola clase de color a la vez (el
        // orden de las utilidades en el CSS no es fiable).
        finalizado
          ? "border-info/60"
          : cancelado
            ? "border-border"
            : enJuego
              ? "border-warning/50"
              : esHoy
                ? "border-primary/40"
                : "border-orange-400/60",
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <EtiquetaFase
          partido={partido}
          className="text-2xs font-bold uppercase tracking-wide text-fg-subtle"
        />
        {finalizado ? (
          <Badge variant="info" dot>
            Finalizado
          </Badge>
        ) : cancelado ? (
          <Badge variant="neutral">Cancelado</Badge>
        ) : enJuego ? (
          <Badge variant="enjuego" className="relative overflow-hidden">
            {/* Brillo diagonal que recorre el badge: refuerza el "en vivo". */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-shine"
            />
            <span className="relative z-10 flex items-center gap-1.5">
              <span className="size-1.5 animate-live-pulse rounded-full bg-current" />
              En juego
            </span>
          </Badge>
        ) : (
          <span className="inline-flex items-center gap-1 text-2xs font-medium text-fg-muted">
            <Clock className="size-3" aria-hidden />
            {formatearFechaHoraBogota(partido.fecha_hora)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
        <Lado
          iso={partido.equipo_local?.codigo_iso}
          nombre={partido.equipo_local?.nombre}
          placeholder={partido.placeholder_local}
          alineacion="izq"
        />
        <div
          className={cn(
            "min-w-14 rounded-lg px-2.5 py-1 text-center text-base font-extrabold tabular-nums",
            tieneResultado
              ? "bg-sunken text-fg-strong shadow-xs"
              : "text-xs font-bold uppercase tracking-widest text-fg-subtle",
          )}
        >
          {tieneResultado
            ? `${partido.goles_local} - ${partido.goles_visitante}`
            : "vs"}
        </div>
        <div className="flex min-w-0 justify-end">
          <Lado
            iso={partido.equipo_visitante?.codigo_iso}
            nombre={partido.equipo_visitante?.nombre}
            placeholder={partido.placeholder_visitante}
            alineacion="der"
          />
        </div>
      </div>

      {/* Definición del cruce: penales (dorado) o tiempo extra (azul). */}
      <DefinicionPartido partido={partido} className="mt-2.5" />

      {miPrediccion ? (
        <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-2xs">
          <span className="text-fg-muted">
            Tu predicción:{" "}
            <span className="font-bold tabular-nums text-fg-strong">
              {miPrediccion.goles_local} - {miPrediccion.goles_visitante}
            </span>
          </span>
          {finalizado && (
            <PuntajeDesglose
              prediccion={miPrediccion}
              partido={partido}
              reglas={reglas}
            />
          )}
        </div>
      ) : (
        // Ya empezó (o terminó) sin que pusieras marcador: se avisa en rojo.
        (enJuego || finalizado) && (
          <div className="mt-2.5 border-t border-border pt-2.5 text-2xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-destructive">
              <Ban className="size-3.5 shrink-0" aria-hidden />
              No pusiste predicción
            </span>
          </div>
        )
      )}

      {mostrarEstadisticas && (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2.5 w-full text-primary"
            >
              <BarChart3 className="size-4" /> Ver estadísticas
            </Button>
          </SheetTrigger>
          {/* Móvil: hoja anclada abajo. Desktop: tarjeta centrada y acotada. */}
          <SheetContent
            side="bottom"
            className="max-h-[85dvh] overflow-y-auto scroll-touch md:inset-0 md:m-auto md:h-fit md:w-full md:max-w-lg md:rounded-2xl md:border"
          >
            <SheetHeader>
              <SheetTitle>
                {partido.equipo_local?.nombre} vs{" "}
                {partido.equipo_visitante?.nombre}
              </SheetTitle>
            </SheetHeader>
            <div className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
              <Tabs defaultValue="grupo">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="global">General</TabsTrigger>
                  <TabsTrigger value="grupo">Por persona</TabsTrigger>
                </TabsList>
                <TabsContent value="global">
                  <EstadisticasGrupoResumen
                    grupoId={grupoId!}
                    partido={partido}
                    reglas={reglas!}
                    ahora={ahora!}
                    totalParticipantes={totalParticipantes ?? 0}
                    miPrediccion={miPrediccion}
                  />
                </TabsContent>
                <TabsContent value="grupo">
                  <EstadisticasGrupo
                    grupoId={grupoId!}
                    partido={partido}
                    reglas={reglas!}
                    ahora={ahora!}
                    participanteActualId={participanteActualId}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
