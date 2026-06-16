-- Lista de usuarios con notificaciones push activas, para el panel de admin.
--
-- `tblPushSuscripciones` tiene RLS que limita a cada usuario a SUS filas, así que
-- el superadmin no puede leerlas en crudo. Igual que `superadmin_listar_pollas`,
-- exponemos un RPC `SECURITY DEFINER` con la puerta dura `es_superadmin()`:
-- devuelve null si quien llama no es superadmin.
--
-- Agrega por usuario (un usuario puede tener varios dispositivos/navegadores):
--   - dispositivos: nº de suscripciones activas
--   - ultima_suscripcion: la más reciente que registró
--   - ultimo_envio: último push entregado con éxito (max `usado_en`, puede ser null)
create or replace function public.superadmin_listar_suscritos()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when not public.es_superadmin() then null::jsonb
    else coalesce((
      select jsonb_agg(u order by u.nombre_completo nulls last, u.email)
      from (
        select
          s.usuario_id,
          pr.nombre_completo,
          pr.email,
          count(*) as dispositivos,
          max(s.creado_en) as ultima_suscripcion,
          max(s.usado_en) as ultimo_envio
        from public."tblPushSuscripciones" s
        left join public."tblProfiles" pr on pr.id = s.usuario_id
        group by s.usuario_id, pr.nombre_completo, pr.email
      ) u
    ), '[]'::jsonb)
  end;
$function$;

grant execute on function public.superadmin_listar_suscritos() to authenticated;
