-- ============================================================================
-- Mejores terceros: override manual del superadmin + alineación con 0014
-- (REQUIREMENTS §6.4.2)
--
-- Contexto: 0027 introdujo clasificacion_terceros con un cálculo de posiciones
-- propio (puntos -> dg -> gf -> id) que IGNORABA el override manual de grupos
-- (tblClasificacionGrupo, 0014) y el desempate head-to-head de posiciones_grupo.
-- Esta migración:
--   1. Reescribe clasificacion_terceros para reusar equipo_clasificado /
--      posiciones_grupo (respeta override de grupo, h2h y ambigüedad interna) y
--      expone `ambiguo_corte` cuando el 8º y 9º tercero empatan (FIFA lo rompe
--      por tarjetas/ranking/sorteo, que no modelamos -> lo decide el admin).
--   2. Agrega tblTercerosClasificados: el superadmin elige qué 8 grupos aportan
--      los mejores terceros. El bracket solo depende del CONJUNTO de 8 grupos,
--      no de su orden interno.
--   3. mejores_terceros(): conjunto de 8 grupos clasificados (manual si existe,
--      si no automático y solo cuando no es ambiguo).
--   4. equipo_tercero_slot(): usa mejores_terceros.
--   5. terceros_admin(): vista de los 12 terceros para la UI de administración.
-- ============================================================================

-- 1) Override manual: qué grupos aportan los 8 mejores terceros (uno por fila).
create table if not exists public."tblTercerosClasificados" (
  torneo_id    uuid not null references public."tblTorneos"(id) on delete cascade,
  grupo        text not null,
  asignado_por uuid references auth.users(id),
  creado_en    timestamptz not null default now(),
  primary key (torneo_id, grupo)
);

alter table public."tblTercerosClasificados" enable row level security;

drop policy if exists "terceros_clasificados_lectura" on public."tblTercerosClasificados";
create policy "terceros_clasificados_lectura"
  on public."tblTercerosClasificados"
  for select to authenticated using (true);
-- Escritura: solo service_role (vía server action que valida superadmin).

-- 2) clasificacion_terceros: ranking de los 12 terceros entre sí, respetando
--    override de grupo + h2h (vía equipo_clasificado/posiciones_grupo).
--    Devuelve filas SOLO si los 12 grupos tienen su 3° resoluble; si alguno no
--    (grupo incompleto o empate interno sin resolver), retorna vacío y fuerza a
--    resolver primero ese grupo. `ambiguo_corte` = el 8º y 9º terceros empatan
--    en puntos/dg/gf (el corte de clasificación es ambiguo).
drop function if exists public.clasificacion_terceros(uuid);

create function public.clasificacion_terceros(p_torneo_id uuid)
returns table (
  grupo text, equipo_id uuid, pts int, dif int, a_favor int,
  posicion int, ambiguo_corte boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_grupos text[];
  v_grupo text;
begin
  select array_agg(distinct p.grupo order by p.grupo) into v_grupos
  from public."tblPartidos" p
  where p.torneo_id = p_torneo_id and p.fase = 'fase_grupos' and p.grupo is not null;

  if v_grupos is null then
    return;
  end if;

  -- Todos los grupos deben tener su 3° determinado (completo + sin empate
  -- interno sin resolver, o con override manual). Si no, no se puede rankear.
  foreach v_grupo in array v_grupos loop
    if public.equipo_clasificado(p_torneo_id, v_grupo, 3) is null then
      return;
    end if;
  end loop;

  return query
  with terceros as (
    select g as grupo, public.equipo_clasificado(p_torneo_id, g, 3) as equipo_id
    from unnest(v_grupos) as g
  ),
  con_stats as (
    select t.grupo, t.equipo_id, pg.pts, pg.dg as dif, pg.gf as a_favor
    from terceros t
    join lateral public.posiciones_grupo(p_torneo_id, t.grupo) pg
      on pg.equipo_id = t.equipo_id
  ),
  ranked as (
    select cs.grupo, cs.equipo_id, cs.pts, cs.dif, cs.a_favor,
      row_number() over (order by cs.pts desc, cs.dif desc, cs.a_favor desc, cs.equipo_id)::int as posicion,
      rank() over (order by cs.pts desc, cs.dif desc, cs.a_favor desc)::int as rnk
    from con_stats cs
  ),
  amb as (
    select (
      (select rnk from ranked where ranked.posicion = 8)
      = (select rnk from ranked where ranked.posicion = 9)
    ) as ambiguo
  )
  select r.grupo, r.equipo_id, r.pts, r.dif, r.a_favor, r.posicion,
         coalesce(a.ambiguo, false) as ambiguo_corte
  from ranked r cross join amb a
  order by r.posicion;
end;
$function$;

-- 3) mejores_terceros: el CONJUNTO de 8 grupos cuyos terceros clasifican.
--    Prioridad: override manual completo (8 grupos) -> automático no ambiguo.
--    Si la selección manual es parcial (1..7), o el automático no es resoluble
--    o es ambiguo, retorna vacío (bracket queda "por definir").
create or replace function public.mejores_terceros(p_torneo_id uuid)
returns table (grupo text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_manual int;
  v_count int;
  v_amb boolean;
begin
  select count(*) into v_manual
  from public."tblTercerosClasificados" where torneo_id = p_torneo_id;

  if v_manual = 8 then
    return query
    select tc.grupo from public."tblTercerosClasificados" tc
    where tc.torneo_id = p_torneo_id;
    return;
  end if;

  if v_manual between 1 and 7 then
    return; -- selección manual incompleta: no resolver hasta tener 8
  end if;

  select count(*)::int, coalesce(bool_or(ct.ambiguo_corte), false)
    into v_count, v_amb
  from public.clasificacion_terceros(p_torneo_id) ct;

  if v_count < 12 or v_amb then
    return; -- no determinable o corte ambiguo: requiere selección manual
  end if;

  return query
  select ct.grupo from public.clasificacion_terceros(p_torneo_id) ct
  where ct.posicion <= 8;
end;
$function$;

-- 4) equipo_tercero_slot: equipo del slot de tercero del partido p_numero,
--    usando el conjunto de mejores terceros (manual o automático).
create or replace function public.equipo_tercero_slot(
  p_torneo_id uuid,
  p_numero int
)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_combinacion text;
  v_grupo text;
begin
  select string_agg(grupo, '' order by grupo)
    into v_combinacion
  from public.mejores_terceros(p_torneo_id);

  if v_combinacion is null or length(v_combinacion) <> 8 then
    return null;
  end if;

  select case p_numero
           when 74 then slot_74
           when 77 then slot_77
           when 79 then slot_79
           when 80 then slot_80
           when 81 then slot_81
           when 82 then slot_82
           when 85 then slot_85
           when 87 then slot_87
           else null
         end
    into v_grupo
  from public."tblTercerLugarAsignacion"
  where combinacion_grupos = v_combinacion;

  if v_grupo is null then
    return null;
  end if;

  return public.equipo_clasificado(p_torneo_id, v_grupo, 3);
end;
$function$;

-- 5) terceros_admin: una fila por grupo con el 3° (si está determinado), sus
--    stats, su posición/clasificación automática, si está elegido manualmente y
--    si el corte es ambiguo. Para la UI del superadmin. No expone PII -> queda
--    ejecutable por autenticados (igual que posiciones_admin).
create or replace function public.terceros_admin(p_torneo_id uuid)
returns table (
  grupo text, equipo_id uuid, nombre text, codigo_iso text,
  pts int, dif int, a_favor int, determinado boolean,
  posicion_auto int, clasifica_auto boolean,
  manual_clasifica boolean, hay_manual boolean, ambiguo_corte boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with grupos as (
    select distinct grupo from public."tblPartidos"
    where torneo_id = p_torneo_id and fase = 'fase_grupos' and grupo is not null
  ),
  terceros as (
    select g.grupo, public.equipo_clasificado(p_torneo_id, g.grupo, 3) as equipo_id
    from grupos g
  ),
  rankc as (
    select * from public.clasificacion_terceros(p_torneo_id)
  ),
  manual as (
    select grupo from public."tblTercerosClasificados" where torneo_id = p_torneo_id
  )
  select
    t.grupo,
    t.equipo_id,
    e.nombre,
    e.codigo_iso,
    pg.pts, pg.dg as dif, pg.gf as a_favor,
    (t.equipo_id is not null) as determinado,
    r.posicion as posicion_auto,
    coalesce(r.posicion <= 8, false) as clasifica_auto,
    (m.grupo is not null) as manual_clasifica,
    (exists (select 1 from manual)) as hay_manual,
    coalesce((select bool_or(ambiguo_corte) from rankc), false) as ambiguo_corte
  from terceros t
  left join public."tblEquipos" e on e.id = t.equipo_id
  left join lateral public.posiciones_grupo(p_torneo_id, t.grupo) pg
    on pg.equipo_id = t.equipo_id
  left join rankc r on r.grupo = t.grupo
  left join manual m on m.grupo = t.grupo
  order by coalesce(r.posicion, 99), t.grupo;
$function$;

-- Internas (las llaman funciones definer / service_role): no ejecutables por
-- clientes. terceros_admin SÍ queda ejecutable (como posiciones_admin).
revoke all on function public.clasificacion_terceros(uuid) from anon, authenticated;
revoke all on function public.mejores_terceros(uuid) from anon, authenticated;
revoke all on function public.equipo_tercero_slot(uuid, int) from anon, authenticated;
