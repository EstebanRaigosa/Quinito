"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Globe, Loader2, Search, Send, User, Users, X } from "lucide-react";
import { toast } from "sonner";
import { notificacionSchema, type NotificacionInput } from "@/lib/schemas/notificacion";
import { enviarNotificacion, buscarUsuarios } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Polla = { id: string; nombre: string };
type UsuarioEncontrado = { id: string; nombre: string | null; email: string };

const AUDIENCIAS = [
  { valor: "plataforma", etiqueta: "Toda la plataforma", icono: Globe },
  { valor: "polla", etiqueta: "Una polla", icono: Users },
  { valor: "usuario", etiqueta: "Un usuario", icono: User },
] as const;

export function FormularioNotificacion({ pollas }: { pollas: Polla[] }) {
  const [enviando, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<NotificacionInput>({
    resolver: zodResolver(notificacionSchema),
    defaultValues: {
      titulo: "",
      cuerpo: "",
      url: "",
      imagen_url: "",
      accion_label: "",
      audiencia_tipo: "plataforma",
      grupo_id: "",
      usuario_id: "",
    },
  });

  // `useWatch` (memoizable) en vez de `watch()` para que el React Compiler no
  // omita la memoización del componente.
  const valores = useWatch({ control });
  const audiencia = valores.audiencia_tipo ?? "plataforma";

  // ── Buscador de usuario (solo cuando audiencia = 'usuario') ────────────────
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<UsuarioEncontrado[]>([]);
  const [usuarioSel, setUsuarioSel] = useState<UsuarioEncontrado | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (audiencia !== "usuario" || usuarioSel) return;
    const termino = busqueda.trim();
    let vivo = true;
    // Todo el setState va dentro del callback async (no en el cuerpo del effect)
    // para no disparar renders en cascada (regla react-hooks/set-state).
    const t = setTimeout(async () => {
      if (termino.length < 2) {
        if (vivo) setResultados([]);
        return;
      }
      if (vivo) setBuscando(true);
      const r = await buscarUsuarios(termino);
      if (vivo) {
        setResultados(r);
        setBuscando(false);
      }
    }, 350);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [busqueda, audiencia, usuarioSel]);

  function elegirUsuario(u: UsuarioEncontrado) {
    setUsuarioSel(u);
    setValue("usuario_id", u.id, { shouldValidate: true });
    setResultados([]);
  }

  function limpiarUsuario() {
    setUsuarioSel(null);
    setValue("usuario_id", "", { shouldValidate: true });
    setBusqueda("");
  }

  function onSubmit(data: NotificacionInput) {
    startTransition(async () => {
      const res = await enviarNotificacion(data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Notificación enviada a ${res.destinatarios} ${
          res.destinatarios === 1 ? "persona" : "personas"
        }. Push: ${res.pushEnviados}.`,
      );
      reset();
      limpiarUsuario();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── Formulario ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Audiencia */}
        <div className="space-y-2">
          <Label>¿A quién se la enviamos?</Label>
          <div className="grid grid-cols-3 gap-2">
            {AUDIENCIAS.map((a) => {
              const activa = audiencia === a.valor;
              const Icono = a.icono;
              return (
                <button
                  key={a.valor}
                  type="button"
                  onClick={() => setValue("audiencia_tipo", a.valor)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                    activa
                      ? "border-primary bg-primary-soft text-primary shadow-glow"
                      : "border-border text-fg-muted hover:border-primary/40",
                  )}
                >
                  <Icono className="size-5" aria-hidden />
                  <span className="t-caption font-semibold leading-tight">
                    {a.etiqueta}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector de polla */}
        {audiencia === "polla" && (
          <div className="space-y-1.5">
            <Label htmlFor="grupo_id">Polla destino</Label>
            <select
              id="grupo_id"
              {...register("grupo_id")}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-fg-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Elige una polla…</option>
              {pollas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {errors.grupo_id && (
              <p className="t-caption text-danger">{errors.grupo_id.message}</p>
            )}
          </div>
        )}

        {/* Buscador de usuario */}
        {audiencia === "usuario" && (
          <div className="space-y-1.5">
            <Label htmlFor="buscar-usuario">Usuario destino</Label>
            {usuarioSel ? (
              <div className="flex items-center justify-between rounded-xl border border-primary bg-primary-soft px-3 py-2.5">
                <div className="min-w-0">
                  <p className="t-body-sm truncate font-semibold text-fg-strong">
                    {usuarioSel.nombre ?? "Sin nombre"}
                  </p>
                  <p className="t-caption truncate text-fg-muted">{usuarioSel.email}</p>
                </div>
                <button
                  type="button"
                  onClick={limpiarUsuario}
                  aria-label="Quitar usuario"
                  className="ml-2 grid size-7 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-surface"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
                  <Input
                    id="buscar-usuario"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Nombre o correo…"
                    className="pl-9"
                    autoComplete="off"
                  />
                  {buscando && (
                    <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-fg-subtle" />
                  )}
                </div>
                {resultados.length > 0 && (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {resultados.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => elegirUsuario(u)}
                          className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-surface"
                        >
                          <span className="t-body-sm font-semibold text-fg-strong">
                            {u.nombre ?? "Sin nombre"}
                          </span>
                          <span className="t-caption text-fg-muted">{u.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {errors.usuario_id && (
              <p className="t-caption text-danger">{errors.usuario_id.message}</p>
            )}
          </div>
        )}

        {/* Título */}
        <div className="space-y-1.5">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" {...register("titulo")} placeholder="⚽ ¡Arrancó el Mundial!" />
          {errors.titulo && (
            <p className="t-caption text-danger">{errors.titulo.message}</p>
          )}
        </div>

        {/* Cuerpo */}
        <div className="space-y-1.5">
          <Label htmlFor="cuerpo">Mensaje</Label>
          <Textarea
            id="cuerpo"
            {...register("cuerpo")}
            rows={3}
            placeholder="Entra y haz tus predicciones antes de que cierre el primer partido 🔥"
          />
          {errors.cuerpo && (
            <p className="t-caption text-danger">{errors.cuerpo.message}</p>
          )}
        </div>

        {/* Link destino */}
        <div className="space-y-1.5">
          <Label htmlFor="url">Enlace al tocar (opcional)</Label>
          <Input id="url" {...register("url")} placeholder="/partidos" />
          <p className="t-caption text-fg-subtle">
            Ruta interna de la app. Ej: <code>/dashboard</code>, <code>/partidos</code>.
          </p>
        </div>

        {/* Imagen + acción (Android) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="imagen_url">Imagen banner (opcional)</Label>
            <Input
              id="imagen_url"
              {...register("imagen_url")}
              placeholder="https://…/banner.jpg"
            />
            {errors.imagen_url && (
              <p className="t-caption text-danger">{errors.imagen_url.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accion_label">Texto del botón (opcional)</Label>
            <Input id="accion_label" {...register("accion_label")} placeholder="Predecir ahora" />
          </div>
        </div>
        <p className="t-caption -mt-2 text-fg-subtle">
          La imagen y el botón solo se ven en Android. En iPhone se muestra ícono +
          título + texto.
        </p>

        <Button type="submit" disabled={enviando} className="w-full sm:w-auto">
          {enviando ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Enviando…
            </>
          ) : (
            <>
              <Send className="size-4" /> Enviar notificación
            </>
          )}
        </Button>
      </form>

      {/* ── Preview en vivo ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label className="text-fg-subtle">Vista previa</Label>
        <Card className="overflow-hidden p-0 shadow-md">
          {valores.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={valores.imagen_url}
              alt=""
              className="aspect-video w-full bg-muted object-cover"
            />
          )}
          <div className="flex gap-3 p-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
              <Bell className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="t-body-sm font-bold text-fg-strong">
                {valores.titulo || "Título de la notificación"}
              </p>
              <p className="t-caption mt-0.5 text-fg-muted">
                {valores.cuerpo || "Aquí va el mensaje que verá la persona."}
              </p>
              <p className="overline mt-1.5 text-fg-subtle">Pollota · ahora</p>
              {valores.accion_label && (
                <span className="mt-2 inline-block rounded-md bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                  {valores.accion_label}
                </span>
              )}
            </div>
          </div>
        </Card>
        <p className="t-caption text-fg-subtle">
          Así se verá aproximadamente. El sistema operativo decide el estilo final.
        </p>
      </div>
    </div>
  );
}
