-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Eliminar polla: permitir también al superadmin de plataforma             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Amplía `eliminar_grupo` (0039): además del CREADOR, ahora el SUPERADMIN de
-- plataforma puede eliminar cualquier polla (para moderación / limpieza). Sigue
-- SIN permitirlo a otros admins del grupo (rol = 'admin' que no son creadores).
--
-- La RLS `grupos_delete` (0005) se deja igual (solo creador): el borrado solo
-- ocurre por este RPC SECURITY DEFINER auditado, así que no hace falta ampliar
-- el DELETE directo por tabla (defensa en profundidad).

create or replace function public.eliminar_grupo(p_grupo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creador_id uuid;
begin
  select creador_id into v_creador_id
  from public."tblGrupos"
  where id = p_grupo_id;

  if v_creador_id is null then
    raise exception 'La polla no existe';
  end if;

  -- El creador de la polla o el superadmin de plataforma pueden eliminarla.
  if v_creador_id <> auth.uid() and not public.es_superadmin() then
    raise exception 'Solo el creador o un superadmin pueden eliminar la polla';
  end if;

  -- El cascade limpia reglas, partidos del grupo, participantes, predicciones,
  -- baneados y abonos.
  delete from public."tblGrupos" where id = p_grupo_id;
end;
$$;

revoke execute on function public.eliminar_grupo(uuid) from public, anon;
grant  execute on function public.eliminar_grupo(uuid) to authenticated;
