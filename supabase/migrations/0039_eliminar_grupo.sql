-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Eliminar una polla (grupo) completa                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Solo el CREADOR de la polla puede eliminarla. Esto alinea con la política RLS
-- `grupos_delete` (0005), que ya restringe el DELETE a `creador_id = auth.uid()`.
--
-- Al borrar el grupo, TODO lo dependiente cae por cascade (FKs `on delete
-- cascade` declaradas en 0003 y posteriores):
--   • tblReglasGrupo, tblGrupoPartidos, tblParticipantes (→ tblPredicciones),
--     tblParticipantesBaneados, tblAbonos.
--   • tblNotificaciones queda con audiencia_grupo_id = null (on delete set null).
--
-- Es una acción IRREVERSIBLE: se pierden predicciones, puntos y pagos del grupo.

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

  -- Solo el creador puede eliminar la polla (no otros admins ni superadmin).
  if v_creador_id <> auth.uid() then
    raise exception 'Solo el creador puede eliminar la polla';
  end if;

  -- El cascade limpia reglas, partidos del grupo, participantes, predicciones,
  -- baneados y abonos.
  delete from public."tblGrupos" where id = p_grupo_id;
end;
$$;

revoke execute on function public.eliminar_grupo(uuid) from public, anon;
grant  execute on function public.eliminar_grupo(uuid) to authenticated;
