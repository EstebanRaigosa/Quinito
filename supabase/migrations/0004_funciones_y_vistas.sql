-- ════════════════════════════════════════════════════════════════════════
-- Funciones helper (SECURITY DEFINER para evitar recursión de RLS al
-- consultar tblParticipantes desde las propias políticas de esa tabla).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.es_miembro_grupo(p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid()
  );
$$;

create or replace function public.es_admin_grupo(p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid() and rol = 'admin'
  );
$$;

-- ¿Ya cerró la ventana de predicción? (fecha_hora - minutos_cierre del grupo)
create or replace function public.partido_cerrado(p_partido_id uuid, p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    now() >= (pa.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion)),
    false
  )
  from public."tblPartidos" pa
  join public."tblReglasGrupo" r on r.grupo_id = p_grupo_id
  where pa.id = p_partido_id;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- Vistas
-- ════════════════════════════════════════════════════════════════════════

create or replace view public."vwTablaPosiciones" as
select
  p.grupo_id,
  p.id as participante_id,
  prof.nombre_completo,
  prof.avatar_url,
  coalesce(sum(pred.puntos_obtenidos), 0) as puntos_totales,
  count(pred.id) filter (where pred.puntos_obtenidos > 0) as aciertos,
  count(pred.id) filter (
    where pred.goles_local = pa.goles_local
      and pred.goles_visitante = pa.goles_visitante
      and pa.estado = 'finalizado'
  ) as marcadores_exactos,
  rank() over (
    partition by p.grupo_id
    order by coalesce(sum(pred.puntos_obtenidos), 0) desc
  ) as posicion
from public."tblParticipantes" p
join public."tblProfiles" prof on prof.id = p.usuario_id
left join public."tblPredicciones" pred on pred.participante_id = p.id
left join public."tblPartidos" pa on pa.id = pred.partido_id
where public.es_miembro_grupo(p.grupo_id)
group by p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url;

create or replace view public."vwEstadisticasPartidoGanadorGlobal" as
select
  partido_id,
  count(*) as total_predicciones,
  count(*) filter (where goles_local > goles_visitante) as predicciones_local,
  count(*) filter (where goles_local < goles_visitante) as predicciones_visitante,
  count(*) filter (where goles_local = goles_visitante) as predicciones_empate,
  round(100.0 * count(*) filter (where goles_local > goles_visitante) / nullif(count(*),0), 2) as pct_local,
  round(100.0 * count(*) filter (where goles_local < goles_visitante) / nullif(count(*),0), 2) as pct_visitante,
  round(100.0 * count(*) filter (where goles_local = goles_visitante) / nullif(count(*),0), 2) as pct_empate
from public."tblPredicciones"
group by partido_id;

create or replace view public."vwEstadisticasPartidoMarcadoresGlobal" as
select
  partido_id,
  goles_local,
  goles_visitante,
  count(*) as cantidad,
  round(100.0 * count(*) / sum(count(*)) over (partition by partido_id), 2) as porcentaje
from public."tblPredicciones"
group by partido_id, goles_local, goles_visitante;

create or replace view public."vwEstadisticasPartidoGanadorGrupo" as
select
  p.grupo_id,
  pred.partido_id,
  count(*) as total_predicciones,
  count(*) filter (where pred.goles_local > pred.goles_visitante) as predicciones_local,
  count(*) filter (where pred.goles_local < pred.goles_visitante) as predicciones_visitante,
  count(*) filter (where pred.goles_local = pred.goles_visitante) as predicciones_empate,
  round(100.0 * count(*) filter (where pred.goles_local > pred.goles_visitante) / nullif(count(*),0), 2) as pct_local,
  round(100.0 * count(*) filter (where pred.goles_local < pred.goles_visitante) / nullif(count(*),0), 2) as pct_visitante,
  round(100.0 * count(*) filter (where pred.goles_local = pred.goles_visitante) / nullif(count(*),0), 2) as pct_empate
from public."tblPredicciones" pred
join public."tblParticipantes" p on p.id = pred.participante_id
where public.es_miembro_grupo(p.grupo_id)
group by p.grupo_id, pred.partido_id;

create or replace view public."vwEstadisticasPartidoMarcadoresGrupo" as
select
  p.grupo_id,
  pred.partido_id,
  pred.goles_local,
  pred.goles_visitante,
  count(*) as cantidad,
  round(100.0 * count(*) / sum(count(*)) over (partition by p.grupo_id, pred.partido_id), 2) as porcentaje
from public."tblPredicciones" pred
join public."tblParticipantes" p on p.id = pred.participante_id
where public.es_miembro_grupo(p.grupo_id)
group by p.grupo_id, pred.partido_id, pred.goles_local, pred.goles_visitante;

-- CRÍTICO de privacidad: solo miembros del grupo y SOLO tras el cierre.
create or replace view public."vwPrediccionesGrupoPartido" as
select
  p.grupo_id,
  pred.partido_id,
  p.id as participante_id,
  prof.id as usuario_id,
  prof.nombre_completo,
  prof.avatar_url,
  pred.goles_local,
  pred.goles_visitante,
  pred.puntos_obtenidos,
  pred.prediccion_unica
from public."tblPredicciones" pred
join public."tblParticipantes" p on p.id = pred.participante_id
join public."tblProfiles" prof on prof.id = p.usuario_id
where public.es_miembro_grupo(p.grupo_id)
  and public.partido_cerrado(pred.partido_id, p.grupo_id);

-- Permisos de lectura de vistas: solo usuarios autenticados.
revoke all on
  public."vwTablaPosiciones",
  public."vwEstadisticasPartidoGanadorGlobal",
  public."vwEstadisticasPartidoMarcadoresGlobal",
  public."vwEstadisticasPartidoGanadorGrupo",
  public."vwEstadisticasPartidoMarcadoresGrupo",
  public."vwPrediccionesGrupoPartido"
from anon;

grant select on
  public."vwTablaPosiciones",
  public."vwEstadisticasPartidoGanadorGlobal",
  public."vwEstadisticasPartidoMarcadoresGlobal",
  public."vwEstadisticasPartidoGanadorGrupo",
  public."vwEstadisticasPartidoMarcadoresGrupo",
  public."vwPrediccionesGrupoPartido"
to authenticated;
