"use client";

import { Bell, BellRing, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePushNotificaciones } from "@/lib/hooks/usePushNotificaciones";

/**
 * Toggle de notificaciones push de la PWA (switch on/off).
 *
 * Toda la lógica de soporte/plataforma/suscripción vive en
 * `usePushNotificaciones` (compartida con `PromptNotificaciones`). Aquí solo se
 * renderiza el estado dentro de la sección de Notificaciones del perfil.
 *
 * Reglas de compatibilidad (CLAUDE.md §3.3):
 * - iOS solo permite push con la PWA **instalada** (iOS 16.4+). Si es iOS y no
 *   está en standalone, mostramos una nota en vez del switch (el de instalar ya
 *   vive arriba en el perfil).
 * - Alternar el switch dispara `Notification.requestPermission()` desde este
 *   `onClick` (gesto del usuario). Nunca en montaje.
 * - Si el navegador no soporta push, no renderiza nada.
 */
export function BotonNotificaciones() {
  const { soporta, seguro, standalone, ios, suscrito, cargando, denegado, activar, desactivar } =
    usePushNotificaciones();

  // iOS sin instalar: push no funciona hasta añadir a la pantalla de inicio.
  // Se evalúa ANTES que `soporta` a propósito: Safari en pestaña (no instalado)
  // ni siquiera expone las APIs de push, así que `soporta` es `false` y, sin
  // esta rama, el diálogo de Notificaciones quedaría vacío y sin explicación.
  if (ios && !standalone) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-fg-muted">
          <Bell className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-body-sm font-bold text-fg-strong">Recordatorios de cierre</p>
          <p className="t-caption text-fg-muted">
            En iPhone, primero instala la app en tu pantalla de inicio para poder
            recibir avisos.
          </p>
        </div>
      </Card>
    );
  }

  // Sin soporte de Web Push: en vez de no renderizar nada (lo que deja el
  // diálogo en blanco), explicamos la causa. La más común al desarrollar/probar
  // es abrir la app por un origen HTTP (sin contexto seguro): ahí los service
  // workers no existen y `soporta` da `false` en todos los dispositivos.
  if (!soporta) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-fg-muted">
          <Bell className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-body-sm font-bold text-fg-strong">Recordatorios de cierre</p>
          <p className="t-caption text-fg-muted">
            {!seguro
              ? "Las notificaciones requieren una conexión segura (HTTPS). Abre la app desde su dirección https:// (o localhost) para poder activarlas."
              : "Este navegador no admite notificaciones. Prueba con Chrome (Android) o Safari (iPhone, con la app instalada)."}
          </p>
        </div>
      </Card>
    );
  }

  const activo = suscrito === true;
  const deshabilitado = cargando || denegado || suscrito === null;

  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={
          "grid size-10 shrink-0 place-items-center rounded-xl " +
          (activo
            ? "bg-primary text-primary-foreground shadow-glow"
            : "bg-primary-soft text-primary")
        }
      >
        {activo ? (
          <BellRing className="size-5" aria-hidden />
        ) : (
          <Bell className="size-5" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="t-body-sm font-bold text-fg-strong">
          Recordatorios de cierre
        </p>
        <p className="t-caption text-fg-muted">
          {denegado
            ? "Bloqueadas en el navegador. Actívalas desde sus ajustes."
            : "Te avisamos antes de que cierre un partido sin tu predicción."}
        </p>
      </div>
      {cargando ? (
        <Loader2 className="size-5 shrink-0 animate-spin text-fg-muted" aria-hidden />
      ) : (
        <Switch
          checked={activo}
          disabled={deshabilitado}
          onCheckedChange={(v) => (v ? activar() : desactivar())}
          aria-label="Recordatorios de cierre"
        />
      )}
    </Card>
  );
}
