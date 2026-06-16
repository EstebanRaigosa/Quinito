-- 0048_aciertos_excluye_exactos_regresion.sql
--
-- Restaura la corrección de la 0034, que se PERDIÓ en la 0045.
--
-- La 0034 dejó claro que un "acierto" y un "marcador exacto" son cosas
-- distintas: `aciertos` debe contar SOLO los aciertos PARCIALES (predicciones
-- que sumaron algún punto —ganador 1X2, gol local y/o visitante acertado— pero
-- que NO fueron marcador exacto). Así `aciertos` y `marcadores_exactos` quedan
-- como conjuntos disjuntos, sin doble conteo.
--
-- La 0045 (arranque de desempate) recreó la vista partiendo de la 0043 y volvió
-- a contar `aciertos` como `puntos_obtenidos > 0` a secas. Como un marcador
-- exacto SIEMPRE suma puntos, quedaba contado también como acierto parcial:
-- la columna "Aciertos" de la tabla de posiciones inflaba los exactos.
--
-- Este cambio reaplica el filtro de la 0034 sobre la vista de la 0045
-- (conservando los arranques *_iniciales). Afecta a:
--   * la columna de salida `aciertos`, y
--   * el criterio de desempate configurable 'aciertos' (los 3 CASE del ORDER BY).
-- Idéntica a la 0045 salvo esas 4 ocurrencias del filtro de aciertos.

create or replace view public."vwTablaPosiciones" as
 SELECT p.grupo_id,
    p.id AS participante_id,
    prof.nombre_completo,
    prof.avatar_url,
    COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales AS puntos_totales,
    count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales AS aciertos,
    count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales AS marcadores_exactos,
    row_number() OVER (PARTITION BY p.grupo_id ORDER BY (COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales) DESC, (
        CASE rg.criterios_desempate[1]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales
            ELSE 0::bigint
        END) DESC, (
        CASE rg.criterios_desempate[2]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales
            ELSE 0::bigint
        END) DESC, (
        CASE rg.criterios_desempate[3]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales
            ELSE 0::bigint
        END) DESC, (count(pred.id) FILTER (WHERE pa.estado = 'finalizado'::text AND (pred.goles_local - pred.goles_visitante) = (pa.goles_local - pa.goles_visitante))) DESC, (count(pred.id) FILTER (WHERE pa.estado = 'finalizado'::text AND
        CASE
            WHEN pred.goles_local > pred.goles_visitante THEN 1
            WHEN pred.goles_local < pred.goles_visitante THEN '-1'::integer
            ELSE 0
        END =
        CASE
            WHEN pa.goles_local > pa.goles_visitante THEN 1
            WHEN pa.goles_local < pa.goles_visitante THEN '-1'::integer
            ELSE 0
        END)) DESC, (COALESCE(sum(
        CASE
            WHEN pa.estado = 'finalizado'::text AND pred.goles_local = pa.goles_local THEN 1
            ELSE 0
        END +
        CASE
            WHEN pa.estado = 'finalizado'::text AND pred.goles_visitante = pa.goles_visitante THEN 1
            ELSE 0
        END), 0::bigint)) DESC, (max(pred.actualizado_en)), p.id) AS posicion,
    count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales AS unicas_acertadas,
    p.puntos_iniciales
   FROM "tblParticipantes" p
     JOIN "tblProfiles" prof ON prof.id = p.usuario_id
     JOIN "tblReglasGrupo" rg ON rg.grupo_id = p.grupo_id
     LEFT JOIN "tblPredicciones" pred ON pred.participante_id = p.id
     LEFT JOIN "tblPartidos" pa ON pa.id = pred.partido_id
  WHERE es_miembro_grupo(p.grupo_id) AND p.eliminado_en IS NULL
  GROUP BY p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url, p.puntos_iniciales, p.exactos_iniciales, p.unicas_iniciales, p.aciertos_iniciales, rg.criterios_desempate;

alter view public."vwTablaPosiciones" set (security_invoker = off);
