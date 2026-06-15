"use client";

import { useState } from "react";
import { BarChart3, Clock, Check } from "lucide-react";
import type { Partido, Prediccion, ReglasGrupo } from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";
import { esSinCierre, prediccionCerrada, puedePredecir } from "@/lib/utils/prediccion";
import { claveDiaBogota } from "@/lib/utils/fechas";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/shared/Flag";
import { CuentaRegresiva } from "@/components/shared/CuentaRegresiva";
import { FormularioPrediccion } from "@/components/partidos/FormularioPrediccion";
import { EstadisticasGrupoResumen } from "@/components/partidos/EstadisticasGrupoResumen";
import { EstadisticasGrupo } from "@/components/partidos/EstadisticasGrupo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function TarjetaPrediccion({
  grupoId,
  participanteId,
  partido,
  reglas,
  miPrediccion,
  ahora,
  totalParticipantes,
}: {
  grupoId: string;
  participanteId: string;
  partido: Partido;
  reglas: ReglasGrupo;
  miPrediccion?: Prediccion;
  ahora: Date;
  /** Nº de integrantes del grupo (para el umbral de privacidad del agregado). */
  totalParticipantes: number;
}) {
  const equiposDefinidos = !!partido.equipo_local && !!partido.equipo_visitante;
  const cerrada = prediccionCerrada(partido, reglas.minutos_cierre_prediccion, ahora);
  // Partido con fecha centinela (1900): nunca cierra, sin cuenta regresiva.
  const sinCierre = esSinCierre(partido);
  // El partido se juega hoy (zona Bogotá): se resalta con el badge "¡Es hoy!".
  const esHoy = claveDiaBogota(partido.fecha_hora) === claveDiaBogota(ahora);
  const sePuede = puedePredecir(partido, reglas.minutos_cierre_prediccion, ahora);
  const finalizado = partido.estado === "finalizado";
  // Estado "guardado" reactivo: parte de la predicción del server y se actualiza
  // en cliente cuando el formulario guarda con éxito (sin recargar).
  const [guardada, setGuardada] = useState(!!miPrediccion);

  // Estado visual que manda la jerarquía de la tarjeta.
  const estado: "pendiente" | "guardada" | "cerrada" | "final" = finalizado
    ? "final"
    : !sePuede
      ? "cerrada"
      : guardada
        ? "guardada"
        : "pendiente";

  const motivoBloqueo = !equiposDefinidos
    ? "Equipos por definir — predicción no disponible aún"
    : cerrada
      ? "Apuesta cerrada"
      : undefined;

  const etiquetaFase =
    partido.fase === "fase_grupos" && partido.grupo
      ? `Grupo ${partido.grupo}`
      : ETIQUETA_FASE[partido.fase];

  const lugar = partido.estadio ?? "";

  return (
    <div
      className={cn(
        // Marco SIEMPRE igual (tener o no predicción no lo cambia, en claro ni
        // oscuro). Borde visible + sombra para dar relieve; el estado se
        // comunica en la cabecera/pie (badges, "Cierra en", "Guardada").
        "surface-card group overflow-hidden rounded-2xl border-strong shadow-md transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        estado === "cerrada" && "opacity-80",
      )}
    >
      {/* Cabecera: nº + fase + estadio + estado de la predicción */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-sunken px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary">Partido #{partido.numero_partido}</Badge>
          <span className="t-caption truncate font-semibold text-fg-muted">
            {etiquetaFase}
          </span>
          {lugar && (
            <>
              <span aria-hidden className="text-fg-subtle">·</span>
              <span className="t-caption hidden truncate text-fg-muted sm:inline">
                {lugar}
              </span>
            </>
          )}
        </div>

        {partido.estado === "en_vivo" ? (
          <Badge variant="live">
            <span className="size-1.5 animate-live-pulse rounded-full bg-current" />
            En vivo
          </Badge>
        ) : estado === "pendiente" ? (
          sinCierre ? (
            <span className="t-caption inline-flex items-center gap-1 font-bold text-warning">
              <Clock className="size-3.5" />
              Sin cierre
            </span>
          ) : (
            <span className="t-caption inline-flex items-center gap-1 font-bold text-warning">
              <Clock className="size-3.5" />
              <CuentaRegresiva
                iso={partido.fecha_hora}
                ahoraInicial={ahora}
                prefijo="Cierra en "
                etiquetaCerrada="cerrada"
              />
            </span>
          )
        ) : estado === "guardada" ? (
          <span className="flex items-center gap-2">
            <Badge variant="success">
              <Check className="size-3" /> Guardada
            </Badge>
            <span className="t-caption inline-flex items-center gap-1 font-bold text-success">
              <Clock className="size-3.5" />
              {sinCierre ? (
                "Sin cierre"
              ) : (
                <CuentaRegresiva
                  iso={partido.fecha_hora}
                  ahoraInicial={ahora}
                  prefijo="Cierra en "
                  etiquetaCerrada="cerrada"
                />
              )}
            </span>
          </span>
        ) : (
          <Badge variant="neutral">Cerrado</Badge>
        )}
      </div>

      <div className="px-4 py-2.5">
        {/* Resultado real (en vivo / final) */}
        {(partido.estado === "en_vivo" || finalizado) && equiposDefinidos && (
          <div className="mb-2.5 flex items-center justify-center gap-2">
            <span className="t-caption">Resultado</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-b from-sunken to-muted px-2.5 py-0.5 text-base font-extrabold tabular-nums text-fg-strong shadow-xs">
              <Flag code={partido.equipo_local?.codigo_iso} size={14} />
              {partido.goles_local}
              <span className="text-fg-subtle">-</span>
              {partido.goles_visitante}
              <Flag code={partido.equipo_visitante?.codigo_iso} size={14} />
            </span>
            {finalizado && miPrediccion && (
              <Badge variant={miPrediccion.puntos_obtenidos > 0 ? "gold" : "neutral"}>
                +{miPrediccion.puntos_obtenidos} pts
              </Badge>
            )}
          </div>
        )}

        <FormularioPrediccion
          partido={partido}
          participanteId={participanteId}
          golesLocalInicial={miPrediccion?.goles_local}
          golesVisitanteInicial={miPrediccion?.goles_visitante}
          bloqueado={!sePuede}
          motivoBloqueo={motivoBloqueo}
          equiposDefinidos={equiposDefinidos}
          esHoy={esHoy}
          onGuardado={() => setGuardada(true)}
        />

        {equiposDefinidos && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-1 w-full text-primary">
              <BarChart3 className="size-4" /> Ver estadísticas
            </Button>
          </SheetTrigger>
          {/* Móvil: hoja anclada abajo (full-width). Desktop: tarjeta centrada y
              acotada para no quedar como una franja difícil de ver al fondo.
              El centrado usa inset-0 + m-auto (sin transform) para no chocar con
              la animación slide-in-from-bottom del Sheet. */}
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
              <Tabs defaultValue="global">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="global">General</TabsTrigger>
                  <TabsTrigger value="grupo">Por persona</TabsTrigger>
                </TabsList>
                <TabsContent value="global">
                  <EstadisticasGrupoResumen
                    grupoId={grupoId}
                    partido={partido}
                    reglas={reglas}
                    ahora={ahora}
                    totalParticipantes={totalParticipantes}
                    miPrediccion={miPrediccion}
                  />
                </TabsContent>
                <TabsContent value="grupo">
                  <EstadisticasGrupo
                    grupoId={grupoId}
                    partido={partido}
                    reglas={reglas}
                    ahora={ahora}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
        )}
      </div>
    </div>
  );
}
