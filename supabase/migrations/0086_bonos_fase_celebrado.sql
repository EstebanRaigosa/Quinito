-- ============================================================================
-- Celebración del bono de fase: persistir "ya se mostró" en la BD (cross-device).
--
-- Antes la modal de celebración usaba localStorage (por navegador). Para que sea
-- 1 vez por USUARIO en todos sus dispositivos, se marca en `tblBonosFase` (que ya
-- tiene una fila por participante+fase) con una columna `celebrado_en`:
--   • null   → bono ganado, celebración pendiente.
--   • <fecha>→ ya se mostró la celebración.
--
-- Sin backfill (decisión de producto): los bonos ya otorgados quedan en null, así
-- que la próxima vez que cada usuario entre verá la celebración de lo que ya ganó.
-- ============================================================================
alter table public."tblBonosFase"
  add column celebrado_en timestamptz;

-- ----------------------------------------------------------------------------
-- marcar_bonos_celebrados(grupo): marca como celebrados los bonos pendientes del
-- participante actual en esa polla. Lo llama la app justo al mostrar la modal.
-- SECURITY DEFINER + validación de membresía (no se confía en el cliente).
-- ----------------------------------------------------------------------------
create or replace function public.marcar_bonos_celebrados(p_grupo_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_part uuid;
begin
  if v_uid is null then
    return;
  end if;

  -- El participante (no eliminado) del usuario en esa polla.
  select id into v_part
  from public."tblParticipantes"
  where grupo_id = p_grupo_id
    and usuario_id = v_uid
    and eliminado_en is null;
  if v_part is null then
    return;
  end if;

  update public."tblBonosFase"
     set celebrado_en = now()
   where participante_id = v_part
     and celebrado_en is null;
end;
$function$;

revoke all on function public.marcar_bonos_celebrados(uuid) from anon;
grant execute on function public.marcar_bonos_celebrados(uuid) to authenticated;
