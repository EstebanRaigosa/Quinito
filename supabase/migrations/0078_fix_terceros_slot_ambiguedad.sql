-- ============================================================================
-- Fix: ambigüedad de columna en asignacion_terceros_actual (0077)
--
-- La línea `string_agg(grupo, '' order by grupo) from mejores_terceros(...)`
-- fallaba con 42702 (column reference "grupo" is ambiguous): dentro de la
-- función el `grupo` del RETURNS TABLE colisiona con la columna `grupo` que
-- devuelve mejores_terceros. Se califica con alias de la función (mt.grupo). La
-- RPC rota devolvía error -> la UI no recibía la asignación y los selectores de
-- cruce nunca aparecían. Se recrea también equipo_tercero_slot calificando igual
-- (por robustez; allí no había colisión real, pero deja el patrón uniforme).
-- ============================================================================

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
  v_manual_count int;
  v_manual_ok boolean;
begin
  select count(distinct ats.numero_partido) into v_terceros
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;

  select string_agg(mt.grupo, '' order by mt.grupo)
    into v_combinacion
  from public.mejores_terceros(p_torneo_id) mt;

  if v_combinacion is null or v_terceros = 0
     or length(v_combinacion) <> v_terceros then
    return null;
  end if;

  select count(*) into v_manual_count
  from public."tblAsignacionTercerosSlotManual" m
  where m.torneo_id = p_torneo_id;

  if v_manual_count = v_terceros then
    select (string_agg(m.grupo, '' order by m.grupo) = v_combinacion)
      into v_manual_ok
    from public."tblAsignacionTercerosSlotManual" m
    where m.torneo_id = p_torneo_id;

    if v_manual_ok then
      select m.grupo into v_grupo
      from public."tblAsignacionTercerosSlotManual" m
      where m.torneo_id = p_torneo_id and m.numero_partido = p_numero;
      if v_grupo is not null then
        return public.equipo_clasificado(p_torneo_id, v_grupo, 3);
      end if;
    end if;
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

create or replace function public.asignacion_terceros_actual(p_torneo_id uuid)
returns table (numero_partido int, grupo text, es_manual boolean)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_combinacion text;
  v_terceros int;
  v_manual_count int;
  v_manual_ok boolean;
begin
  select count(distinct ats.numero_partido) into v_terceros
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;

  select string_agg(mt.grupo, '' order by mt.grupo)
    into v_combinacion
  from public.mejores_terceros(p_torneo_id) mt;

  if v_combinacion is null or v_terceros = 0
     or length(v_combinacion) <> v_terceros then
    return;
  end if;

  select count(*) into v_manual_count
  from public."tblAsignacionTercerosSlotManual" m
  where m.torneo_id = p_torneo_id;

  if v_manual_count = v_terceros then
    select (string_agg(m.grupo, '' order by m.grupo) = v_combinacion)
      into v_manual_ok
    from public."tblAsignacionTercerosSlotManual" m
    where m.torneo_id = p_torneo_id;

    if v_manual_ok then
      return query
      select m.numero_partido, m.grupo, true
      from public."tblAsignacionTercerosSlotManual" m
      where m.torneo_id = p_torneo_id;
      return;
    end if;
  end if;

  return query
  select ats.numero_partido, ats.grupo, false
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id
    and ats.combinacion_grupos = v_combinacion;
end;
$function$;

revoke all on function public.equipo_tercero_slot(uuid, int) from anon, authenticated;
revoke all on function public.asignacion_terceros_actual(uuid) from public;
grant execute on function public.asignacion_terceros_actual(uuid) to authenticated;
