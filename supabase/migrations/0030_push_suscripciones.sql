-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Suscripciones Web Push (notificaciones de la PWA)                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Cada navegador/dispositivo en el que el usuario activa las notificaciones
-- genera UNA suscripción (endpoint + claves p256dh/auth). Un mismo usuario puede
-- tener varias filas (iPhone instalado, Android, laptop…). El envío server-side
-- (Edge Function con web-push) firma con VAPID y POST-ea a `endpoint`.
--
-- PRIVACIDAD (CLAUDE.md §3.4): aquí NO se guarda ninguna predicción. El payload
-- de las notificaciones siempre es genérico ("cierra X partido pronto"), nunca
-- marcadores de nadie. Las claves son del navegador del propio usuario.
--
-- iOS: Web Push solo funciona con la PWA instalada (iOS 16.4+). Esa restricción
-- es del cliente; aquí da igual el origen de la suscripción.

create table public."tblPushSuscripciones" (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public."tblProfiles"(id) on delete cascade,
  -- URL del push service del navegador (FCM/Mozilla/Apple). Única globalmente:
  -- si el mismo navegador re-suscribe, hacemos upsert sobre este endpoint.
  endpoint    text not null unique,
  -- Claves de cifrado del navegador (estándar Web Push, NO secretos del server).
  p256dh      text not null,
  auth        text not null,
  -- User-agent abreviado, solo para que el usuario distinga sus dispositivos
  -- en una futura pantalla de "sesiones". Sin PII.
  user_agent  text,
  creado_en   timestamptz not null default now(),
  -- Última vez que un envío usó esta suscripción con éxito. Permite limpiar
  -- suscripciones muertas (las que el push service rechaza con 404/410 se
  -- borran directamente en la Edge Function).
  usado_en    timestamptz
);

create index "idxPushSuscripcionesUsuario"
  on public."tblPushSuscripciones" (usuario_id);

alter table public."tblPushSuscripciones" enable row level security;

-- ── RLS: cada usuario gestiona SOLO sus propias suscripciones ────────────────
-- El envío server-side usa la service_role (bypassa RLS) para leer las de todos.
create policy "push_select_propias" on public."tblPushSuscripciones"
  for select to authenticated
  using (usuario_id = auth.uid());

create policy "push_insert_propias" on public."tblPushSuscripciones"
  for insert to authenticated
  with check (usuario_id = auth.uid());

create policy "push_update_propias" on public."tblPushSuscripciones"
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

create policy "push_delete_propias" on public."tblPushSuscripciones"
  for delete to authenticated
  using (usuario_id = auth.uid());
