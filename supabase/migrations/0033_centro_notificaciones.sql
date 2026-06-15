-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Centro de notificaciones (envío manual del superadmin + bandeja in-app)  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- El superadmin de plataforma redacta una notificación (título, cuerpo, link,
-- imagen y botón) y la dirige a: toda la plataforma, los miembros de una polla
-- o un usuario concreto. Cada envío:
--   1. Crea la notificación (`tblNotificaciones`).
--   2. Hace fan-out a un destinatario por usuario (`tblNotificacionesDestinatarios`)
--      → alimenta la bandeja in-app (campanita) con estado de leído por usuario.
--   3. (Aparte, vía Edge Function) manda el push del sistema a sus dispositivos.
--
-- PRIVACIDAD/SEGURIDAD (CLAUDE.md §3.4): el contenido lo escribe el superadmin;
-- no expone predicciones. Toda escritura pasa por RPCs `SECURITY DEFINER` que
-- validan `es_superadmin()`; las tablas no aceptan escritura directa de usuarios.

-- ── El mensaje compuesto ─────────────────────────────────────────────────────
create table public."tblNotificaciones" (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  cuerpo          text not null,
  url             text,                 -- ruta interna a abrir al tocar (ej. /partidos)
  imagen_url      text,                 -- banner grande (solo Android lo muestra)
  accion_label    text,                 -- etiqueta del botón (solo Android)
  audiencia_tipo  text not null check (audiencia_tipo in ('plataforma','polla','usuario')),
  audiencia_grupo_id   uuid references public."tblGrupos"(id)   on delete set null,
  audiencia_usuario_id uuid references public."tblProfiles"(id) on delete set null,
  creada_por      uuid references public."tblProfiles"(id) on delete set null,
  creada_en       timestamptz not null default now(),
  enviada_en      timestamptz,          -- cuándo terminó el fan-out de push
  total_destinatarios int not null default 0,
  total_push_enviados int not null default 0
);

create index "idxNotificacionesCreadaEn"
  on public."tblNotificaciones" (creada_en desc);

alter table public."tblNotificaciones" enable row level security;

-- Solo el superadmin lee el catálogo completo (historial del panel). El usuario
-- normal NO lee esta tabla directamente: ve su bandeja vía `mis_notificaciones`.
create policy "notificaciones_select_superadmin" on public."tblNotificaciones"
  for select to authenticated
  using (es_superadmin());

-- ── La bandeja por usuario (fan-out) ─────────────────────────────────────────
create table public."tblNotificacionesDestinatarios" (
  id              uuid primary key default gen_random_uuid(),
  notificacion_id uuid not null references public."tblNotificaciones"(id) on delete cascade,
  usuario_id      uuid not null references public."tblProfiles"(id)       on delete cascade,
  leida_en        timestamptz,
  creada_en       timestamptz not null default now(),
  unique (notificacion_id, usuario_id)
);

create index "idxNotifDestUsuarioNoLeida"
  on public."tblNotificacionesDestinatarios" (usuario_id, leida_en);

alter table public."tblNotificacionesDestinatarios" enable row level security;
-- Sin policies: la bandeja se lee/escribe vía RPCs SECURITY DEFINER y la
-- Edge Function (service_role). RLS activa sin policy bloquea acceso directo.

-- ── RPC: crear notificación + fan-out (solo superadmin) ──────────────────────
create or replace function public.crear_notificacion(
  p_titulo       text,
  p_cuerpo       text,
  p_url          text,
  p_imagen_url   text,
  p_accion_label text,
  p_audiencia_tipo text,
  p_grupo_id     uuid,
  p_usuario_id   uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not es_superadmin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if p_audiencia_tipo = 'polla' and p_grupo_id is null then
    raise exception 'Falta la polla destino' using errcode = '22023';
  end if;
  if p_audiencia_tipo = 'usuario' and p_usuario_id is null then
    raise exception 'Falta el usuario destino' using errcode = '22023';
  end if;

  insert into public."tblNotificaciones"
    (titulo, cuerpo, url, imagen_url, accion_label,
     audiencia_tipo, audiencia_grupo_id, audiencia_usuario_id, creada_por)
  values
    (p_titulo, p_cuerpo, nullif(p_url, ''), nullif(p_imagen_url, ''),
     nullif(p_accion_label, ''),
     p_audiencia_tipo,
     case when p_audiencia_tipo = 'polla'   then p_grupo_id   end,
     case when p_audiencia_tipo = 'usuario' then p_usuario_id end,
     auth.uid())
  returning id into v_id;

  -- Fan-out: un destinatario por usuario objetivo (distinct evita duplicados
  -- si un usuario está varias veces; on conflict por si acaso).
  if p_audiencia_tipo = 'plataforma' then
    insert into public."tblNotificacionesDestinatarios" (notificacion_id, usuario_id)
    select v_id, p.id from public."tblProfiles" p
    on conflict do nothing;
  elsif p_audiencia_tipo = 'polla' then
    insert into public."tblNotificacionesDestinatarios" (notificacion_id, usuario_id)
    select distinct v_id, pt.usuario_id
    from public."tblParticipantes" pt
    where pt.grupo_id = p_grupo_id
    on conflict do nothing;
  else -- usuario
    insert into public."tblNotificacionesDestinatarios" (notificacion_id, usuario_id)
    values (v_id, p_usuario_id)
    on conflict do nothing;
  end if;

  update public."tblNotificaciones"
  set total_destinatarios = (
    select count(*) from public."tblNotificacionesDestinatarios"
    where notificacion_id = v_id
  )
  where id = v_id;

  return v_id;
end;
$$;

revoke execute on function
  public.crear_notificacion(text, text, text, text, text, text, uuid, uuid)
  from public, anon;

-- ── RPC: buscar usuarios para el selector de audiencia (solo superadmin) ─────
create or replace function public.superadmin_buscar_usuarios(p_q text)
returns table (id uuid, nombre text, email text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.nombre_completo, p.email
  from public."tblProfiles" p
  where es_superadmin()
    and (
      p.nombre_completo ilike '%' || p_q || '%'
      or p.email ilike '%' || p_q || '%'
    )
  order by p.nombre_completo nulls last
  limit 20;
$$;

revoke execute on function public.superadmin_buscar_usuarios(text)
  from public, anon;

-- ── RPC: bandeja del usuario actual (campanita) ──────────────────────────────
create or replace function public.mis_notificaciones(p_limite int default 30)
returns json
language sql
security definer
set search_path = public
as $$
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  from (
    select n.id, n.titulo, n.cuerpo, n.url, n.imagen_url, n.accion_label,
           n.creada_en, d.leida_en
    from public."tblNotificacionesDestinatarios" d
    join public."tblNotificaciones" n on n.id = d.notificacion_id
    where d.usuario_id = auth.uid()
    order by n.creada_en desc
    limit p_limite
  ) t;
$$;

revoke execute on function public.mis_notificaciones(int) from public, anon;

-- ── RPC: marcar como leídas (todas las del usuario, o un subconjunto) ────────
create or replace function public.marcar_notificaciones_leidas(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = public
as $$
  update public."tblNotificacionesDestinatarios"
  set leida_en = now()
  where usuario_id = auth.uid()
    and leida_en is null
    and (p_ids is null or notificacion_id = any(p_ids));
$$;

revoke execute on function public.marcar_notificaciones_leidas(uuid[]) from public, anon;
