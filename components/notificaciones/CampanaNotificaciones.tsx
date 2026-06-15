"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMisNotificaciones,
  useMarcarLeidas,
  type NotificacionBandeja,
} from "@/lib/queries/notificaciones";
import { cn } from "@/lib/utils";

/** Fecha relativa corta en es-CO ("ahora", "hace 5 min", "hace 2 h", "12 jun"). */
function hace(iso: string): string {
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return "ahora";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  });
}

function ItemNotificacion({
  n,
  onNavegar,
}: {
  n: NotificacionBandeja;
  onNavegar: () => void;
}) {
  const noLeida = n.leida_en === null;
  const contenido = (
    <div className="flex gap-3">
      {n.imagen_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.imagen_url}
          alt=""
          className="size-12 shrink-0 rounded-lg bg-muted object-cover"
        />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <Bell className="size-5" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="t-body-sm font-bold text-fg-strong">{n.titulo}</p>
        <p className="t-caption mt-0.5 text-fg-muted">{n.cuerpo}</p>
        <p className="overline mt-1 text-fg-subtle">{hace(n.creada_en)}</p>
      </div>
      {noLeida && (
        <span
          className="mt-1 size-2 shrink-0 rounded-full bg-primary"
          aria-label="No leída"
        />
      )}
    </div>
  );

  const clases = cn(
    "block rounded-xl border p-3 transition-colors",
    noLeida ? "border-primary/30 bg-primary-soft/40" : "border-border",
  );

  // Si trae enlace, todo el item navega; si no, es solo lectura.
  return n.url ? (
    <Link href={n.url} onClick={onNavegar} className={cn(clases, "hover:bg-sunken")}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

/** Campanita de notificaciones del topbar: badge de no leídas + bandeja (Sheet). */
export function CampanaNotificaciones() {
  const [abierto, setAbierto] = useState(false);
  const { data, isLoading } = useMisNotificaciones();
  const marcarLeidas = useMarcarLeidas();

  const noLeidas = useMemo(
    () => (data ?? []).filter((n) => n.leida_en === null).length,
    [data],
  );

  function onOpenChange(v: boolean) {
    setAbierto(v);
    // Al abrir, marca todo como leído (baja el badge). La lista sigue visible.
    if (v && noLeidas > 0) marcarLeidas.mutate();
  }

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={
            noLeidas > 0 ? `Notificaciones (${noLeidas} sin leer)` : "Notificaciones"
          }
          className="relative grid size-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-sunken hover:text-primary"
        >
          <Bell className="size-5" />
          {noLeidas > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-sm p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="size-5 text-primary" /> Notificaciones
          </SheetTitle>
        </SheetHeader>

        <div className="h-[calc(100%-4rem)] space-y-2 overflow-y-auto p-4">
          {isLoading ? (
            <>
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </>
          ) : data && data.length > 0 ? (
            data.map((n) => (
              <ItemNotificacion key={n.id} n={n} onNavegar={() => setAbierto(false)} />
            ))
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-sunken text-fg-subtle">
                <BellOff className="size-6" aria-hidden />
              </span>
              <p className="t-body-sm font-semibold text-fg-strong">
                Sin notificaciones
              </p>
              <p className="t-caption max-w-[15rem] text-fg-muted">
                Aquí aparecerán los avisos de tus pollas y las novedades de Pollota.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
