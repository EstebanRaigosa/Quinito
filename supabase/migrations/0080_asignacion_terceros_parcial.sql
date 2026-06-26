-- ============================================================================
-- Asignación PARCIAL de cruces de terceros (opción "Ninguno").
--
-- Cambio de semántica respecto a 0078/0079:
--   - equipo_tercero_slot: si existe CUALQUIER asignación manual para el torneo,
--     manda el manual y SOLO se resuelven los slots con fila manual; los demás
--     quedan sin equipo (placeholder). Si NO hay ninguna fila manual, sigue el
--     FIFA Annex C completo (conjunto firme). Así el admin puede guardar solo los
--     cruces que quiera y dejar el resto en "Ninguno".
--   - asignacion_terceros_actual: ahora devuelve UNA FILA POR TERCERO candidato
--     (top-`cupos` efectivo), con numero_partido NULL cuando está sin asignar
--     ("Ninguno"). Permite a la UI listar todos los terceros, asignados o no.
-- La tabla tblAsignacionTercerosSlotManual estaba vacía, así que no hubo cambio
-- de comportamiento para datos existentes (sin manual -> FIFA, como hasta ahora).
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
begin
  select count(distinct ats.numero_partido) into v_terceros
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;

  if v_terceros = 0 then
    return null;
  end if;

  select count(*) into v_manual_count
  from public."tblAsignacionTercerosSlotManual" m
  where m.torneo_id = p_torneo_id;

  -- Modo manual: solo los slots con fila manual se resuelven; el resto, null.
  if v_manual_count > 0 then
    select m.grupo into v_grupo
    from public."tblAsignacionTercerosSlotManual" m
    where m.torneo_id = p_torneo_id and m.numero_partido = p_numero;
    if v_grupo is null then
      return null;
    end if;
    return public.equipo_clasificado(p_torneo_id, v_grupo, 3);
  end if;

  -- Modo automático FIFA (requiere conjunto firme de mejores terceros).
  select string_agg(mt.grupo, '' order by mt.grupo)
    into v_combinacion
  from public.mejores_terceros(p_torneo_id) mt;

  if v_combinacion is null or length(v_combinacion) <> v_terceros then
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

drop function if exists public.asignacion_terceros_actual(uuid);

create function public.asignacion_terceros_actual(p_torneo_id uuid)
returns table (
  grupo text,
  numero_partido int,
  es_manual boolean,
  es_provisional boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_combinacion text;
  v_terceros int;
  v_manual_count int;
  v_provisional boolean;
begin
  select count(distinct ats.numero_partido) into v_terceros
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;

  if v_terceros = 0 then
    return;
  end if;

  -- Conjunto efectivo de `cupos` grupos: marcados a mano primero, luego provisional.
  select string_agg(sel.grupo, '' order by sel.grupo)
    into v_combinacion
  from (
    select c.grupo
    from public.clasificacion_terceros_provisional(p_torneo_id) c
    left join public."tblTercerosClasificados" tc
      on tc.torneo_id = p_torneo_id and tc.grupo = c.grupo
    order by (tc.grupo is not null) desc, c.posicion
    limit v_terceros
  ) sel;

  if v_combinacion is null or length(v_combinacion) <> v_terceros then
    return;
  end if;

  select (count(*) <> v_terceros) into v_provisional
  from public.mejores_terceros(p_torneo_id);

  select count(*) into v_manual_count
  from public."tblAsignacionTercerosSlotManual" m
  where m.torneo_id = p_torneo_id;

  -- Modo manual: una fila por tercero candidato; numero NULL si está sin asignar.
  if v_manual_count > 0 then
    return query
    select cg.g, m.numero_partido, true, v_provisional
    from regexp_split_to_table(v_combinacion, '') as cg(g)
    left join public."tblAsignacionTercerosSlotManual" m
      on m.torneo_id = p_torneo_id and m.grupo = cg.g;
    return;
  end if;

  -- Modo automático FIFA: cada grupo de la combinación con su slot.
  return query
  select cg.g, ats.numero_partido, false, v_provisional
  from regexp_split_to_table(v_combinacion, '') as cg(g)
  left join public."tblAsignacionTercerosSlot" ats
    on ats.torneo_id = p_torneo_id
   and ats.combinacion_grupos = v_combinacion
   and ats.grupo = cg.g;
end;
$function$;

revoke all on function public.equipo_tercero_slot(uuid, int) from anon, authenticated;
revoke all on function public.asignacion_terceros_actual(uuid) from public;
grant execute on function public.asignacion_terceros_actual(uuid) to authenticated;
