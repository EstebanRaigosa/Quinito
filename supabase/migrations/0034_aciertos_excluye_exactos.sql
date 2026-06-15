-- 0034_aciertos_excluye_exactos.sql
--
-- Un marcador exacto y un "acierto" son cosas distintas: hasta ahora `aciertos`
-- contaba TODA predicción con puntos_obtenidos > 0, lo que incluía a los
-- marcadores exactos (un exacto siempre suma). Eso hacía que un mismo acierto
-- exacto se contara también como acierto "parcial".
--
-- A partir de acá `aciertos` cuenta SOLO los aciertos PARCIALES: predicciones que
-- sumaron algún punto pero que NO son marcador exacto. Así `marcadores_exactos` y
-- `aciertos` quedan como conjuntos disjuntos (sin doble conteo).
--
-- El cambio aplica de forma consistente a:
--   * la columna de salida `aciertos` (lo que muestra la tabla), y
--   * el criterio de desempate configurable 'aciertos' (los CASE del ORDER BY).
--
-- Nota: `puntos_obtenidos > 0` ya implica partido finalizado (los puntos los fija
-- finalizar_partido); igual se deja explícito `pa.estado = 'finalizado'` en la
-- condición de exacto por claridad. Todo lo demás es idéntico a la 0033.

create or replace view public."vwTablaPosiciones" as
select
  p.grupo_id,
  p.id as participante_id,
  prof.nombre_completo,
  prof.avatar_url,
  coalesce(sum(pred.puntos_obtenidos), 0) as puntos_totales,
  -- Aciertos PARCIALES: sumó punto pero no fue marcador exacto.
  count(pred.id) filter (
    where pred.puntos_obtenidos > 0
      and not (
        pred.goles_local = pa.goles_local
        and pred.goles_visitante = pa.goles_visitante
        and pa.estado = 'finalizado'
      )
  ) as aciertos,
  count(pred.id) filter (
    where pred.goles_local = pa.goles_local
      and pred.goles_visitante = pa.goles_visitante
      and pa.estado = 'finalizado'
  ) as marcadores_exactos,
  row_number() over (
    partition by p.grupo_id
    order by
      coalesce(sum(pred.puntos_obtenidos), 0) desc,
      (case rg.criterios_desempate[1]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0 and not (pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado'))
        else 0 end) desc,
      (case rg.criterios_desempate[2]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0 and not (pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado'))
        else 0 end) desc,
      (case rg.criterios_desempate[3]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0 and not (pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado'))
        else 0 end) desc,
      -- 5. Diferencia de gol acertada
      count(pred.id) filter (
        where pa.estado = 'finalizado'
          and (pred.goles_local - pred.goles_visitante) = (pa.goles_local - pa.goles_visitante)
      ) desc,
      -- 6. Ganador / sentido 1X2 acertado
      count(pred.id) filter (
        where pa.estado = 'finalizado'
          and (case when pred.goles_local > pred.goles_visitante then 1
                    when pred.goles_local < pred.goles_visitante then -1 else 0 end)
            = (case when pa.goles_local > pa.goles_visitante then 1
                    when pa.goles_local < pa.goles_visitante then -1 else 0 end)
      ) desc,
      -- 7. Goles individuales acertados
      coalesce(sum(
        (case when pa.estado = 'finalizado' and pred.goles_local = pa.goles_local then 1 else 0 end)
        + (case when pa.estado = 'finalizado' and pred.goles_visitante = pa.goles_visitante then 1 else 0 end)
      ), 0) desc,
      -- 8. Quién dejó lista su quiniela primero
      max(pred.actualizado_en) asc nulls last,
      -- Salvaguarda técnica (no es criterio)
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
