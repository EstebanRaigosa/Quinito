-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Eliminar / banear participantes de una polla                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- El admin de un grupo puede:
--   1. Eliminar a un participante (sale del grupo; puede volver a unirse).
--   2. Eliminar + banear (sale del grupo y NO puede volver con el código).
--   3. Desbanear (revierte el baneo; el usuario podría volver a unirse).
--
-- Reglas:
--   • Al salir del grupo se borran sus predicciones y puntos de ESE grupo
--     (cascade vía FK de tblPredicciones → tblParticipantes). No afecta otros
--     grupos.
--   • El admin no puede eliminarse a sí mismo ni a otro admin.
--   • Un usuario baneado no puede volver a insertarse en tblParticipantes
--     (trigger de defensa en profundidad) y el grupo deja de aparecerle al
--     buscar por código (buscar_grupo lo excluye).

-- ── Tabla de baneados ───────────────────────────────────────────────────────
create table public."tblParticipantesBaneados" (
  grupo_id    uuid not null references public."tblGrupos"(id)   on delete cascade,
  usuario_id  uuid not null references public."tblProfiles"(id) on delete cascade,
  baneado_por uuid          references public."tblProfiles"(id) on delete set null,
  baneado_en  timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);

create index "idxBaneadosUsuario" on public."tblParticipantesBaneados" (usuario_id);

alter table public."tblParticipantesBaneados" enable row level security;

-- Solo el admin del grupo puede LEER la lista de baneados (para el panel de
-- desbaneo). Las escrituras van exclusivamente por los RPCs security definer
-- de abajo, así que no se declaran policies de insert/update/delete.
create policy "baneados_select" on public."tblParticipantesBaneados"
for select to authenticated using (es_admin_grupo(grupo_id));

-- ── Trigger: bloquear re-inserción de un usuario baneado ────────────────────
-- Defensa en profundidad: aunque buscar_grupo ya oculta el grupo, si alguien
-- intentara insertarse directamente (conociendo el grupo_id) el trigger lo
-- rechaza. SECURITY DEFINER para poder leer la tabla de baneados sin chocar
-- con su RLS.
create or replace function public.bloquear_baneado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public."tblParticipantesBaneados" b
    where b.grupo_id = new.grupo_id and b.usuario_id = new.usuario_id
  ) then
    raise exception 'Estás baneado de este grupo' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Es una función de trigger: no debe ser invocable como RPC por nadie.
revoke execute on function public.bloquear_baneado() from public, anon, authenticated;

create trigger "trgBloquearBaneado"
  before insert on public."tblParticipantes"
  for each row execute function public.bloquear_baneado();

-- ── RPC: eliminar / banear participante ─────────────────────────────────────
-- p_banear = false → solo elimina (puede volver). true → elimina y banea.
create or replace function public.gestionar_participante(
  p_participante_id uuid,
  p_banear boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id   uuid;
  v_usuario_id uuid;
  v_rol        rol_participante;
begin
  select grupo_id, usuario_id, rol
    into v_grupo_id, v_usuario_id, v_rol
  from public."tblParticipantes"
  where id = p_participante_id;

  if v_grupo_id is null then
    raise exception 'El participante no existe';
  end if;

  -- Solo el admin del grupo puede gestionar miembros.
  if not public.es_admin_grupo(v_grupo_id) then
    raise exception 'Solo el administrador puede gestionar participantes';
  end if;

  -- No te puedes eliminar a ti mismo ni a otro administrador.
  if v_usuario_id = auth.uid() then
    raise exception 'No puedes eliminarte a ti mismo';
  end if;
  if v_rol = 'admin' then
    raise exception 'No puedes eliminar a otro administrador';
  end if;

  if p_banear then
    insert into public."tblParticipantesBaneados" (grupo_id, usuario_id, baneado_por)
    values (v_grupo_id, v_usuario_id, auth.uid())
    on conflict (grupo_id, usuario_id) do nothing;
  end if;

  -- Borra el participante; sus predicciones de este grupo caen por cascade.
  delete from public."tblParticipantes" where id = p_participante_id;
end;
$$;

revoke execute on function public.gestionar_participante(uuid, boolean) from public, anon;
grant  execute on function public.gestionar_participante(uuid, boolean) to authenticated;

-- ── RPC: desbanear ──────────────────────────────────────────────────────────
create or replace function public.desbanear_participante(
  p_grupo_id   uuid,
  p_usuario_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin_grupo(p_grupo_id) then
    raise exception 'Solo el administrador puede desbanear';
  end if;

  delete from public."tblParticipantesBaneados"
  where grupo_id = p_grupo_id and usuario_id = p_usuario_id;
end;
$$;

revoke execute on function public.desbanear_participante(uuid, uuid) from public, anon;
grant  execute on function public.desbanear_participante(uuid, uuid) to authenticated;

-- ── RPC: listar baneados (para el panel de desbaneo del admin) ──────────────
create or replace function public.listar_baneados(p_grupo_id uuid)
returns table (
  usuario_id      uuid,
  nombre_completo text,
  email           text,
  avatar_url      text,
  baneado_en      timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.usuario_id,
    p.nombre_completo,
    p.email,
    p.avatar_url,
    b.baneado_en
  from public."tblParticipantesBaneados" b
  join public."tblProfiles" p on p.id = b.usuario_id
  where b.grupo_id = p_grupo_id
    and public.es_admin_grupo(p_grupo_id)   -- si no es admin, 0 filas
  order by b.baneado_en desc;
$$;

revoke execute on function public.listar_baneados(uuid) from public, anon;
grant  execute on function public.listar_baneados(uuid) to authenticated;

-- ── Redefinir buscar_grupo: ocultar el grupo a usuarios baneados ────────────
-- Si el que busca está baneado de ese grupo, la función no devuelve filas →
-- en la UI el código "no encuentra" el grupo (no le aparece).
create or replace function public.buscar_grupo(p_codigo text)
returns table (
  id uuid,
  nombre text,
  descripcion text,
  total_participantes bigint,
  valor_apuesta numeric,
  ya_es_miembro boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    g.id,
    g.nombre,
    g.descripcion,
    (select count(*) from public."tblParticipantes" pp where pp.grupo_id = g.id),
    coalesce(r.valor_apuesta, 0),
    exists (
      select 1 from public."tblParticipantes" pm
      where pm.grupo_id = g.id and pm.usuario_id = auth.uid()
    )
  from public."tblGrupos" g
  left join public."tblReglasGrupo" r on r.grupo_id = g.id
  where upper(g.codigo_invitacion) = upper(btrim(p_codigo))
    -- El usuario baneado no ve este grupo.
    and not exists (
      select 1 from public."tblParticipantesBaneados" b
      where b.grupo_id = g.id and b.usuario_id = auth.uid()
    )
  limit 1;
$$;

revoke execute on function public.buscar_grupo(text) from public, anon;
grant  execute on function public.buscar_grupo(text) to authenticated;
