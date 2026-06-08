-- ============================================================================
-- Resolución de cruces eliminatorios (REQUIREMENTS §6.4.7)
-- Reemplaza los placeholders (1A, 2B, G5, P5, ...) de los partidos
-- eliminatorios por los equipos reales en cuanto se pueden determinar.
-- Todo es idempotente: vuelve a calcular desde el estado actual, así que
-- sirve tanto al finalizar un partido como al revertirlo.
--
-- Soportado: posición en grupo (1A,2A,3A...) y ganador/perdedor de partido
-- (G<numero>, P<numero>). NO soportado aún: mejores terceros del Mundial
-- (3ABCDF) — requiere la tabla tblTercerLugarAsignacion (pendiente). Esos
-- placeholders se dejan intactos.
--
-- Limitación de desempates: el orden dentro del grupo usa puntos, luego
-- diferencia de gol, luego goles a favor y finalmente el id del equipo
-- (determinista). No implementa enfrentamiento directo / fair play / sorteo.
-- ============================================================================

-- Equipo que termina en la posición p_pos (1=primero...) de un grupo, pero
-- solo si TODOS los partidos de ese grupo ya están finalizados. Si el grupo
-- no existe o está incompleto, retorna null.
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
  v_total int;
  v_finalizados int;
begin
  select count(*),
         count(*) filter (where estado = 'finalizado')
    into v_total, v_finalizados
  from public."tblPartidos"
  where torneo_id = p_torneo_id
    and fase = 'fase_grupos'
    and grupo = p_grupo;

  -- Grupo inexistente o aún sin terminar: no se puede determinar la posición.
  if v_total = 0 or v_finalizados < v_total then
    return null;
  end if;

  select equipo_id into v_equipo
  from (
    with marcadores as (
      select equipo_local_id as equipo_id,
             goles_local as gf, goles_visitante as gc
      from public."tblPartidos"
      where torneo_id = p_torneo_id and fase = 'fase_grupos'
        and grupo = p_grupo and estado = 'finalizado'
      union all
      select equipo_visitante_id,
             goles_visitante, goles_local
      from public."tblPartidos"
      where torneo_id = p_torneo_id and fase = 'fase_grupos'
        and grupo = p_grupo and estado = 'finalizado'
    )
    select equipo_id,
           row_number() over (
             order by sum(case when gf > gc then 3 when gf = gc then 1 else 0 end) desc,
                      sum(gf - gc) desc,
                      sum(gf) desc,
                      equipo_id
           ) as rn
    from marcadores
    where equipo_id is not null
    group by equipo_id
  ) ranked
  where rn = p_pos;

  return v_equipo;
end;
$function$;

-- Ganador (p_ganador=true) o perdedor (false) de un partido por su número,
-- solo si está finalizado y NO terminó en empate. Si no, retorna null.
create or replace function public.ganador_partido(
  p_torneo_id uuid,
  p_numero int,
  p_ganador boolean
)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_gl int; v_gv int; v_el uuid; v_ev uuid; v_estado text;
begin
  select goles_local, goles_visitante, equipo_local_id, equipo_visitante_id, estado
    into v_gl, v_gv, v_el, v_ev, v_estado
  from public."tblPartidos"
  where torneo_id = p_torneo_id and numero_partido = p_numero;

  if v_estado is distinct from 'finalizado'
     or v_gl is null or v_gv is null or v_gl = v_gv then
    return null;
  end if;

  if p_ganador then
    return case when v_gl > v_gv then v_el else v_ev end;
  else
    return case when v_gl > v_gv then v_ev else v_el end;
  end if;
end;
$function$;

-- Traduce un placeholder a un equipo_id (o null si aún no se determina).
-- Patrones soportados: '<pos><grupo>' (ej '1A','2B'), 'G<n>', 'P<n>'.
create or replace function public.resolver_placeholder(
  p_torneo_id uuid,
  p_ph text
)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if p_ph is null then
    return null;
  elsif p_ph ~ '^[1-3][A-L]$' then
    return public.equipo_clasificado(p_torneo_id, substr(p_ph, 2, 1), substr(p_ph, 1, 1)::int);
  elsif p_ph ~ '^G[0-9]+$' then
    return public.ganador_partido(p_torneo_id, substr(p_ph, 2)::int, true);
  elsif p_ph ~ '^P[0-9]+$' then
    return public.ganador_partido(p_torneo_id, substr(p_ph, 2)::int, false);
  else
    return null; -- patrón no soportado (ej. mejores terceros '3ABCDF')
  end if;
end;
$function$;

-- Recalcula los equipos de TODOS los partidos eliminatorios del torneo.
-- Procesa en orden de numero_partido para que una ronda alimente a la
-- siguiente dentro de la misma pasada (grupos -> semis -> final, etc.).
-- Solo toca los lados cuyo placeholder es de un patrón soportado: deja
-- intactos los placeholders de terceros y cualquier asignación manual.
create or replace function public.resolver_cruces(p_torneo_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_soportado text := '^([1-3][A-L]|G[0-9]+|P[0-9]+)$';
begin
  for r in
    select id, placeholder_local, placeholder_visitante
    from public."tblPartidos"
    where torneo_id = p_torneo_id and fase <> 'fase_grupos'
    order by numero_partido
  loop
    if r.placeholder_local ~ v_soportado then
      update public."tblPartidos"
         set equipo_local_id = public.resolver_placeholder(p_torneo_id, r.placeholder_local)
       where id = r.id;
    end if;
    if r.placeholder_visitante ~ v_soportado then
      update public."tblPartidos"
         set equipo_visitante_id = public.resolver_placeholder(p_torneo_id, r.placeholder_visitante)
       where id = r.id;
    end if;
  end loop;
end;
$function$;

revoke all on function public.equipo_clasificado(uuid, text, int) from anon, authenticated;
revoke all on function public.ganador_partido(uuid, int, boolean) from anon, authenticated;
revoke all on function public.resolver_placeholder(uuid, text) from anon, authenticated;
revoke all on function public.resolver_cruces(uuid) from anon, authenticated;
