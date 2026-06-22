-- 0070_desempate_visible.sql
--
-- Hace VISIBLES en el frontend los criterios de desempate "finos" que hasta ahora
-- solo se usaban dentro del ORDER BY del row_number() de vwTablaPosiciones pero
-- nunca se exponían como columnas. El objetivo es que la UI pueda explicar, ante
-- un empate de puntos, EXACTAMENTE qué criterio deja a un participante por encima
-- de otro (incluidos los criterios deportivos no configurables).
--
-- El orden REAL de desempate (idéntico al row_number, no cambia aquí) es:
--   1. puntos_totales
--   2-4. los 3 criterios configurables del grupo (exactos / unicas / aciertos)
--   5. diferencia de gol acertada      → nueva columna dif_gol_acertada
--   6. acierto de ganador (1X2)         → nueva columna ganador_acertado
--   7. goles individuales acertados     → nueva columna goles_individuales
--   8. quién guardó primero (tiempo)    → nueva columna ultima_edicion (menor = arriba)
--   9. p.id (salvaguarda técnica, NO es criterio de negocio, no se expone)
--
-- Cambios:
--   1. vwTablaPosiciones: misma definición de 0054 + 4 columnas nuevas AL FINAL
--      (create or replace view solo permite AGREGAR columnas al final; el resto
--      del SELECT y el ORDER BY quedan intactos → la tabla no cambia su orden).
--   2. grupo_detalle: misma definición de 0065 + esos 4 campos en cada fila de
--      `tabla` (el frontend los lee por nombre).

-- ── 1. Vista: expone los 4 criterios deportivos como columnas ───────────────
create or replace view public."vwTablaPosiciones" as
 SELECT p.grupo_id,
    p.id AS participante_id,
    prof.nombre_completo,
    prof.avatar_url,
    COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales + bonos.total_bonos AS puntos_totales,
    count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales AS aciertos,
    count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales AS marcadores_exactos,
    row_number() OVER (PARTITION BY p.grupo_id ORDER BY (COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales + bonos.total_bonos) DESC, (
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
    p.puntos_iniciales,
    bonos.total_bonos AS bonos_fase,
    -- ── Criterios de desempate finos, ahora expuestos para la UI ──────────────
    -- 5. diferencia de gol acertada (acertó el margen aunque no el marcador exacto)
    count(pred.id) FILTER (WHERE pa.estado = 'finalizado'::text AND (pred.goles_local - pred.goles_visitante) = (pa.goles_local - pa.goles_visitante)) AS dif_gol_acertada,
    -- 6. acierto de ganador / sentido 1X2 (local, empate o visitante)
    count(pred.id) FILTER (WHERE pa.estado = 'finalizado'::text AND
        CASE
            WHEN pred.goles_local > pred.goles_visitante THEN 1
            WHEN pred.goles_local < pred.goles_visitante THEN '-1'::integer
            ELSE 0
        END =
        CASE
            WHEN pa.goles_local > pa.goles_visitante THEN 1
            WHEN pa.goles_local < pa.goles_visitante THEN '-1'::integer
            ELSE 0
        END) AS ganador_acertado,
    -- 7. goles individuales acertados (1 si acertó goles local, +1 si acertó visitante)
    COALESCE(sum(
        CASE
            WHEN pa.estado = 'finalizado'::text AND pred.goles_local = pa.goles_local THEN 1
            ELSE 0
        END +
        CASE
            WHEN pa.estado = 'finalizado'::text AND pred.goles_visitante = pa.goles_visitante THEN 1
            ELSE 0
        END), 0::bigint) AS goles_individuales,
    -- 8. tiempo de la última edición de predicción (menor = guardó primero = arriba)
    max(pred.actualizado_en) AS ultima_edicion
   FROM "tblParticipantes" p
     JOIN "tblProfiles" prof ON prof.id = p.usuario_id
     JOIN "tblReglasGrupo" rg ON rg.grupo_id = p.grupo_id
     LEFT JOIN "tblPredicciones" pred ON pred.participante_id = p.id
     LEFT JOIN "tblPartidos" pa ON pa.id = pred.partido_id
     LEFT JOIN LATERAL (
       SELECT COALESCE(sum(bf.puntos), 0::bigint) AS total_bonos
       FROM "tblBonosFase" bf
       WHERE bf.participante_id = p.id
     ) bonos ON true
  WHERE es_miembro_grupo(p.grupo_id) AND p.eliminado_en IS NULL
  GROUP BY p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url, p.puntos_iniciales, p.exactos_iniciales, p.unicas_iniciales, p.aciertos_iniciales, rg.criterios_desempate, bonos.total_bonos;

alter view public."vwTablaPosiciones" set (security_invoker = off);

-- ── 2. grupo_detalle: agrega los 4 criterios finos a cada fila de `tabla` ────
-- Idéntica a 0065 salvo los 4 campos nuevos en el jsonb_build_object de `tabla`.
create or replace function public.grupo_detalle(p_grupo_id uuid)
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  with mi as (
    select id, rol
    from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid()
      and eliminado_en is null
    limit 1
  ),
  acc as (
    select
      (select id from mi)                                  as mi_id,
      coalesce((select rol = 'admin' from mi), false)
        or public.es_superadmin()                          as es_admin,
      exists (select 1 from mi) or public.es_superadmin()  as puede_ver
  )
  select case
    when not (select puede_ver from acc) then null::jsonb
    else jsonb_build_object(
      'miParticipanteId', (select mi_id from acc),
      'esAdmin', (select es_admin from acc),
      'grupo', (
        select jsonb_build_object(
          'id', g.id, 'nombre', g.nombre, 'descripcion', g.descripcion,
          'codigo_invitacion', g.codigo_invitacion, 'creador_id', g.creador_id,
          'creado_en', g.creado_en)
        from public."tblGrupos" g where g.id = p_grupo_id),
      'reglas', (
        select to_jsonb(r) from public."tblReglasGrupo" r where r.grupo_id = p_grupo_id),
      'participantes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id, 'rol', p.rol, 'pago_realizado', p.pago_realizado,
          'puntos_iniciales', p.puntos_iniciales,
          'exactos_iniciales', p.exactos_iniciales,
          'unicas_iniciales', p.unicas_iniciales,
          'aciertos_iniciales', p.aciertos_iniciales,
          'usuario', jsonb_build_object(
            'id', prof.id, 'nombre_completo', prof.nombre_completo,
            'email', case when (select es_admin from acc) then prof.email else null end,
            'avatar_url', prof.avatar_url)))
        from public."tblParticipantes" p
        join public."tblProfiles" prof on prof.id = p.usuario_id
        where p.grupo_id = p_grupo_id and p.eliminado_en is null), '[]'::jsonb),
      'tabla', coalesce((
        select jsonb_agg(jsonb_build_object(
          'participante_id', v.participante_id, 'posicion', v.posicion,
          'nombre_completo', v.nombre_completo, 'avatar_url', v.avatar_url,
          'puntos_totales', v.puntos_totales, 'aciertos', v.aciertos,
          'puntos_iniciales', v.puntos_iniciales,
          'marcadores_exactos', v.marcadores_exactos,
          'bonos_fase', v.bonos_fase,
          'unicas_acertadas', v.unicas_acertadas,
          'dif_gol_acertada', v.dif_gol_acertada,
          'ganador_acertado', v.ganador_acertado,
          'goles_individuales', v.goles_individuales,
          'ultima_edicion', v.ultima_edicion) order by v.posicion asc)
        from public."vwTablaPosiciones" v where v.grupo_id = p_grupo_id), '[]'::jsonb),
      'misBonosFase', coalesce((
        select jsonb_agg(jsonb_build_object('fase', bf.fase, 'puntos', bf.puntos))
        from public."tblBonosFase" bf
        where bf.participante_id = (select mi_id from acc)), '[]'::jsonb),
      'partidos', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pa.id, 'torneo_id', pa.torneo_id, 'numero_partido', pa.numero_partido,
          'fase', pa.fase, 'grupo', pa.grupo,
          'placeholder_local', pa.placeholder_local,
          'placeholder_visitante', pa.placeholder_visitante,
          'fecha_hora', pa.fecha_hora, 'estadio', pa.estadio, 'ciudad', pa.ciudad,
          'goles_local', pa.goles_local, 'goles_visitante', pa.goles_visitante,
          'penales_local', pa.penales_local, 'penales_visitante', pa.penales_visitante,
          'prorroga_local', pa.prorroga_local, 'prorroga_visitante', pa.prorroga_visitante,
          'tipo_definicion', pa.tipo_definicion,
          'equipo_avanza_id', pa.equipo_avanza_id,
          'estado', pa.estado,
          'equipo_local', case when el.id is null then null else jsonb_build_object(
            'id', el.id, 'nombre', el.nombre, 'codigo_iso', el.codigo_iso,
            'bandera_url', el.bandera_url, 'grupo', el.grupo) end,
          'equipo_visitante', case when ev.id is null then null else jsonb_build_object(
            'id', ev.id, 'nombre', ev.nombre, 'codigo_iso', ev.codigo_iso,
            'bandera_url', ev.bandera_url, 'grupo', ev.grupo) end
        ) order by pa.fecha_hora asc)
        from public."tblGrupoPartidos" gp
        join public."tblPartidos" pa on pa.id = gp.partido_id
        left join public."tblEquipos" el on el.id = pa.equipo_local_id
        left join public."tblEquipos" ev on ev.id = pa.equipo_visitante_id
        where gp.grupo_id = p_grupo_id), '[]'::jsonb),
      'misPredicciones', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pr.id, 'participante_id', pr.participante_id, 'partido_id', pr.partido_id,
          'goles_local', pr.goles_local, 'goles_visitante', pr.goles_visitante,
          'puntos_obtenidos', pr.puntos_obtenidos, 'prediccion_unica', pr.prediccion_unica,
          'equipo_avanza_id', pr.equipo_avanza_id))
        from public."tblPredicciones" pr
        where pr.participante_id = (select mi_id from acc)), '[]'::jsonb)
    )
  end;
$function$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;
