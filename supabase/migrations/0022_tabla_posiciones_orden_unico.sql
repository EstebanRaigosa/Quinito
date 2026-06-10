-- 0022_tabla_posiciones_orden_unico.sql
--
-- Las posiciones de la tabla de la polla deben ser ÚNICAS: un solo 1.º, un solo
-- 2.º, un solo 3.º, aunque haya empate de puntos. Antes se usaba `rank()`, que
-- asigna la misma posición a los empatados (1, 1, 3...) y rompe el podio.
--
-- Cambio a `row_number()` con desempates deterministas, en orden de mérito:
--   1) más puntos
--   2) más marcadores exactos (clavar el resultado vale más que solo acertar)
--   3) más aciertos
--   4) nombre (orden estable y reproducible)
--   5) id del participante (desempate final garantizado)
--
-- Mantiene `security_invoker = off`: la vista AGREGA predicciones, así que va
-- como definer (ver 0021); la privacidad se asegura con `es_miembro_grupo`.
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
  row_number() over (
    partition by p.grupo_id
    order by
      coalesce(sum(pred.puntos_obtenidos), 0) desc,
      count(pred.id) filter (
        where pred.goles_local = pa.goles_local
          and pred.goles_visitante = pa.goles_visitante
          and pa.estado = 'finalizado'
      ) desc,
      count(pred.id) filter (where pred.puntos_obtenidos > 0) desc,
      prof.nombre_completo asc,
      p.id asc
  ) as posicion
from public."tblParticipantes" p
join public."tblProfiles" prof on prof.id = p.usuario_id
left join public."tblPredicciones" pred on pred.participante_id = p.id
left join public."tblPartidos" pa on pa.id = pred.partido_id
where public.es_miembro_grupo(p.grupo_id)
group by p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url;

alter view public."vwTablaPosiciones" set (security_invoker = off);
