-- 0023_partido_cerrado_incluye_estado.sql
--
-- `partido_cerrado` es la puerta de privacidad: decide cuándo se pueden revelar
-- las predicciones nominales del grupo (vwPrediccionesGrupoPartido). Antes solo
-- comparaba la HORA (`now() >= fecha_hora - minutos_cierre`), ignorando el
-- `estado`. Eso causaba un bug: si un partido se marca `en_vivo`/`finalizado`
-- (resultado cargado) ANTES de su hora programada, las predicciones seguían
-- ocultas y las estadísticas decían "nadie predijo este partido".
--
-- Un partido que ya no está `programado` está, por definición, cerrado: las
-- apuestas no se pueden cambiar y el marcador ya es público. Así que cerramos
-- también cuando el estado avanzó, igual que hace el cliente (`prediccionCerrada`
-- en lib/utils/prediccion.ts). Esto solo AMPLÍA visibilidad tras el inicio del
-- partido; antes del inicio sigue mandando la hora.
create or replace function public.partido_cerrado(p_partido_id uuid, p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    pa.estado <> 'programado'
    or now() >= (pa.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion)),
    false
  )
  from public."tblPartidos" pa
  join public."tblReglasGrupo" r on r.grupo_id = p_grupo_id
  where pa.id = p_partido_id;
$$;
