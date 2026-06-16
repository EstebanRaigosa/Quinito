-- Qué miembros de un grupo tienen notificaciones push activas, para marcarlos en
-- el panel de participantes (solo lo ve el admin del grupo / superadmin).
--
-- `tblPushSuscripciones` tiene RLS que limita a cada quien a SUS filas, así que el
-- admin no puede leer las de los demás. Igual que `pagos_grupo`, exponemos un RPC
-- `SECURITY DEFINER` con la puerta dura: devuelve filas solo si quien llama es
-- admin del grupo o superadmin. No revela endpoints ni claves push, solo el
-- `usuario_id` de quienes están suscritos (señal de "tiene notis activas").
create or replace function public.notificaciones_grupo(p_grupo_id uuid)
returns table (usuario_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select distinct p.usuario_id
  from public."tblParticipantes" p
  where p.grupo_id = p_grupo_id
    and p.eliminado_en is null
    and (public.es_admin_grupo(p_grupo_id) or public.es_superadmin())
    and exists (
      select 1 from public."tblPushSuscripciones" s
      where s.usuario_id = p.usuario_id
    );
$function$;

grant execute on function public.notificaciones_grupo(uuid) to authenticated;
