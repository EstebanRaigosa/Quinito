-- ============================================================================
-- asignacion_terceros_actual v2: muestra el cruce con los terceros que HOY van
-- en zona (top-`cupos` provisional), aunque el corte no esté cerrado, en vez de
-- esperar a que los 8 estén asegurados. Respeta los terceros marcados a mano
-- (van primero) y rellena con el ranking provisional. Añade `es_provisional`
-- (true mientras el conjunto de 8 no esté matemáticamente firme).
--
-- IMPORTANTE: esto solo cambia la VISTA/edición de admin. La resolución real del
-- bracket (equipo_tercero_slot / resolver_cruces) sigue usando mejores_terceros
-- (conjunto firme), así que ningún partido se puebla con un tercero antes de que
-- el corte quede determinado.
-- ============================================================================

drop function if exists public.asignacion_terceros_actual(uuid);

create function public.asignacion_terceros_actual(p_torneo_id uuid)
returns table (
  numero_partido int,
  grupo text,
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
  v_manual_slot_count int;
  v_manual_slot_ok boolean;
  v_provisional boolean;
begin
  select count(distinct ats.numero_partido) into v_terceros
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;

  if v_terceros = 0 then
    return; -- el torneo no usa mejores terceros
  end if;

  -- Conjunto efectivo de `cupos` grupos: primero los marcados a mano
  -- (tblTercerosClasificados), luego se rellena por ranking provisional.
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
    return; -- aún no hay ranking provisional suficiente
  end if;

  -- ¿El conjunto de 8 ya está firme? (mejores_terceros devuelve los `cupos`).
  select (count(*) <> v_terceros) into v_provisional
  from public.mejores_terceros(p_torneo_id);

  -- Override manual de SLOTS, si está completo y coincide con la combinación.
  select count(*) into v_manual_slot_count
  from public."tblAsignacionTercerosSlotManual" m
  where m.torneo_id = p_torneo_id;

  if v_manual_slot_count = v_terceros then
    select (string_agg(m.grupo, '' order by m.grupo) = v_combinacion)
      into v_manual_slot_ok
    from public."tblAsignacionTercerosSlotManual" m
    where m.torneo_id = p_torneo_id;

    if v_manual_slot_ok then
      return query
      select m.numero_partido, m.grupo, true, v_provisional
      from public."tblAsignacionTercerosSlotManual" m
      where m.torneo_id = p_torneo_id;
      return;
    end if;
  end if;

  -- Asignación FIFA (Annex C) para la combinación efectiva.
  return query
  select ats.numero_partido, ats.grupo, false, v_provisional
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id
    and ats.combinacion_grupos = v_combinacion;
end;
$function$;

revoke all on function public.asignacion_terceros_actual(uuid) from public;
grant execute on function public.asignacion_terceros_actual(uuid) to authenticated;
