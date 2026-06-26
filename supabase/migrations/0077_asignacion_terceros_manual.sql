-- ============================================================================
-- Asignación MANUAL del cruce de cada mejor tercero (override de FIFA Annex C)
--
-- Contexto: hasta 0056 el slot de bracket que ocupa cada uno de los mejores
-- terceros lo decide SIEMPRE la tabla FIFA Annex C (tblAsignacionTercerosSlot):
-- dado el CONJUNTO de grupos clasificados (la combinación), la permutación
-- grupo→partido queda fija. equipo_tercero_slot solo lee esa tabla.
--
-- Requerimiento: el admin quiere ver el cruce automático (Annex C) PERO poder
-- modificarlo a mano, p.ej. mover el 3° del grupo X al cruce del partido #80 en
-- vez del #74. Esto se desvía del reglamento real (en el Mundial la permutación
-- no es libre), por eso es un OVERRIDE opcional, no el comportamiento por
-- defecto: si no hay asignación manual completa, se usa Annex C como siempre.
--
-- Piezas:
--   1. tblAsignacionTercerosSlotManual : override por torneo. Una fila por slot
--      (numero_partido) con el grupo cuyo 3° lo ocupa. Biyección garantizada por
--      PK (torneo, numero_partido) + UNIQUE (torneo, grupo).
--   2. equipo_tercero_slot : ahora prioriza el override manual cuando está
--      COMPLETO y es CONSISTENTE con el conjunto de mejores terceros vigente
--      (mismas letras de grupo). Si no, cae a Annex C. Sin esa consistencia, un
--      manual viejo (de otra combinación) se ignora en vez de corromper cruces.
--   3. asignacion_terceros_actual : RPC de solo lectura que devuelve el mapeo
--      EFECTIVO (numero_partido, grupo, es_manual) para precargar la UI admin.
--      Devuelve vacío mientras el conjunto de 8 no esté determinado (no hay
--      combinación que permutar todavía).
-- ============================================================================

-- 1) Tabla de override manual. Solo escribe service_role (vía server action de
--    super-admin). Lectura para authenticated: expone únicamente posiciones de
--    grupo (cero PII), igual que el catálogo tblAsignacionTercerosSlot (0056).
create table if not exists public."tblAsignacionTercerosSlotManual" (
  torneo_id      uuid not null references public."tblTorneos"(id) on delete cascade,
  numero_partido int  not null,
  grupo          text not null check (grupo ~ '^[A-L]$'),
  asignado_por   uuid references auth.users(id),
  creado_en      timestamptz not null default now(),
  primary key (torneo_id, numero_partido),
  unique (torneo_id, grupo)
);

alter table public."tblAsignacionTercerosSlotManual" enable row level security;

drop policy if exists "asignacion_terceros_manual_select"
  on public."tblAsignacionTercerosSlotManual";
create policy "asignacion_terceros_manual_select"
  on public."tblAsignacionTercerosSlotManual"
  for select to authenticated using (true);

-- 2) equipo_tercero_slot v3: override manual completo + consistente, si no
--    Annex C. Misma firma/permisos que 0056 (la llaman resolver_cruces /
--    finalizar_partido como definer).
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

  -- El conjunto de grupos clasificados (manual o automático), ordenado.
  select string_agg(grupo, '' order by grupo)
    into v_combinacion
  from public.mejores_terceros(p_torneo_id);

  -- Sin combinación completa (fase incompleta / corte ambiguo): aún no se sabe.
  if v_combinacion is null or v_terceros = 0
     or length(v_combinacion) <> v_terceros then
    return null;
  end if;

  -- Override manual: solo si está COMPLETO (un grupo por slot) y sus grupos
  -- coinciden EXACTAMENTE con el conjunto de mejores terceros vigente.
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

  -- Fallback: FIFA Annex C (tabla de asignación por combinación).
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

-- 3) asignacion_terceros_actual: mapeo EFECTIVO slot→grupo para la UI admin.
--    Misma prioridad que equipo_tercero_slot (manual completo+consistente, si no
--    Annex C). Vacío si el conjunto de 8 aún no está determinado. Cero PII ->
--    ejecutable por authenticated (igual que clasificacion_terceros_provisional).
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

  select string_agg(grupo, '' order by grupo)
    into v_combinacion
  from public.mejores_terceros(p_torneo_id);

  if v_combinacion is null or v_terceros = 0
     or length(v_combinacion) <> v_terceros then
    return; -- conjunto de terceros aún no determinado: nada que asignar
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

  -- Annex C
  return query
  select ats.numero_partido, ats.grupo, false
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id
    and ats.combinacion_grupos = v_combinacion;
end;
$function$;

-- Permisos:
--   - equipo_tercero_slot: interna (definer), no ejecutable por clientes.
--   - asignacion_terceros_actual: la consume la UI admin -> authenticated.
revoke all on function public.equipo_tercero_slot(uuid, int) from anon, authenticated;
revoke all on function public.asignacion_terceros_actual(uuid) from public;
grant execute on function public.asignacion_terceros_actual(uuid) to authenticated;
