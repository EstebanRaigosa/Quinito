-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Recordatorios push: agregar códigos ISO de los equipos                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- `recordatorios_pendientes` ahora devuelve también el `codigo_iso` de cada
-- equipo, para que la Edge Function arme el ícono "vs" de la notificación
-- (bolita con las dos banderas). Cambia la firma de retorno → hay que DROP +
-- CREATE (Postgres no permite cambiar columnas de salida con CREATE OR REPLACE).
--
-- PRIVACIDAD (CLAUDE.md §3.4): los ISO solo identifican equipos; sin PII.

drop function if exists public.recordatorios_pendientes();

create function public.recordatorios_pendientes()
returns table (
  usuario_id        uuid,
  partido_id        uuid,
  equipo_local      text,
  equipo_visitante  text,
  local_iso         text,
  visitante_iso     text,
  cierre            timestamptz
)
language sql
security definer
set search_path = public
as $$
  select distinct on (pt.usuario_id, p.id)
    pt.usuario_id,
    p.id as partido_id,
    el.nombre as equipo_local,
    ev.nombre as equipo_visitante,
    el.codigo_iso as local_iso,
    ev.codigo_iso as visitante_iso,
    (p.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion)) as cierre
  from public."tblParticipantes" pt
  join public."tblGrupoPartidos" gp on gp.grupo_id = pt.grupo_id
  join public."tblPartidos" p       on p.id = gp.partido_id
  join public."tblReglasGrupo" r    on r.grupo_id = pt.grupo_id
  join public."tblEquipos" el       on el.id = p.equipo_local_id
  join public."tblEquipos" ev       on ev.id = p.equipo_visitante_id
  where p.estado = 'programado'
    and p.equipo_local_id is not null
    and p.equipo_visitante_id is not null
    and (p.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion)) > now()
    and (p.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion))
          <= now() + interval '60 minutes'
    and not exists (
      select 1 from public."tblPredicciones" pr
      where pr.participante_id = pt.id and pr.partido_id = p.id
    )
    and not exists (
      select 1 from public."tblPushRecordatorios" rec
      where rec.usuario_id = pt.usuario_id and rec.partido_id = p.id
    )
  order by pt.usuario_id, p.id, cierre asc;
$$;

-- Solo invocable por la service_role (la Edge Function). Nadie más.
revoke execute on function public.recordatorios_pendientes()
  from public, anon, authenticated;
