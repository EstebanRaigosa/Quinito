-- ════════════════════════════════════════════════════════════════════════
-- Superadmin de plataforma (RLS) + visibilidad de email solo para admins.
--
-- 1) El superadmin (hoy solo identificado por email en la env `SUPERADMIN_EMAILS`)
--    necesita existir también en la base para que el RLS lo reconozca y pueda
--    ver/administrar CUALQUIER polla sin ser miembro. Se materializa en
--    `tblSuperadmins` (mantener en sync con la env del app).
-- 2) `es_miembro_grupo`/`es_admin_grupo` pasan a ser superadmin-aware: con eso
--    casi todo el RLS (participantes, partidos del grupo, reglas) hereda el
--    acceso del superadmin sin tocar cada política una por una.
-- 3) El email de los integrantes deja de viajar a todos los miembros: el RPC
--    `grupo_detalle` solo lo incluye para el admin del grupo (o superadmin).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1 · Registro de superadmins ───────────────────────────────────────────
create table if not exists public."tblSuperadmins" (
  email text primary key,
  creado_en timestamptz not null default now()
);
-- RLS sin políticas: nadie con rol authenticated/anon la lee directamente; solo
-- las funciones `security definer` la consultan. La gestiona `service_role`.
alter table public."tblSuperadmins" enable row level security;

insert into public."tblSuperadmins" (email)
values ('raigo.16@gmail.com')
on conflict (email) do nothing;

-- ¿El usuario autenticado es superadmin de plataforma?
create or replace function public.es_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public."tblSuperadmins" s
    join auth.users u on lower(u.email) = lower(s.email)
    where u.id = auth.uid()
  );
$$;
revoke execute on function public.es_superadmin() from public, anon;
grant execute on function public.es_superadmin() to authenticated;

-- ── 2 · Helpers superadmin-aware ─────────────────────────────────────────
create or replace function public.es_miembro_grupo(p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.es_superadmin() or exists (
    select 1 from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid()
  );
$$;

create or replace function public.es_admin_grupo(p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.es_superadmin() or exists (
    select 1 from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid() and rol = 'admin'
  );
$$;

-- ── 3 · Perfiles: el superadmin puede leer cualquier perfil (incl. email) ──
-- (el propio + compañeros de grupo + superadmin de plataforma)
drop policy if exists "profiles_select" on public."tblProfiles";
create policy "profiles_select" on public."tblProfiles"
for select to authenticated
using (
  id = auth.uid()
  or public.es_superadmin()
  or exists (
    select 1
    from public."tblParticipantes" p1
    join public."tblParticipantes" p2 on p1.grupo_id = p2.grupo_id
    where p1.usuario_id = auth.uid() and p2.usuario_id = "tblProfiles".id
  )
);

-- ── 4 · RPC grupo_detalle v2 ──────────────────────────────────────────────
-- Cambios vs 0017:
--   · La puerta de acceso ahora es "miembro O superadmin" (antes solo miembro).
--   · `esAdmin` es true para el admin del grupo O el superadmin.
--   · El `email` de cada integrante solo se incluye si quien consulta es admin
--     (o superadmin); para el resto viaja como null (privacidad).
create or replace function public.grupo_detalle(p_grupo_id uuid)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  with mi as (
    select id, rol
    from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid()
    limit 1
  ),
  acc as (
    select
      (select id from mi)                                  as mi_id,
      coalesce((select rol = 'admin' from mi), false)
        or public.es_superadmin()                          as es_admin,
      exists (select 1 from mi) or public.es_superadmin()  as puede_ver
  )
  select case
    when not (select puede_ver from acc) then null::jsonb
    else jsonb_build_object(
      'miParticipanteId', (select mi_id from acc),
      'esAdmin', (select es_admin from acc),
      'grupo', (
        select jsonb_build_object(
          'id', g.id, 'nombre', g.nombre, 'descripcion', g.descripcion,
          'codigo_invitacion', g.codigo_invitacion, 'creador_id', g.creador_id)
        from public."tblGrupos" g where g.id = p_grupo_id),
      'reglas', (
        select to_jsonb(r) from public."tblReglasGrupo" r where r.grupo_id = p_grupo_id),
      'participantes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id, 'rol', p.rol, 'pago_realizado', p.pago_realizado,
          'usuario', jsonb_build_object(
            'id', prof.id, 'nombre_completo', prof.nombre_completo,
            -- Email solo para admin/superadmin; el resto recibe null.
            'email', case when (select es_admin from acc) then prof.email else null end,
            'avatar_url', prof.avatar_url)))
        from public."tblParticipantes" p
        join public."tblProfiles" prof on prof.id = p.usuario_id
        where p.grupo_id = p_grupo_id), '[]'::jsonb),
      'tabla', coalesce((
        select jsonb_agg(jsonb_build_object(
          'participante_id', v.participante_id, 'posicion', v.posicion,
          'nombre_completo', v.nombre_completo, 'avatar_url', v.avatar_url,
          'puntos_totales', v.puntos_totales, 'aciertos', v.aciertos,
          'marcadores_exactos', v.marcadores_exactos) order by v.posicion asc)
        from public."vwTablaPosiciones" v where v.grupo_id = p_grupo_id), '[]'::jsonb),
      'partidos', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pa.id, 'torneo_id', pa.torneo_id, 'numero_partido', pa.numero_partido,
          'fase', pa.fase, 'grupo', pa.grupo,
          'placeholder_local', pa.placeholder_local,
          'placeholder_visitante', pa.placeholder_visitante,
          'fecha_hora', pa.fecha_hora, 'estadio', pa.estadio, 'ciudad', pa.ciudad,
          'goles_local', pa.goles_local, 'goles_visitante', pa.goles_visitante,
          'estado', pa.estado,
          'equipo_local', case when el.id is null then null else jsonb_build_object(
            'id', el.id, 'nombre', el.nombre, 'codigo_iso', el.codigo_iso,
            'bandera_url', el.bandera_url, 'grupo', el.grupo) end,
          'equipo_visitante', case when ev.id is null then null else jsonb_build_object(
            'id', ev.id, 'nombre', ev.nombre, 'codigo_iso', ev.codigo_iso,
            'bandera_url', ev.bandera_url, 'grupo', ev.grupo) end
        ) order by pa.fecha_hora asc)
        from public."tblGrupoPartidos" gp
        join public."tblPartidos" pa on pa.id = gp.partido_id
        left join public."tblEquipos" el on el.id = pa.equipo_local_id
        left join public."tblEquipos" ev on ev.id = pa.equipo_visitante_id
        where gp.grupo_id = p_grupo_id), '[]'::jsonb),
      'misPredicciones', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pr.id, 'participante_id', pr.participante_id, 'partido_id', pr.partido_id,
          'goles_local', pr.goles_local, 'goles_visitante', pr.goles_visitante,
          'puntos_obtenidos', pr.puntos_obtenidos, 'prediccion_unica', pr.prediccion_unica))
        from public."tblPredicciones" pr
        where pr.participante_id = (select mi_id from acc)), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;

-- ── 5 · RPC superadmin_listar_pollas: todas las pollas de la plataforma ────
-- `security definer` para leer todos los grupos/perfiles sin RLS, pero con
-- puerta dura: devuelve null si quien llama no es superadmin.
create or replace function public.superadmin_listar_pollas()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select case
    when not public.es_superadmin() then null::jsonb
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'nombre', g.nombre,
        'codigo_invitacion', g.codigo_invitacion,
        'creador_nombre', cprof.nombre_completo,
        'creador_email', cprof.email,
        'total_participantes', (
          select count(*) from public."tblParticipantes" p where p.grupo_id = g.id),
        'valor_apuesta', coalesce(r.valor_apuesta, 0),
        'torneo_nombre', t.nombre,
        'creado_en', g.creado_en
      ) order by g.creado_en desc)
      from public."tblGrupos" g
      left join public."tblProfiles" cprof on cprof.id = g.creador_id
      left join public."tblReglasGrupo" r on r.grupo_id = g.id
      left join public."tblTorneos" t on t.id = g.torneo_id
    ), '[]'::jsonb)
  end;
$$;

revoke execute on function public.superadmin_listar_pollas() from public, anon;
grant execute on function public.superadmin_listar_pollas() to authenticated;
