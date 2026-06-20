-- 0068_indice_cobertura_predicciones.sql
--
-- Índice de cobertura para la agregación por participante de `vwTablaPosiciones`
-- (la usan grupo_detalle, mis_grupos, posiciones_grupo/admin e inicio_extras).
--
-- PROBLEMA: la vista arranca con un Seq Scan de TODA `tblPredicciones` de la
-- plataforma y luego descarta por participante (Hash Right Join). Con el volumen
-- del Mundial eso lee cientos de miles de filas en cada carga de cada grupo.
--
-- SOLUCIÓN: índice por `participante_id` que INCLUYE las columnas agregadas, para
-- que el planner haga un scan dirigido / index-only en vez del seq scan. Un
-- índice NUNCA cambia un resultado, solo lo encuentra más rápido.
--
-- Tabla pequeña hoy → CREATE INDEX normal bloquea milisegundos. Si en el futuro
-- la tabla es grande y se recrea, usar CREATE INDEX CONCURRENTLY en su propia
-- migración (no puede ir en transacción).

create index if not exists "idxPrediccionesParticipanteCalc"
  on public."tblPredicciones" (participante_id)
  include (
    partido_id,
    goles_local,
    goles_visitante,
    puntos_obtenidos,
    prediccion_unica,
    equipo_avanza_id,
    actualizado_en
  );
