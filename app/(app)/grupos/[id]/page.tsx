import Link from "next/link";
import {
  Trophy,
  Shield,
  ChevronRight,
  CalendarDays,
  Settings,
  Target,
  ListOrdered,
  Scroll,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getGrupoDetalle } from "@/lib/queries/grupo-detalle";
import { puedePredecir } from "@/lib/utils/prediccion";
import { formatearMonto } from "@/lib/utils/texto";
import { claveDiaBogota, formatearFechaLarga } from "@/lib/utils/fechas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { AvatarGrupo } from "@/components/grupos/AvatarGrupo";
import { PageContainer } from "@/components/shared/PageContainer";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { TablaPosiciones } from "@/components/grupos/TablaPosiciones";
import { TarjetaPartido } from "@/components/partidos/TarjetaPartido";
import { TarjetaPrediccion } from "@/components/partidos/TarjetaPrediccion";
import { BotonCompartirCodigo } from "@/components/grupos/BotonCompartirCodigo";
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

/** Agrupa los partidos por día (clave estable en zona Bogotá). */
function agruparPorDia(partidos: Partido[]): [string, Partido[]][] {
  const mapa = new Map<string, Partido[]>();
  for (const p of partidos) {
    const dia = claveDiaBogota(p.fecha_hora);
    const lista = mapa.get(dia);
    if (lista) lista.push(p);
    else mapa.set(dia, [p]);
  }
  return [...mapa.entries()];
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
    <h3 className="mb-4 flex items-center gap-2.5">
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
      {esHoy && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive-soft px-2.5 py-1 text-2xs font-extrabold uppercase tracking-wide text-destructive">
          <span
            aria-hidden
            className="size-1.5 animate-pulse rounded-full bg-destructive"
          />
          ¡Es hoy!
        </span>
      )}
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-border to-transparent"
      />
    </h3>
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
}: {
  partidos: Partido[];
  grupoId: string;
  participanteId: string;
  reglas: ReglasGrupo;
  prediccionPorPartido: Map<string, Prediccion>;
  ahora: Date;
  esHoy: boolean;
}) {
  if (partidos.length === 0) return null;
  return (
    <section className="border-t border-strong pt-6 first:border-t-0 first:pt-0">
      <EncabezadoFecha
        fecha={formatearFechaLarga(partidos[0]!.fecha_hora)}
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
          />
        ))}
      </div>
    </section>
  );
}

/** Grilla de partidos de un día (pestaña "Partidos"), con encabezado de fecha. */
function DiaDePartidos({
  partidos,
  reglas,
  prediccionPorPartido,
  esHoy,
}: {
  partidos: Partido[];
  reglas: ReglasGrupo;
  prediccionPorPartido: Map<string, Prediccion>;
  esHoy: boolean;
}) {
  if (partidos.length === 0) return null;
  return (
    <section className="border-t border-strong pt-6 first:border-t-0 first:pt-0">
      <EncabezadoFecha
        fecha={formatearFechaLarga(partidos[0]!.fecha_hora)}
        count={partidos.length}
        esHoy={esHoy}
      />
      <div className="grid gap-2.5 md:grid-cols-2">
        {partidos.map((p) => (
          <TarjetaPartido
            key={p.id}
            partido={p}
            miPrediccion={prediccionPorPartido.get(p.id)}
            reglas={reglas}
          />
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
  const detalle = await getGrupoDetalle(id);

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

  // ── Agrupación de "Jugar" ─────────────────────────────────────────────────
  const abiertos = partidos.filter((p) =>
    puedePredecir(p, reglas.minutos_cierre_prediccion, ahora),
  );
  const totalJugables = abiertos.length;

  const ordenados = [...abiertos].sort(
    (a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora),
  );
  const diasPrediccion = agruparPorDia(ordenados);
  const diasPartidos = agruparPorDia(
    [...partidos].sort(
      (a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora),
    ),
  );

  return (
    <PageContainer ancho="ancho">
      {/* Cabecera del grupo (bento) */}
      <div className="mb-5 animate-fade-up">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg-strong"
        >
          Mis grupos <ChevronRight className="size-3" />{" "}
          <span className="text-fg-strong">{grupo.nombre}</span>
        </Link>

        <div className="rounded-2xl border border-strong bg-elevated p-4 shadow-md sm:p-5">
          {/* Fila superior: identidad + acciones (compartir / configurar) */}
          <div className="flex items-start gap-3 sm:gap-4">
            <AvatarGrupo
              nombre={grupo.nombre}
              size="xl"
              className="shadow-md ring-2 ring-app"
            />
            <div className="min-w-0 flex-1">
              <h1 className="t-h1">{grupo.nombre}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-fg-muted">
                <Badge variant="success" dot>
                  Activo
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats del usuario (posición / puntos / aciertos) */}
          {miFila && (
            <div className="mt-4 grid w-full grid-cols-3 divide-x divide-[var(--border-strong)] rounded-2xl bg-sunken px-2 py-2.5 sm:py-3.5">
              <div className="px-2 text-center">
                <p className="text-xs font-bold text-fg-default sm:text-sm">Tu posición</p>
                <p className="mt-1 flex items-baseline justify-center gap-0.5 sm:mt-1.5">
                  <span
                    className={cn(
                      "text-xl font-black tracking-tight sm:text-2xl",
                      miFila.posicion === 1
                        ? "text-gradient-gold"
                        : "text-fg-strong",
                    )}
                  >
                    #{miFila.posicion}
                  </span>
                  <span className="t-caption font-bold">
                    /{grupo.total_participantes}
                  </span>
                </p>
              </div>
              <div className="px-2 text-center">
                <p className="text-xs font-bold text-fg-default sm:text-sm">Tus puntos</p>
                <p className="mt-1 text-xl font-black tracking-tight text-fg-strong sm:mt-1.5 sm:text-2xl">
                  {miFila.puntos_totales}
                </p>
              </div>
              <div className="px-2 text-center">
                <p className="text-xs font-bold text-fg-default sm:text-sm">Aciertos</p>
                <p className="mt-1 text-xl font-black tracking-tight text-fg-strong sm:mt-1.5 sm:text-2xl">
                  {miFila.aciertos}
                </p>
              </div>
            </div>
          )}

          {/* Acciones de la polla: código + compartir + configurar */}
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
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="jugar">
        <div className="sticky top-14 z-30 -mx-4 mb-5 bg-app/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
          <TabsList className="grid h-auto w-full grid-cols-5 gap-1 rounded-2xl border border-border/60 bg-muted p-1.5 shadow-sm md:flex md:h-auto md:items-stretch md:justify-start md:gap-1 md:rounded-none md:border-0 md:border-b md:border-border md:bg-transparent md:p-0 md:shadow-none">
            <PestanaTab value="jugar" icono={Target} corto="Predecir" largo="Predicciones" />
            <PestanaTab value="tabla" icono={ListOrdered} corto="Tabla" largo="Posiciones" />
            <PestanaTab value="partidos" icono={CalendarDays} corto="Partidos" largo="Partidos" />
            <PestanaTab value="reglas" icono={Scroll} corto="Reglas" largo="Reglas" />
            <PestanaTab value="gente" icono={Users} corto="Gente" largo="Participantes" />
          </TabsList>
        </div>

        {/* MIS PREDICCIONES */}
        <TabsContent value="jugar" className="space-y-6">
          {totalJugables === 0 ? (
            <EmptyState
              icono={CalendarDays}
              titulo="No hay partidos por predecir"
              descripcion="Cuando se programen nuevos partidos aparecerán aquí."
            />
          ) : (
            diasPrediccion.map(([dia, lista]) => (
              <DiaDePredicciones
                key={dia}
                partidos={lista}
                grupoId={grupo.id}
                participanteId={miParticipanteId}
                reglas={reglas}
                prediccionPorPartido={prediccionPorPartido}
                ahora={ahora}
                esHoy={dia === claveHoy}
              />
            ))
          )}
        </TabsContent>

        {/* TABLA */}
        <TabsContent value="tabla">
          <TablaPosiciones filas={tabla} />
        </TabsContent>

        {/* PARTIDOS */}
        <TabsContent value="partidos" className="space-y-6">
          {diasPartidos.map(([dia, lista]) => (
            <DiaDePartidos
              key={dia}
              partidos={lista}
              reglas={reglas}
              prediccionPorPartido={prediccionPorPartido}
              esHoy={dia === claveHoy}
            />
          ))}
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
            </div>
          )}
        </TabsContent>

        {/* PARTICIPANTES */}
        <TabsContent value="gente" className="space-y-4">
          <SectionHeader
            titulo="Participantes"
            sub={`${participantes.length} en el grupo`}
          />
          <div className="grid gap-2 md:grid-cols-2">
            {participantes.map((part, i) => (
              <div
                key={part.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className="surface-card hover-lift flex animate-fade-up items-center gap-3 rounded-xl p-3"
              >
                <AvatarNotion
                  nombre={part.usuario.nombre_completo}
                  size="sm"
                  className="ring-2 ring-app"
                />
                <div className="min-w-0 flex-1">
                  <p className="t-body-sm truncate font-bold text-fg-strong">
                    {part.usuario.nombre_completo}
                  </p>
                  <p className="t-caption">
                    {part.pago_realizado ? "Pago al día" : "Pago pendiente"}
                  </p>
                </div>
                {part.rol === "admin" && (
                  <Badge variant="accent">
                    <Shield className="size-3" /> Admin
                  </Badge>
                )}
                <span className="t-h4 tabular-nums text-fg-strong">
                  {part.puntos_totales}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
