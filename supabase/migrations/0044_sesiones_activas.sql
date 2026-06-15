-- Presencia de usuarios conectados (panel de admin de plataforma).
--
-- Una fila por usuario que se actualiza con un "latido" liviano desde el cliente
-- (al montar, cada ~45s, al cambiar de sección y al volver del segundo plano).
-- No hay escrituras en ráfaga: el costo es un UPSERT esporádico por usuario
-- activo. NO se usa Realtime aquí (el panel lo lee server-side con service_role),
-- por eso esta tabla NO se agrega a la publicación supabase_realtime.
--
-- Privacidad (CLAUDE.md §3.4): RLS estricto — cada usuario solo puede ver y
-- escribir SU propia fila. Nadie puede leer la presencia de otro desde el
-- cliente. El panel de admin la consulta únicamente en el servidor, tras validar
-- esSuperAdmin, con el cliente service_role (que bypassa RLS).

create table if not exists public."tblSesionesActivas" (
  usuario_id uuid primary key
    references public."tblProfiles"(id) on delete cascade,
  -- Inicio de la sesión actual (se reinicia al abrir la app).
  conectado_en timestamptz not null default now(),
  -- Último latido recibido: base para "activo / hace cuánto".
  ultima_actividad timestamptz not null default now(),
  -- Sección legible donde está el usuario (ej. "Inicio", "En una polla").
  seccion text not null default '',
  -- 'movil' | 'escritorio' (aproximado por user agent).
  dispositivo text not null default 'escritorio',
  -- Pestaña visible en primer plano (false = la app quedó en segundo plano).
  visible boolean not null default true
);

comment on table public."tblSesionesActivas" is
  'Presencia en vivo: una fila por usuario actualizada por el latido del cliente. Solo el propio usuario la lee/escribe (RLS); el admin la consulta server-side.';

-- Para listar/ordenar a los conectados recientes en el panel de admin.
create index if not exists "idx_sesiones_ultima_actividad"
  on public."tblSesionesActivas" (ultima_actividad desc);

alter table public."tblSesionesActivas" enable row level security;

-- Cada usuario gestiona EXCLUSIVAMENTE su propia fila (select/insert/update/
-- delete). Permite el upsert del latido y garantiza la privacidad: nadie ve la
-- presencia de otro desde el cliente.
drop policy if exists "sesion propia" on public."tblSesionesActivas";
create policy "sesion propia"
  on public."tblSesionesActivas"
  for all
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
