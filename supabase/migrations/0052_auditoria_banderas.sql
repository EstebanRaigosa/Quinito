-- 0052_auditoria_banderas.sql
--
-- Agrega a la auditoría de marcadores los códigos ISO de los equipos (local y
-- visitante) para poder mostrar las BANDERAS en la UI. El RPC ya hacía el join a
-- tblEquipos para armar `partido_label`; aquí solo expone `codigo_iso`. En
-- partidos eliminatorios aún sin equipos, vienen null (la UI usa un placeholder).
--
-- Idéntico al RPC de la 0050 salvo dos campos nuevos en el jsonb.

create or replace function public.superadmin_auditoria_grupo(p_grupo_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select case
    when not public.es_superadmin() then null::jsonb
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id,
        'creado_en', h.creado_en,
        'accion', h.accion,
        'participante_id', h.participante_id,
        'usuario_id', h.usuario_id,
        'usuario_nombre', coalesce(pr.nombre_completo, pr.email),
        'usuario_email', pr.email,
        'partido_id', h.partido_id,
        'partido_numero', pa.numero_partido,
        'partido_fase', pa.fase,
        'partido_label',
          coalesce(el.nombre, pa.placeholder_local, '¿?') || ' vs ' ||
          coalesce(ev.nombre, pa.placeholder_visitante, '¿?'),
        'equipo_local_iso', el.codigo_iso,
        'equipo_visitante_iso', ev.codigo_iso,
        'goles_local_anterior', h.goles_local_anterior,
        'goles_visitante_anterior', h.goles_visitante_anterior,
        'goles_local_nuevo', h.goles_local_nuevo,
        'goles_visitante_nuevo', h.goles_visitante_nuevo,
        'actor_id', h.actor_id,
        'actor_nombre', h.actor_nombre,
        'actor_es_admin', h.actor_es_admin,
        'actor_es_dueno', (h.actor_id is not distinct from h.usuario_id)
      ) order by h.creado_en desc)
      from public."tblPrediccionesHistorial" h
      left join public."tblProfiles" pr on pr.id = h.usuario_id
      left join public."tblPartidos" pa on pa.id = h.partido_id
      left join public."tblEquipos" el on el.id = pa.equipo_local_id
      left join public."tblEquipos" ev on ev.id = pa.equipo_visitante_id
      where h.grupo_id = p_grupo_id
    ), '[]'::jsonb)
  end;
$$;

revoke execute on function public.superadmin_auditoria_grupo(uuid) from public, anon;
grant execute on function public.superadmin_auditoria_grupo(uuid) to authenticated;
