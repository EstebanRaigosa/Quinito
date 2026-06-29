-- ============================================================================
-- vwPrediccionesGrupoPartido: exponer `equipo_avanza_id` de cada predicción.
--
-- En fases eliminatorias, si el usuario predijo EMPATE en los 90', además marcó
-- qué equipo avanza (penales/prórroga). La UI "Por persona" del detalle de un
-- partido necesita ese dato para mostrar a quién marcó cada quien para pasar.
-- Solo se añade una columna al final (CREATE OR REPLACE seguro). La privacidad
-- sigue intacta: la vista solo devuelve filas tras el cierre del partido.
-- ============================================================================
create or replace view public."vwPrediccionesGrupoPartido" as
  select p.grupo_id,
    pred.partido_id,
    p.id as participante_id,
    prof.id as usuario_id,
    prof.nombre_completo,
    prof.avatar_url,
    pred.goles_local,
    pred.goles_visitante,
    pred.puntos_obtenidos,
    pred.prediccion_unica,
    pred.creado_en,
    pred.equipo_avanza_id
  from public."tblPredicciones" pred
    join public."tblParticipantes" p on p.id = pred.participante_id
    join public."tblProfiles" prof on prof.id = p.usuario_id
  where public.es_miembro_grupo(p.grupo_id)
    and p.eliminado_en is null
    and public.partido_cerrado(pred.partido_id, p.grupo_id);
