-- 0066_predicciones_grupo_creado_en.sql
--
-- Expone `creado_en` (instante en que se creó la predicción) en
-- vwPrediccionesGrupoPartido para poder ordenar la lista nominal de cada
-- marcador por "quién apostó primero" en las estadísticas del partido.
-- Idéntica a 0043 salvo la columna agregada. Se re-aplica security_invoker.
create or replace view public."vwPrediccionesGrupoPartido" as
 SELECT p.grupo_id,
    pred.partido_id,
    p.id AS participante_id,
    prof.id AS usuario_id,
    prof.nombre_completo,
    prof.avatar_url,
    pred.goles_local,
    pred.goles_visitante,
    pred.puntos_obtenidos,
    pred.prediccion_unica,
    pred.creado_en
   FROM "tblPredicciones" pred
     JOIN "tblParticipantes" p ON p.id = pred.participante_id
     JOIN "tblProfiles" prof ON prof.id = p.usuario_id
  WHERE es_miembro_grupo(p.grupo_id) AND p.eliminado_en IS NULL
    AND partido_cerrado(pred.partido_id, p.grupo_id);

alter view public."vwPrediccionesGrupoPartido" set (security_invoker = on);
