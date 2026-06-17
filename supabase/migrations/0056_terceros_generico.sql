-- ============================================================================
-- Motor de "mejores terceros" GENÉRICO (multi-formato)
--
-- Hasta 0029 la lógica de mejores terceros estaba acoplada al Mundial 2026:
--   - tblTercerLugarAsignacion: formato ANCHO con 8 columnas slot_74..slot_87 y
--     combinacion_grupos de exactamente 8 letras (^[A-L]{8}$) -> C(12,8).
--   - clasificacion_terceros / mejores_terceros / equipo_tercero_slot con los
--     números 12 (grupos) y 8 (terceros) y los slots 74,77,79,80,81,82,85,87
--     hardcodeados.
--
-- Esta migración hace el motor independiente del formato del torneo, derivando
-- por torneo:
--   - nº de grupos  = grupos distintos en fase_grupos.
--   - nº de terceros que clasifican = slots de tercero definidos para el torneo.
-- Así un torneo de 3 grupos con 2 mejores terceros (Copa América 2019) o de 12
-- grupos con 8 (Mundial 2026) usan exactamente el mismo código.
--
-- Compatibilidad: el Mundial 2026 conserva su comportamiento EXACTO. La vieja
-- tabla ancha tblTercerLugarAsignacion se migra (sin borrarse) al nuevo formato
-- LARGO tblAsignacionTercerosSlot, una fila por (torneo, combinación, partido).
-- ============================================================================

-- 1) Tabla de asignación en formato LARGO, por torneo.
--    combinacion_grupos = letras de los grupos cuyos terceros clasifican,
--    ordenadas alfabéticamente (ej. 'ABCDEFGH' en el Mundial, 'AB' en la Copa).
--    numero_partido = partido eliminatorio que recibe un tercero.
--    grupo = grupo cuyo tercero ocupa ese slot en esa combinación.
create table if not exists public."tblAsignacionTercerosSlot" (
  torneo_id         uuid not null references public."tblTorneos"(id) on delete cascade,
  combinacion_grupos text not null check (combinacion_grupos ~ '^[A-L]+$'),
  numero_partido    int  not null,
  grupo             text not null check (grupo ~ '^[A-L]$'),
  primary key (torneo_id, combinacion_grupos, numero_partido)
);

-- RLS: catálogo de configuración -> lectura para autenticados, escritura solo
-- service_role (mismo patrón que tblTercerLugarAsignacion en 0027).
alter table public."tblAsignacionTercerosSlot" enable row level security;

drop policy if exists "asignacion_terceros_slot_select" on public."tblAsignacionTercerosSlot";
create policy "asignacion_terceros_slot_select"
  on public."tblAsignacionTercerosSlot"
  for select to authenticated using (true);

-- 2) Migrar el Mundial 2026 del formato ANCHO al LARGO (backfill idempotente).
--    495 combinaciones x 8 slots = 3960 filas.
insert into public."tblAsignacionTercerosSlot"
  (torneo_id, combinacion_grupos, numero_partido, grupo)
select t.id, a.combinacion_grupos, s.numero, s.grupo
from public."tblTercerLugarAsignacion" a
cross join public."tblTorneos" t
cross join lateral (values
  (74, a.slot_74), (77, a.slot_77), (79, a.slot_79), (80, a.slot_80),
  (81, a.slot_81), (82, a.slot_82), (85, a.slot_85), (87, a.slot_87)
) as s(numero, grupo)
where t.codigo = 'mundial-2026'
on conflict do nothing;

-- 3) clasificacion_terceros: ranking de los terceros de cada grupo entre sí.
--    Igual que 0029 (misma firma y columnas de salida), pero el corte de
--    "ambigüedad" se calcula por torneo (entre el último que clasifica y el
--    primero que queda fuera), no fijo en 8/9. Se usa CREATE OR REPLACE (sin
--    DROP) porque terceros_admin (0029) ya la referencia.
create or replace function public.clasificacion_terceros(p_torneo_id uuid)
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
  v_corte int;  -- nº de terceros que clasifican en este torneo (0 si no aplica)
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

  -- Corte = nº de slots de tercero definidos para el torneo.
  select count(distinct ats.numero_partido) into v_corte
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;

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
    select coalesce((
      v_corte > 0 and
      (select rnk from ranked where ranked.posicion = v_corte)
      = (select rnk from ranked where ranked.posicion = v_corte + 1)
    ), false) as ambiguo
  )
  select r.grupo, r.equipo_id, r.pts, r.dif, r.a_favor, r.posicion,
         a.ambiguo as ambiguo_corte
  from ranked r cross join amb a
  order by r.posicion;
end;
$function$;

-- 4) mejores_terceros: el CONJUNTO de grupos cuyos terceros clasifican.
--    Prioridad: override manual completo -> automático no ambiguo. El nº de
--    terceros y de grupos se deriva por torneo (antes 8 y 12 fijos).
create or replace function public.mejores_terceros(p_torneo_id uuid)
returns table (grupo text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_terceros int;  -- nº de terceros que clasifican
  v_grupos int;    -- nº de grupos del torneo
  v_manual int;
  v_count int;
  v_amb boolean;
begin
  select count(distinct ats.numero_partido) into v_terceros
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;

  -- El torneo no usa mejores terceros (no hay slots configurados).
  if v_terceros = 0 then
    return;
  end if;

  select count(distinct p.grupo) into v_grupos
  from public."tblPartidos" p
  where p.torneo_id = p_torneo_id and p.fase = 'fase_grupos' and p.grupo is not null;

  select count(*) into v_manual
  from public."tblTercerosClasificados" where torneo_id = p_torneo_id;

  if v_manual = v_terceros then
    return query
    select tc.grupo from public."tblTercerosClasificados" tc
    where tc.torneo_id = p_torneo_id;
    return;
  end if;

  if v_manual between 1 and v_terceros - 1 then
    return; -- selección manual incompleta: no resolver hasta completarla
  end if;

  select count(*)::int, coalesce(bool_or(ct.ambiguo_corte), false)
    into v_count, v_amb
  from public.clasificacion_terceros(p_torneo_id) ct;

  if v_count < v_grupos or v_amb then
    return; -- no determinable o corte ambiguo: requiere selección manual
  end if;

  return query
  select ct.grupo from public.clasificacion_terceros(p_torneo_id) ct
  where ct.posicion <= v_terceros;
end;
$function$;

-- 5) equipo_tercero_slot: equipo del slot de tercero del partido p_numero,
--    usando el conjunto de mejores terceros (manual o automático) y la tabla
--    de asignación LARGA por torneo (antes: CASE de 8 slots + tabla ancha).
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
  v_terceros int;
  v_grupo text;
begin
  select count(distinct ats.numero_partido) into v_terceros
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;

  select string_agg(grupo, '' order by grupo)
    into v_combinacion
  from public.mejores_terceros(p_torneo_id);

  -- Sin combinación completa (fase incompleta / corte ambiguo): aún no se sabe.
  if v_combinacion is null or v_terceros = 0
     or length(v_combinacion) <> v_terceros then
    return null;
  end if;

  select ats.grupo
    into v_grupo
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id
    and ats.combinacion_grupos = v_combinacion
    and ats.numero_partido = p_numero;

  if v_grupo is null then
    return null;
  end if;

  return public.equipo_clasificado(p_torneo_id, v_grupo, 3);
end;
$function$;

-- 6) resolver_cruces: igual que 0027 pero el patrón de placeholder de tercero
--    se generaliza a "3" + 2 o más letras de grupo (^3[A-L]{2,}$), que cubre
--    tanto el Mundial ('3ABCDF', 5 letras) como la Copa ('3BC','3AB'). El
--    patrón de posición exacta '3A' (2 chars) sigue resolviéndose por v_pos_gan,
--    que se evalúa primero.
create or replace function public.resolver_cruces(p_torneo_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_pos_gan text := '^([1-3][A-L]|G[0-9]+|P[0-9]+)$';  -- posición/ganador/perdedor
  v_tercero text := '^3[A-L]{2,}$';                       -- mejores terceros
begin
  for r in
    select id, numero_partido, placeholder_local, placeholder_visitante
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase <> 'fase_grupos'
    order by numero_partido
  loop
    -- Lado local
    if r.placeholder_local ~ v_pos_gan then
      update public."tblPartidos"
         set equipo_local_id = public.resolver_placeholder(p_torneo_id, r.placeholder_local)
       where id = r.id;
    elsif r.placeholder_local ~ v_tercero then
      update public."tblPartidos"
         set equipo_local_id = public.equipo_tercero_slot(p_torneo_id, r.numero_partido)
       where id = r.id;
    end if;

    -- Lado visitante
    if r.placeholder_visitante ~ v_pos_gan then
      update public."tblPartidos"
         set equipo_visitante_id = public.resolver_placeholder(p_torneo_id, r.placeholder_visitante)
       where id = r.id;
    elsif r.placeholder_visitante ~ v_tercero then
      update public."tblPartidos"
         set equipo_visitante_id = public.equipo_tercero_slot(p_torneo_id, r.numero_partido)
       where id = r.id;
    end if;
  end loop;
end;
$function$;

-- Internas (las llaman funciones definer / service_role): no ejecutables por
-- clientes (igual que 0029).
revoke all on function public.clasificacion_terceros(uuid) from anon, authenticated;
revoke all on function public.mejores_terceros(uuid) from anon, authenticated;
revoke all on function public.equipo_tercero_slot(uuid, int) from anon, authenticated;
revoke all on function public.resolver_cruces(uuid) from anon, authenticated;
