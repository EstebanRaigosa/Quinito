-- 0033_desempate_criterios_deportivos.sql
--
-- Amplía el desempate de la tabla de posiciones con criterios DEPORTIVOS, de
-- modo que el orden alfabético por nombre deje de decidir premios.
--
-- Antes (ver 0024): a igualdad de puntos se rompía por los 3 criterios
-- configurables (exactos/unicas/aciertos) y, si seguían empatados, por
-- nombre_completo (A→Z) y por id. Premiar/posicionar según el abecedario no es
-- justo, así que se intercalan tres criterios deportivos derivables y, como
-- último criterio real, la hora en que el participante dejó lista su quiniela.
--
-- Orden de desempate resultante (todo desc salvo donde se indica):
--   1. Puntos totales
--   2. criterios_desempate[1]   (configurable: exactos | unicas | aciertos)
--   3. criterios_desempate[2]   (configurable)
--   4. criterios_desempate[3]   (configurable)
--   5. Diferencia de gol acertada            (deportivo, fijo)
--   6. Ganador / sentido 1X2 acertado        (deportivo, fijo)
--   7. Goles individuales acertados           (deportivo, fijo)
--   8. Quién guardó primero: max(actualizado_en) ASC   ← ÚLTIMO criterio real
--      · id ASC  → salvaguarda técnica invisible (orden total determinístico
--                  para row_number en el caso imposible de timestamps idénticos
--                  al microsegundo). NO es un criterio de cara al producto.
--
-- El nombre del participante se ELIMINA del ordenamiento (ya no desempata).
--
-- Notas de implementación:
--  * Solo cambia el ORDER BY interno del row_number(): las columnas de salida de
--    la vista quedan idénticas, así que grupo_detalle, los tipos generados y el
--    frontend NO se ven afectados (los nuevos criterios operan "por detrás").
--  * Los conteos deportivos se derivan comparando predicción vs marcador real en
--    partidos finalizados; no requieren persistir nada nuevo en tblPredicciones.
--  * actualizado_en ya lo mantiene el trigger set_actualizado_en (ver 0003): se
--    fija al crear y se refresca en cada edición del marcador.
--  * Mantiene security_invoker = off (agrega predicciones → definer, ver 0021).

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
      -- 1. Puntos totales
      coalesce(sum(pred.puntos_obtenidos), 0) desc,
      -- 2-4. Criterios configurables por la polla (exactos | unicas | aciertos)
      (case rg.criterios_desempate[1]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0)
        else 0 end) desc,
      (case rg.criterios_desempate[2]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0)
        else 0 end) desc,
      (case rg.criterios_desempate[3]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0)
        else 0 end) desc,
      -- 5. Diferencia de gol acertada (acertó el margen aunque no el marcador)
      count(pred.id) filter (
        where pa.estado = 'finalizado'
          and (pred.goles_local - pred.goles_visitante) = (pa.goles_local - pa.goles_visitante)
      ) desc,
      -- 6. Ganador / sentido 1X2 acertado (gana local / empate / gana visitante)
      count(pred.id) filter (
        where pa.estado = 'finalizado'
          and (case when pred.goles_local > pred.goles_visitante then 1
                    when pred.goles_local < pred.goles_visitante then -1 else 0 end)
            = (case when pa.goles_local > pa.goles_visitante then 1
                    when pa.goles_local < pa.goles_visitante then -1 else 0 end)
      ) desc,
      -- 7. Goles individuales acertados (0-2 por partido: local y/o visitante)
      coalesce(sum(
        (case when pa.estado = 'finalizado' and pred.goles_local = pa.goles_local then 1 else 0 end)
        + (case when pa.estado = 'finalizado' and pred.goles_visitante = pa.goles_visitante then 1 else 0 end)
      ), 0) desc,
      -- 8. Quién dejó lista su quiniela primero (su última edición más temprana).
      --    nulls last: quien no predijo nada cae al final de su grupo de empate.
      max(pred.actualizado_en) asc nulls last,
      -- Salvaguarda técnica (NO es criterio): garantiza orden total determinístico.
      p.id asc
  ) as posicion,
  count(pred.id) filter (where pred.prediccion_unica) as unicas_acertadas
from public."tblParticipantes" p
join public."tblProfiles" prof on prof.id = p.usuario_id
join public."tblReglasGrupo" rg on rg.grupo_id = p.grupo_id
left join public."tblPredicciones" pred on pred.participante_id = p.id
left join public."tblPartidos" pa on pa.id = pred.partido_id
where public.es_miembro_grupo(p.grupo_id)
group by p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url, rg.criterios_desempate;

alter view public."vwTablaPosiciones" set (security_invoker = off);
