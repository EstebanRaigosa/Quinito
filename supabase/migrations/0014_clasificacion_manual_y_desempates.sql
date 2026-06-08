-- ============================================================================
-- Clasificación de grupos: desempates automáticos + override manual del admin
-- ============================================================================

-- Selección manual de los clasificados de un grupo (1°, 2°, ...). Tiene
-- prioridad sobre el cálculo automático. La usa el admin cuando el desempate
-- no se puede resolver automáticamente (empate total) o para corregir.
create table public."tblClasificacionGrupo" (
  torneo_id   uuid not null references public."tblTorneos"(id) on delete cascade,
  grupo       text not null,
  posicion    int  not null check (posicion >= 1),
  equipo_id   uuid not null references public."tblEquipos"(id),
  asignado_por uuid references auth.users(id),
  creado_en   timestamptz not null default now(),
  primary key (torneo_id, grupo, posicion),
  unique (torneo_id, grupo, equipo_id)
);

alter table public."tblClasificacionGrupo" enable row level security;

-- Lectura para autenticados: no es PII, solo define qué equipo va 1°/2°.
create policy "clasificacion_grupo_lectura"
  on public."tblClasificacionGrupo"
  for select to authenticated using (true);
-- Escritura: solo service_role (vía server action que valida super-admin).

-- ----------------------------------------------------------------------------
-- Posiciones de un grupo con desempates FIFA aproximados:
--   1) puntos  2) diferencia de gol  3) goles a favor
--   4) head-to-head: puntos / dg / gf SOLO entre los equipos empatados
-- Si tras todo eso siguen idénticos, se marca `ambiguo = true` (empate sin
-- resolver) y el orden entre ellos es por id (determinista pero arbitrario).
-- Incluye a TODOS los equipos del grupo (aunque no hayan jugado: stats en 0).
-- ----------------------------------------------------------------------------
create or replace function public.posiciones_grupo(p_torneo_id uuid, p_grupo text)
returns table (
  equipo_id uuid, pj int, pg int, pe int, pp int,
  gf int, gc int, dg int, pts int, posicion int, ambiguo boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with roster as (
    select equipo_local_id as equipo_id
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase = 'fase_grupos'
      and grupo = p_grupo and equipo_local_id is not null
    union
    select equipo_visitante_id
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase = 'fase_grupos'
      and grupo = p_grupo and equipo_visitante_id is not null
  ),
  finalizados as (
    select equipo_local_id as eq, equipo_visitante_id as rival,
           goles_local as gf, goles_visitante as gc
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase = 'fase_grupos'
      and grupo = p_grupo and estado = 'finalizado'
    union all
    select equipo_visitante_id, equipo_local_id,
           goles_visitante, goles_local
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase = 'fase_grupos'
      and grupo = p_grupo and estado = 'finalizado'
  ),
  base as (
    select r.equipo_id,
      count(f.eq)::int as pj,
      count(*) filter (where f.gf > f.gc)::int as pg,
      count(*) filter (where f.gf = f.gc)::int as pe,
      count(*) filter (where f.gf < f.gc)::int as pp,
      coalesce(sum(f.gf), 0)::int as gf,
      coalesce(sum(f.gc), 0)::int as gc,
      coalesce(sum(f.gf - f.gc), 0)::int as dg,
      coalesce(sum(case when f.gf > f.gc then 3 when f.gf = f.gc then 1 else 0 end), 0)::int as pts
    from roster r
    left join finalizados f on f.eq = r.equipo_id
    group by r.equipo_id
  ),
  clusters as (
    -- equipos empatados por los criterios globales (mismo cl = mismo empate)
    select b.*, dense_rank() over (order by pts desc, dg desc, gf desc) as cl
    from base b
  ),
  h2h as (
    -- mini-tabla solo entre los equipos del mismo cluster
    select c.equipo_id,
      coalesce(sum(case when f.gf > f.gc then 3 when f.gf = f.gc then 1 else 0 end), 0)::int as h_pts,
      coalesce(sum(f.gf - f.gc), 0)::int as h_dg,
      coalesce(sum(f.gf), 0)::int as h_gf
    from clusters c
    left join finalizados f
      on f.eq = c.equipo_id
     and exists (
       select 1 from clusters c2
       where c2.cl = c.cl and c2.equipo_id = f.rival and c2.equipo_id <> c.equipo_id
     )
    group by c.equipo_id
  ),
  ranked as (
    select b.equipo_id, b.pj, b.pg, b.pe, b.pp, b.gf, b.gc, b.dg, b.pts,
      row_number() over (
        order by b.pts desc, b.dg desc, b.gf desc,
                 h.h_pts desc, h.h_dg desc, h.h_gf desc, b.equipo_id
      )::int as posicion,
      (count(*) over (partition by b.pts, b.dg, b.gf, h.h_pts, h.h_dg, h.h_gf) > 1) as ambiguo
    from base b
    join h2h h on h.equipo_id = b.equipo_id
  )
  select equipo_id, pj, pg, pe, pp, gf, gc, dg, pts, posicion, ambiguo
  from ranked
  order by posicion;
$function$;

-- ----------------------------------------------------------------------------
-- Equipo clasificado a la posición p_pos de un grupo:
--   1) si hay selección MANUAL, gana siempre.
--   2) si no, cálculo automático SOLO si el grupo está completo Y la posición
--      no es ambigua (empate sin resolver -> null, fuerza selección manual).
-- ----------------------------------------------------------------------------
create or replace function public.equipo_clasificado(
  p_torneo_id uuid,
  p_grupo text,
  p_pos int
)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_equipo uuid;
  v_amb boolean;
  v_total int;
  v_finalizados int;
begin
  -- 1) Override manual del admin.
  select equipo_id into v_equipo
  from public."tblClasificacionGrupo"
  where torneo_id = p_torneo_id and grupo = p_grupo and posicion = p_pos;
  if v_equipo is not null then
    return v_equipo;
  end if;

  -- 2) Automático: solo si el grupo está completo.
  select count(*), count(*) filter (where estado = 'finalizado')
    into v_total, v_finalizados
  from public."tblPartidos"
  where torneo_id = p_torneo_id and fase = 'fase_grupos' and grupo = p_grupo;

  if v_total = 0 or v_finalizados < v_total then
    return null;
  end if;

  select equipo_id, ambiguo into v_equipo, v_amb
  from public.posiciones_grupo(p_torneo_id, p_grupo)
  where posicion = p_pos;

  -- Empate sin resolver: requiere que el admin elija manualmente.
  if coalesce(v_amb, false) then
    return null;
  end if;

  return v_equipo;
end;
$function$;

-- ----------------------------------------------------------------------------
-- Tabla de posiciones de TODOS los grupos del torneo, con info de equipo y
-- la posición manual (si existe). Para la UI de administración.
-- ----------------------------------------------------------------------------
create or replace function public.posiciones_admin(p_torneo_id uuid)
returns table (
  grupo text, equipo_id uuid, nombre text, codigo_iso text,
  pj int, pg int, pe int, pp int, gf int, gc int, dg int, pts int,
  posicion int, ambiguo boolean, manual_posicion int
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with grupos as (
    select distinct grupo
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase = 'fase_grupos' and grupo is not null
  )
  select g.grupo, p.equipo_id, e.nombre, e.codigo_iso,
    p.pj, p.pg, p.pe, p.pp, p.gf, p.gc, p.dg, p.pts,
    p.posicion, p.ambiguo, m.posicion as manual_posicion
  from grupos g
  cross join lateral public.posiciones_grupo(p_torneo_id, g.grupo) p
  join public."tblEquipos" e on e.id = p.equipo_id
  left join public."tblClasificacionGrupo" m
    on m.torneo_id = p_torneo_id and m.grupo = g.grupo and m.equipo_id = p.equipo_id
  order by g.grupo, coalesce(m.posicion, p.posicion);
$function$;

revoke all on function public.equipo_clasificado(uuid, text, int) from anon, authenticated;
