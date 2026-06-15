import Link from "next/link";
import {
  Trophy,
  ChevronRight,
  CalendarDays,
  Settings,
  Target,
  ListOrdered,
  Scroll,
  Users,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getGrupoDetalle } from "@/lib/queries/grupo-detalle";
import {
  compararPartidos,
  esSinCierre,
  firmaPartido,
  puedePredecir,
} from "@/lib/utils/prediccion";
import { formatearMonto } from "@/lib/utils/texto";
import {
  agruparPorDia,
  claveDiaBogota,
  etiquetaDiaListado,
} from "@/lib/utils/fechas";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsConRefresh } from "@/components/grupos/TabsConRefresh";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { AvatarGrupo } from "@/components/grupos/AvatarGrupo";
import { PageContainer } from "@/components/shared/PageContainer";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TablaPosiciones } from "@/components/grupos/TablaPosiciones";
import { RevelarJornadas } from "@/components/grupos/RevelarJornadas";
import { AutoRefrescoCierre } from "@/components/shared/AutoRefrescoCierre";
import { RealtimePartidos } from "@/components/shared/RealtimePartidos";
import { TarjetaPartido } from "@/components/partidos/TarjetaPartido";
import { DestelloPartido } from "@/components/partidos/DestelloPartido";
import { TarjetaPrediccion } from "@/components/partidos/TarjetaPrediccion";
import { BotonCompartirCodigo } from "@/components/grupos/BotonCompartirCodigo";
import { EliminarGrupo } from "@/components/grupos/EliminarGrupo";
import { PanelParticipantes } from "@/components/grupos/PanelParticipantes";
import { PanelBaneados } from "@/components/grupos/PanelBaneados";
import type { Partido, Prediccion, ReglasGrupo } from "@/lib/types/dominio";

/**
 * Pestaña tipo bottom-nav: icono + etiqueta siempre visibles para que en móvil
 * cada pestaña sea clara sin scroll horizontal. En móvil se apila (icono arriba,
 * etiqueta corta abajo); en desktop pasa a icono + etiqueta larga en línea.
 */
function PestanaTab({
  value,
  icono: Icono,
  corto,
  largo,
}: {
  value: string;
  icono: LucideIcon;
  /** Etiqueta breve para móvil (1 palabra). */
  corto: string;
  /** Etiqueta completa para desktop. */
  largo: string;
}) {
  return (
    <TabsTrigger
      value={value}
      aria-label={largo}
      className={cn(
        "group flex h-auto min-h-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 leading-none transition-all duration-200",
        "text-fg-muted hover:bg-card/60 hover:text-fg-strong",
        "data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary-hover data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow data-[state=active]:hover:text-primary-foreground",
        // Desktop: pestaña clásica con subrayado (sin píldora rellena).
        "md:-mb-px md:flex-row md:gap-2 md:rounded-none md:border-b-2 md:border-transparent md:px-4 md:py-2.5 md:hover:bg-transparent",
        "md:data-[state=active]:border-primary md:data-[state=active]:bg-none md:data-[state=active]:bg-transparent md:data-[state=active]:text-primary md:data-[state=active]:shadow-none md:data-[state=active]:hover:text-primary",
      )}
    >
      <Icono className="size-[18px] shrink-0 transition-transform duration-200 group-data-[state=active]:scale-110 md:size-4" />
      <span className="max-w-full truncate text-[11px] font-semibold md:hidden">
        {corto}
      </span>
      <span className="hidden truncate md:inline">{largo}</span>
    </TabsTrigger>
  );
}

function FilaRegla({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string | number;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="t-body-sm text-fg-muted">{etiqueta}</span>
      <span className="t-body-sm font-bold text-fg-strong">{valor}</span>
    </div>
  );
}

function ResumenReglas({ reglas }: { reglas: ReglasGrupo }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="overline mb-2">Puntuación</p>
        <Card>
          <CardContent className="divide-y divide-border p-4 pt-2">
            <FilaRegla etiqueta="Marcador exacto" valor={`${reglas.pts_marcador_exacto} pts`} />
            <FilaRegla etiqueta="Ganador acertado" valor={`${reglas.pts_ganador} pts`} />
            <FilaRegla etiqueta="Gol acertado" valor={`${reglas.pts_gol_acertado} pts`} />
            <FilaRegla etiqueta="Predicción única" valor={`+${reglas.pts_prediccion_unica} pts`} />
          </CardContent>
        </Card>
      </div>
      <div>
        <p className="overline mb-2">Bonos por fase</p>
        <Card>
          <CardContent className="divide-y divide-border p-4 pt-2">
            <FilaRegla etiqueta="Dieciseisavos" valor={`+${reglas.bono_dieciseisavos}`} />
            <FilaRegla etiqueta="Octavos" valor={`+${reglas.bono_octavos}`} />
            <FilaRegla etiqueta="Cuartos" valor={`+${reglas.bono_cuartos}`} />
            <FilaRegla etiqueta="Semifinales" valor={`+${reglas.bono_semifinales}`} />
            <FilaRegla etiqueta="Final" valor={`+${reglas.bono_final}`} />
          </CardContent>
        </Card>
      </div>
      <div>
        <p className="overline mb-2">Pozo y premios</p>
        <Card>
          <CardContent className="divide-y divide-border p-4 pt-2">
            <FilaRegla
              etiqueta="Valor de apuesta"
              valor={reglas.valor_apuesta > 0 ? formatearMonto(reglas.valor_apuesta) : "Gratis"}
            />
            <FilaRegla etiqueta="1er lugar" valor={`${reglas.premio_primer_lugar}%`} />
            <FilaRegla etiqueta="2do lugar" valor={`${reglas.premio_segundo_lugar}%`} />
            <FilaRegla etiqueta="3er lugar" valor={`${reglas.premio_tercer_lugar}%`} />
            <FilaRegla
              etiqueta="Cierre antes del partido"
              valor={`${reglas.minutos_cierre_prediccion} min`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Encabezado de una sección de fecha: chip flotante (calendario + fecha +
 * contador de partidos) sobre una línea que se desvanece. Marca con claridad
 * dónde empieza cada día.
 */
function EncabezadoFecha({
  fecha,
  count,
  esHoy = false,
}: {
  fecha: string;
  count: number;
  /** La fecha de la sección corresponde al día actual (zona Bogotá). */
  esHoy?: boolean;
}) {
  // La fecha viene en minúsculas (locale es); capitalizamos la inicial.
  const titulo = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  return (
    <div className="mb-4">
      <h3 className="flex items-center gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-full border border-clay-200 bg-clay-100 py-1.5 pl-3 pr-1.5 text-clay-800 shadow-sm">
          <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="text-sm font-bold">{titulo}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-2xs font-bold",
              esHoy
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {count} {count === 1 ? "partido" : "partidos"}
          </span>
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-border to-transparent"
        />
      </h3>
    </div>
  );
}

/** Grilla de tarjetas de predicción de un día, con encabezado de fecha. */
function DiaDePredicciones({
  partidos,
  grupoId,
  participanteId,
  reglas,
  prediccionPorPartido,
  ahora,
  esHoy,
  totalParticipantes,
}: {
  partidos: Partido[];
  grupoId: string;
  participanteId: string;
  reglas: ReglasGrupo;
  prediccionPorPartido: Map<string, Prediccion>;
  ahora: Date;
  esHoy: boolean;
  totalParticipantes: number;
}) {
  if (partidos.length === 0) return null;
  return (
    <section className="border-t border-strong pt-6 first:border-t-0 first:pt-0">
      <EncabezadoFecha
        fecha={etiquetaDiaListado(partidos[0]!.fecha_hora)}
        count={partidos.length}
        esHoy={esHoy}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {partidos.map((p) => (
          <TarjetaPrediccion
            key={p.id}
            grupoId={grupoId}
            participanteId={participanteId}
            partido={p}
            reglas={reglas}
            miPrediccion={prediccionPorPartido.get(p.id)}
            ahora={ahora}
            totalParticipantes={totalParticipantes}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Sección destacada "Hoy" de la pestaña "Partidos". Ancla arriba los partidos
 * del día actual (zona Bogotá) en un panel con acento de marca (esmeralda),
 * punto "en vivo" y jerarquía propia, para que se distinga del listado
 * cronológico del resto de jornadas sin saturar.
 */
function SeccionHoyPartidos({
  partidos,
  grupoId,
  reglas,
  prediccionPorPartido,
  ahora,
  totalParticipantes,
}: {
  partidos: Partido[];
  grupoId: string;
  reglas: ReglasGrupo;
  prediccionPorPartido: Map<string, Prediccion>;
  ahora: Date;
  totalParticipantes: number;
}) {
  if (partidos.length === 0) return null;
  const count = partidos.length;
  // Fecha del día capitalizada (ej. "Miércoles 14 de junio de 2026").
  const fecha = etiquetaDiaListado(partidos[0]!.fecha_hora);
  const fechaTitulo = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  return (
    <section className="relative animate-fade-up overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/80 to-card p-4 pt-5 shadow-glow ring-1 ring-inset ring-primary/10 sm:p-5 sm:pt-6">
      {/* Barra de acento superior: subraya que es la jornada protagonista. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-hover to-primary/40"
      />
      {/* Glow decorativo (puramente estético, no interactivo). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-primary/15 blur-3xl"
      />

      {/* Encabezado: chip de calendario + "Hoy" + contador, con la fecha debajo. */}
      <div className="relative mb-4 flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow"
        >
          <CalendarDays className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="t-h3 leading-none text-fg-strong">Hoy</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-2xs font-bold text-primary-foreground shadow-sm">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
              </span>
              {count} {count === 1 ? "partido" : "partidos"}
            </span>
          </div>
          <p className="overline mt-1.5 truncate text-primary">{fechaTitulo}</p>
        </div>
      </div>

      {/* Partidos del día (mismas tarjetas que el resto del listado). */}
      <div className="relative grid gap-2.5 md:grid-cols-2">
        {partidos.map((p) => (
          <DestelloPartido key={p.id} firma={firmaPartido(p)}>
            <TarjetaPartido
              partido={p}
              miPrediccion={prediccionPorPartido.get(p.id)}
              reglas={reglas}
              ahora={ahora}
              grupoId={grupoId}
              totalParticipantes={totalParticipantes}
            />
          </DestelloPartido>
        ))}
      </div>
    </section>
  );
}

/**
 * Grilla de partidos de un día (pestaña "Partidos"), con encabezado de fecha.
 * A diferencia de la pestaña "Predecir", aquí NO se resalta el día de hoy
 * (sin badge rojo ni chip "¡Es hoy!"): eso es exclusivo de predecir.
 */
function DiaDePartidos({
  partidos,
  grupoId,
  reglas,
  prediccionPorPartido,
  ahora,
  totalParticipantes,
}: {
  partidos: Partido[];
  grupoId: string;
  reglas: ReglasGrupo;
  prediccionPorPartido: Map<string, Prediccion>;
  ahora: Date;
  totalParticipantes: number;
}) {
  if (partidos.length === 0) return null;
  return (
    <section className="border-t border-strong pt-6 first:border-t-0 first:pt-0">
      <EncabezadoFecha
        fecha={etiquetaDiaListado(partidos[0]!.fecha_hora)}
        count={partidos.length}
      />
      <div className="grid gap-2.5 md:grid-cols-2">
        {partidos.map((p) => (
          <DestelloPartido key={p.id} firma={firmaPartido(p)}>
            <TarjetaPartido
              partido={p}
              miPrediccion={prediccionPorPartido.get(p.id)}
              reglas={reglas}
              ahora={ahora}
              grupoId={grupoId}
              totalParticipantes={totalParticipantes}
            />
          </DestelloPartido>
        ))}
      </div>
    </section>
  );
}

export default async function GrupoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: esSuperadmin },
    detalle,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("es_superadmin"),
    getGrupoDetalle(id),
  ]);

  if (!detalle) {
    return (
      <PageContainer>
        <EmptyState
          icono={Trophy}
          titulo="Grupo no encontrado"
          descripcion="Es posible que el enlace sea incorrecto, que ya no exista o que no seas miembro."
        >
          <Button asChild className="mt-2">
            <Link href="/dashboard">Volver al inicio</Link>
          </Button>
        </EmptyState>
      </PageContainer>
    );
  }

  const {
    grupo,
    reglas,
    participantes,
    tabla,
    partidos,
    misPredicciones,
    esAdmin,
    miParticipanteId,
  } = detalle;
  const ahora = new Date();
  // Clave del día actual (zona Bogotá) para resaltar la sección de "hoy".
  const claveHoy = claveDiaBogota(ahora);
  const prediccionPorPartido = new Map(
    misPredicciones.map((p) => [p.partido_id, p]),
  );
  // Stats del usuario en la cabecera (derivadas de la tabla de posiciones real).
  const miFila = tabla.find((f) => f.es_actual);
  // Superadmin de plataforma viendo una polla de la que NO es miembro: puede
  // verlo y administrarlo todo, pero no participa (no tiene predicciones).
  const soloVistaAdmin = !miParticipanteId;
  // Puede eliminar la polla el creador o el superadmin de plataforma (mismo
  // criterio que valida el RPC `eliminar_grupo`).
  const puedeEliminarGrupo =
    (!!user && user.id === grupo.creador_id) || esSuperadmin === true;

  // ── Agrupación de "Jugar" ─────────────────────────────────────────────────
  const abiertos = partidos.filter((p) =>
    puedePredecir(p, reglas.minutos_cierre_prediccion, ahora),
  );
  const totalJugables = abiertos.length;

  const ordenados = [...abiertos].sort(compararPartidos);
  const diasPrediccion = agruparPorDia(ordenados);
  const diasPartidos = agruparPorDia([...partidos].sort(compararPartidos));
  // Partidos de hoy: se anclan en su propia sección destacada al inicio de la
  // pestaña "Partidos"; el resto de jornadas sigue en orden cronológico debajo.
  const partidosHoy = diasPartidos.find(([dia]) => dia === claveHoy)?.[1] ?? [];
  const diasPartidosResto = diasPartidos.filter(([dia]) => dia !== claveHoy);

  // Próximo instante de cierre (epoch ms) entre los partidos aún programados:
  // permite refrescar la página sola cuando una apuesta se cierre en vivo, sin
  // que quien la mira tenga que recargar. Solo cuentan cierres futuros (los ya
  // pasados se excluyen para que tras el refresco se reagende el siguiente).
  const ahoraMs = ahora.getTime();
  let proximoCierre: number | null = null;
  for (const p of partidos) {
    if (esSinCierre(p) || p.estado !== "programado") continue;
    const cierre =
      new Date(p.fecha_hora).getTime() -
      reglas.minutos_cierre_prediccion * 60_000;
    if (cierre > ahoraMs && (proximoCierre === null || cierre < proximoCierre)) {
      proximoCierre = cierre;
    }
  }
  // Torneos de los partidos del grupo (para el "en vivo" de marcador/estado).
  const torneoIds = [...new Set(partidos.map((p) => p.torneo_id))];

  return (
    <PageContainer ancho="ancho">
      {/* Refresca la página sola en el instante en que se cierre el próximo
          partido (apuesta → "cerrada / En juego") sin recargar a mano. */}
      <AutoRefrescoCierre proximoCierre={proximoCierre} />
      {/* "En vivo": refresca cuando cambia marcador/estado de un partido. */}
      <RealtimePartidos torneoIds={torneoIds} />

      {/* Cabecera del grupo (bento) */}
      <div className="mb-5 animate-fade-up">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg-strong"
        >
          Mis grupos <ChevronRight className="size-3" />{" "}
          <span className="text-fg-strong">{grupo.nombre}</span>
        </Link>

        {/* Hero de la polla: banner protagonista de la página (no una card más).
            Sangra a los bordes en móvil y va con degradado ink→esmeralda de marca. */}
        <div className="relative mx-[calc(50%-50vw)] overflow-hidden rounded-b-[28px] bg-gradient-to-br from-[var(--clay-900)] via-[var(--clay-800)] to-[var(--mustard-700)] px-5 pb-5 pt-5 shadow-xl sm:mx-0 sm:rounded-3xl sm:px-6 sm:pb-6 sm:pt-6">
          {/* Glow + marca de agua decorativos (puramente estéticos) */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-[var(--mustard-400)]/30 blur-3xl"
          />
          <Trophy
            aria-hidden
            className="pointer-events-none absolute -right-5 -top-3 size-32 rotate-12 text-white/[0.07]"
          />

          {/* Identidad */}
          <div className="relative flex items-start gap-3 sm:gap-4">
            <AvatarGrupo
              nombre={grupo.nombre}
              size="xl"
              className="shadow-lg ring-2 ring-white/25"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-white ring-1 ring-inset ring-white/20">
                  <span
                    aria-hidden
                    className="size-1.5 animate-pulse rounded-full bg-[var(--mustard-300)]"
                  />
                  Activo
                </span>
                <span className="inline-flex items-center gap-1 text-2xs font-semibold text-white/70">
                  <Users className="size-3" aria-hidden />
                  {grupo.total_participantes}{" "}
                  {grupo.total_participantes === 1
                    ? "participante"
                    : "participantes"}
                </span>
              </div>
              <h1 className="t-h1 mt-1.5 text-balance text-white">
                {grupo.nombre}
              </h1>
            </div>
          </div>

          {/* Stats del usuario (posición / puntos / aciertos), glassy sobre el hero */}
          {miFila && (
            <div className="relative mt-5 grid w-full grid-cols-3 divide-x divide-white/10 rounded-2xl border-t border-white/20 bg-black/30 px-2 py-3.5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/10 sm:py-4">
              <div className="px-2 text-center">
                <p className="text-2xs font-extrabold uppercase tracking-wider text-white/55 sm:text-xs">
                  Tu posición
                </p>
                <p className="mt-1.5 flex items-baseline justify-center gap-0.5 sm:mt-2">
                  <span
                    className={cn(
                      "text-2xl font-black tracking-tight sm:text-3xl",
                      miFila.posicion === 1
                        ? "text-gradient-gold"
                        : "text-white",
                    )}
                  >
                    #{miFila.posicion}
                  </span>
                  <span className="text-base font-bold text-white/75">
                    /{grupo.total_participantes}
                  </span>
                </p>
              </div>
              <div className="px-2 text-center">
                <p className="text-2xs font-extrabold uppercase tracking-wider text-white/55 sm:text-xs">
                  Tus puntos
                </p>
                <p className="mt-1.5 text-2xl font-black tracking-tight text-white sm:mt-2 sm:text-3xl">
                  {miFila.puntos_totales}
                </p>
              </div>
              <div className="px-2 text-center">
                <p className="text-2xs font-extrabold uppercase tracking-wider text-white/55 sm:text-xs">
                  Aciertos
                </p>
                {/* Total de predicciones acertadas = parciales + exactos (los
                    exactos ya incluyen a los únicos). En la tabla de posiciones
                    `aciertos` es solo parciales; aquí mostramos el total. */}
                <p className="mt-1.5 text-2xl font-black tracking-tight text-white sm:mt-2 sm:text-3xl">
                  {miFila.aciertos + miFila.marcadores_exactos}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Acciones de la polla: código + compartir + configurar (sobre el fondo
            de la app, donde estos controles claros se ven correctos) */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <BotonCompartirCodigo
            codigo={grupo.codigo_invitacion}
            nombreGrupo={grupo.nombre}
          />
          {esAdmin && (
            <Button
              asChild
              variant="secondary"
              className="w-11 shrink-0 px-0 sm:w-auto sm:px-5"
            >
              <Link
                href={`/grupos/${grupo.id}/configurar`}
                aria-label="Configurar polla"
              >
                <Settings className="size-4" />
                <span className="hidden sm:inline">Configurar</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs principales */}
      <TabsConRefresh defaultValue="jugar" grupoNombre={grupo.nombre}>
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 mb-5 bg-app/95 px-4 py-2 backdrop-blur md:static md:top-0 md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
          <TabsList
            className={cn(
              "grid h-auto w-full gap-1 rounded-2xl border border-border/60 bg-muted p-1.5 shadow-sm md:flex md:h-auto md:items-stretch md:justify-start md:gap-1 md:rounded-none md:border-0 md:border-b md:border-border md:bg-transparent md:p-0 md:shadow-none",
              // La pestaña "Gente" solo existe para el admin de la polla, así que
              // la grilla baja a 4 columnas cuando no eres admin.
              esAdmin ? "grid-cols-5" : "grid-cols-4",
            )}
          >
            <PestanaTab value="jugar" icono={Target} corto="Predecir" largo="Predicciones" />
            <PestanaTab value="partidos" icono={CalendarDays} corto="Partidos" largo="Partidos" />
            <PestanaTab value="tabla" icono={ListOrdered} corto="Tabla" largo="Posiciones" />
            <PestanaTab value="reglas" icono={Scroll} corto="Reglas" largo="Reglas" />
            {esAdmin && (
              <PestanaTab value="gente" icono={Users} corto="Gente" largo="Participantes" />
            )}
          </TabsList>
        </div>

        {/* MIS PREDICCIONES */}
        <TabsContent value="jugar" className="space-y-6">
          {soloVistaAdmin ? (
            <EmptyState
              icono={Eye}
              titulo="Estás viendo como administrador"
              descripcion="No participas en esta polla, así que no puedes hacer predicciones. Puedes revisar la tabla, los partidos, las reglas y los participantes."
            />
          ) : totalJugables === 0 ? (
            <EmptyState
              icono={CalendarDays}
              titulo="No hay partidos por predecir"
              descripcion="Cuando se programen nuevos partidos aparecerán aquí."
            />
          ) : (
            <RevelarJornadas inicial={2}>
              {diasPrediccion.map(([dia, lista]) => (
                <DiaDePredicciones
                  key={dia}
                  partidos={lista}
                  grupoId={grupo.id}
                  participanteId={miParticipanteId}
                  reglas={reglas}
                  prediccionPorPartido={prediccionPorPartido}
                  ahora={ahora}
                  esHoy={dia === claveHoy}
                  totalParticipantes={grupo.total_participantes}
                />
              ))}
            </RevelarJornadas>
          )}
        </TabsContent>

        {/* PARTIDOS */}
        <TabsContent value="partidos" className="space-y-6">
          {/* Sección destacada con los partidos de hoy (si los hay). */}
          {partidosHoy.length > 0 && (
            <SeccionHoyPartidos
              partidos={partidosHoy}
              grupoId={grupo.id}
              reglas={reglas}
              prediccionPorPartido={prediccionPorPartido}
              ahora={ahora}
              totalParticipantes={grupo.total_participantes}
            />
          )}
          {diasPartidosResto.length > 0 && (
            <RevelarJornadas inicial={3}>
              {diasPartidosResto.map(([dia, lista]) => (
                <DiaDePartidos
                  key={dia}
                  partidos={lista}
                  grupoId={grupo.id}
                  reglas={reglas}
                  prediccionPorPartido={prediccionPorPartido}
                  ahora={ahora}
                  totalParticipantes={grupo.total_participantes}
                />
              ))}
            </RevelarJornadas>
          )}
        </TabsContent>

        {/* TABLA */}
        <TabsContent value="tabla">
          <TablaPosiciones
            filas={tabla}
            criterios={reglas.criterios_desempate}
            grupoId={grupo.id}
            partidos={partidos}
            reglas={reglas}
          />
        </TabsContent>

        {/* REGLAS (+ config de admin) */}
        <TabsContent value="reglas" className="space-y-6 md:max-w-xl">
          <ResumenReglas reglas={reglas} />

          {esAdmin && (
            <div className="space-y-3 border-t border-border pt-6">
              <p className="overline">Administración</p>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <p className="t-h4">Invitar gente</p>
                  <p className="t-body-sm text-fg-muted">
                    Comparte este código para que se unan al grupo:
                  </p>
                  <BotonCompartirCodigo
                    codigo={grupo.codigo_invitacion}
                    nombreGrupo={grupo.nombre}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <p className="t-h4">Editar grupo</p>
                  <p className="t-body-sm text-fg-muted">
                    Pronto podrás cambiar el nombre, la descripción y las reglas
                    mientras no haya empezado el torneo.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Editar metadata
                  </Button>
                </CardContent>
              </Card>
              {puedeEliminarGrupo && (
                <EliminarGrupo
                  grupoId={grupo.id}
                  nombre={grupo.nombre}
                  totalParticipantes={grupo.total_participantes}
                />
              )}
            </div>
          )}
        </TabsContent>

        {/* PARTICIPANTES — solo visible para el administrador de la polla */}
        {esAdmin && (
        <TabsContent value="gente" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <SectionHeader
              titulo="Participantes"
              sub={`${participantes.length} en el grupo`}
            />
            <PanelBaneados grupoId={grupo.id} />
          </div>
          <PanelParticipantes
            grupoId={grupo.id}
            participantes={participantes}
            valorApuesta={reglas.valor_apuesta}
            esAdmin={esAdmin}
          />
        </TabsContent>
        )}
      </TabsConRefresh>
    </PageContainer>
  );
}
