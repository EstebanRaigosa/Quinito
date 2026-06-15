-- ============================================================================
-- Mejores terceros del Mundial 2026 (REQUIREMENTS §6.4.2 / §6.4.3)
-- Completa lo que 0012 dejó pendiente: resolver los placeholders de tercero
-- (3ABCDF, 3CDFGH, ...) de los 8 partidos de dieciseisavos que enfrentan a un
-- primer lugar contra uno de los 8 mejores terceros.
--
-- Piezas:
--   1. tblTercerLugarAsignacion : tabla de configuración FIFA (Annex C), una
--      fila por cada C(12,8)=495 combinaciones de grupos clasificados. Se
--      siembra en 0028.
--   2. clasificacion_terceros() : ranking de los 12 terceros entre sí.
--   3. equipo_tercero_slot()     : equipo que ocupa el slot de tercero de un
--      partido concreto (74,77,79,80,81,82,85,87), o null si aún no se sabe.
--   4. resolver_cruces()         : ahora también resuelve los lados de tercero.
--
-- Limitación de desempate (igual que equipo_clasificado en 0012): el orden de
-- los terceros usa puntos -> diferencia de gol -> goles a favor -> id de equipo
-- (determinista). REQUIREMENTS §6.4.2 lista además tarjetas rojas/amarillas,
-- ranking FIFA y sorteo, pero tblPartidos no registra tarjetas ni guardamos el
-- ranking FIFA; el id de equipo actúa como criterio final determinista para
-- garantizar siempre 8 terceros únicos (sin empates) y una combinación válida.
-- ============================================================================

-- 1) Tabla de configuración FIFA. combinacion_grupos = las 8 letras de grupo
--    clasificadas ordenadas alfabéticamente (ej. 'ABCDEFGH'); cada slot_<n>
--    guarda la LETRA del grupo cuyo tercero ocupa el visitante del partido n.
create table if not exists public."tblTercerLugarAsignacion" (
  combinacion_grupos text primary key
    check (combinacion_grupos ~ '^[A-L]{8}$'),
  slot_74 text not null check (slot_74 ~ '^[A-L]$'),
  slot_77 text not null check (slot_77 ~ '^[A-L]$'),
  slot_79 text not null check (slot_79 ~ '^[A-L]$'),
  slot_80 text not null check (slot_80 ~ '^[A-L]$'),
  slot_81 text not null check (slot_81 ~ '^[A-L]$'),
  slot_82 text not null check (slot_82 ~ '^[A-L]$'),
  slot_85 text not null check (slot_85 ~ '^[A-L]$'),
  slot_87 text not null check (slot_87 ~ '^[A-L]$')
);

-- RLS: catálogo de configuración -> lectura para autenticados, escritura solo
-- service_role (mismo patrón que tblEquipos/tblPartidos en 0005).
alter table public."tblTercerLugarAsignacion" enable row level security;

drop policy if exists "tercer_lugar_select" on public."tblTercerLugarAsignacion";
create policy "tercer_lugar_select"
  on public."tblTercerLugarAsignacion"
  for select to authenticated using (true);

-- 2) Clasificación de los 12 terceros lugares entre sí. Devuelve filas SOLO si
--    TODOS los partidos de fase de grupos del torneo están finalizados; si
--    falta alguno, retorna vacío (no se pueden determinar los mejores terceros).
--    `posicion` 1..12 es el ranking global de terceros (1 = mejor).
create or replace function public.clasificacion_terceros(p_torneo_id uuid)
returns table (grupo text, equipo_id uuid, posicion int)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_total int;
  v_finalizados int;
begin
  select count(*),
         count(*) filter (where estado = 'finalizado')
    into v_total, v_finalizados
  from public."tblPartidos"
  where torneo_id = p_torneo_id and fase = 'fase_grupos';

  -- Sin partidos de grupos o fase incompleta: no hay terceros que ordenar.
  if v_total = 0 or v_finalizados < v_total then
    return;
  end if;

  return query
  with marcadores as (
    select grupo,
           equipo_local_id as equipo_id,
           goles_local as gf, goles_visitante as gc
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase = 'fase_grupos'
      and estado = 'finalizado'
    union all
    select grupo,
           equipo_visitante_id,
           goles_visitante, goles_local
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase = 'fase_grupos'
      and estado = 'finalizado'
  ),
  -- Tabla por grupo con su ranking interno (1=primero ... 4=cuarto).
  tabla_grupo as (
    select m.grupo,
           m.equipo_id,
           sum(case when m.gf > m.gc then 3 when m.gf = m.gc then 1 else 0 end) as pts,
           sum(m.gf - m.gc) as dif,
           sum(m.gf) as a_favor,
           row_number() over (
             partition by m.grupo
             order by sum(case when m.gf > m.gc then 3 when m.gf = m.gc then 1 else 0 end) desc,
                      sum(m.gf - m.gc) desc,
                      sum(m.gf) desc,
                      m.equipo_id
           ) as pos_grupo
    from marcadores m
    where m.equipo_id is not null
    group by m.grupo, m.equipo_id
  ),
  -- Solo los terceros de cada grupo, rankeados entre sí.
  terceros as (
    select tg.grupo, tg.equipo_id, tg.pts, tg.dif, tg.a_favor
    from tabla_grupo tg
    where tg.pos_grupo = 3
  )
  select t.grupo,
         t.equipo_id,
         row_number() over (
           order by t.pts desc, t.dif desc, t.a_favor desc, t.equipo_id
         )::int as posicion
  from terceros t;
end;
$function$;

-- 3) Equipo que ocupa el slot de tercero del partido p_numero (debe ser uno de
--    74,77,79,80,81,82,85,87). Calcula los 8 mejores terceros, arma la
--    combinación, la busca en tblTercerLugarAsignacion y devuelve el equipo del
--    grupo asignado a ese slot. Retorna null si la fase de grupos no terminó o
--    la combinación no existe (no debería: las 495 están sembradas).
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
  -- Las 8 letras de grupo de los mejores terceros, ordenadas alfabéticamente.
  select string_agg(grupo, '' order by grupo)
    into v_combinacion
  from (
    select grupo
    from public.clasificacion_terceros(p_torneo_id)
    where posicion <= 8
  ) mejores;

  -- Fase de grupos incompleta (clasificacion_terceros vacía) -> aún no se sabe.
  if v_combinacion is null or length(v_combinacion) <> 8 then
    return null;
  end if;

  -- Grupo asignado a este slot según la tabla FIFA.
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

  -- El equipo es el tercero de ese grupo.
  return public.equipo_clasificado(p_torneo_id, v_grupo, 3);
end;
$function$;

-- 4) resolver_cruces ahora también resuelve los lados con placeholder de
--    tercero (3 + 5 letras, ej. '3ABCDF'). El resto (posición de grupo y
--    ganador/perdedor de partido) se mantiene igual que en 0012.
create or replace function public.resolver_cruces(p_torneo_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_pos_gan text := '^([1-3][A-L]|G[0-9]+|P[0-9]+)$';  -- patrones de 0012
  v_tercero text := '^3[A-L]{5}$';                       -- mejores terceros
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

-- Las funciones se invocan desde finalizar_partido/revertir_partido (definer);
-- no deben ser ejecutables directamente por clientes.
revoke all on function public.clasificacion_terceros(uuid) from anon, authenticated;
revoke all on function public.equipo_tercero_slot(uuid, int) from anon, authenticated;
revoke all on function public.resolver_cruces(uuid) from anon, authenticated;
