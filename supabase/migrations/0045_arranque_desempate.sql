-- 0045_arranque_desempate.sql
--
-- Completa el "arranque" al migrar una polla a mitad de torneo (ver 0041).
--
-- Hasta ahora el arranque solo cargaba `puntos_iniciales` (el acumulado de
-- Excel/otra app). Pero el DESEMPATE usa contadores deportivos (marcadores
-- exactos, predicciones únicas y aciertos) que arrancaban en 0 para quien
-- migró, aunque su puntaje sí viniera cargado → el desempate quedaba injusto
-- con los que ya traían historial.
--
-- Este cambio agrega tres "arranques de desempate" que el admin carga junto al
-- puntaje, y que la tabla de posiciones SUMA tanto al mostrar como al ordenar:
--   * exactos_iniciales   → se suma a marcadores_exactos  (criterio 'exactos')
--   * unicas_iniciales     → se suma a unicas_acertadas    (criterio 'unicas')
--   * aciertos_iniciales   → se suma a aciertos            (criterio 'aciertos')
--
-- Los criterios finos siempre-activos (diferencia de gol, 1X2, goles
-- individuales, tiempo de edición) siguen reflejando SOLO lo jugado dentro de la
-- app: nadie los reconstruye desde un Excel y no son configurables por el grupo.
--
-- Cambios:
--   1. Tres columnas *_iniciales en tblParticipantes (default 0).
--   2. vwTablaPosiciones suma cada inicial a su contador, en la columna de
--      salida y en el CASE del criterio configurable correspondiente.
--   3. actualizar_puntos_iniciales pasa a recibir los tres contadores.
--   4. grupo_detalle expone los tres iniciales en `participantes` (para
--      precargar el diálogo de arranque).

-- ── 1. Columnas ─────────────────────────────────────────────────────────────
alter table public."tblParticipantes"
  add column exactos_iniciales  int not null default 0,
  add column unicas_iniciales   int not null default 0,
  add column aciertos_iniciales int not null default 0;

comment on column public."tblParticipantes".exactos_iniciales is
  'Arranque de desempate: marcadores exactos acertados antes de migrar. Se suma en vwTablaPosiciones.';
comment on column public."tblParticipantes".unicas_iniciales is
  'Arranque de desempate: predicciones únicas acertadas antes de migrar. Se suma en vwTablaPosiciones.';
comment on column public."tblParticipantes".aciertos_iniciales is
  'Arranque de desempate: otros aciertos (ganador/goles) antes de migrar. Se suma en vwTablaPosiciones.';

-- ── 2. Vista de posiciones (suma los arranques de desempate) ────────────────
-- Idéntica a 0043 salvo: cada contador de desempate ahora suma su columna
-- inicial, tanto en la columna de salida como en los CASE del row_number().
-- `create or replace view` no permite reordenar columnas: los iniciales nuevos
-- se exponen AL FINAL (el código los lee por nombre, el orden es irrelevante).
create or replace view public."vwTablaPosiciones" as
 SELECT p.grupo_id,
    p.id AS participante_id,
    prof.nombre_completo,
    prof.avatar_url,
    COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales AS puntos_totales,
    count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0) + p.aciertos_iniciales AS aciertos,
    count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales AS marcadores_exactos,
    row_number() OVER (PARTITION BY p.grupo_id ORDER BY (COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales) DESC, (
        CASE rg.criterios_desempate[1]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0) + p.aciertos_iniciales
            ELSE 0::bigint
        END) DESC, (
        CASE rg.criterios_desempate[2]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0) + p.aciertos_iniciales
            ELSE 0::bigint
        END) DESC, (
        CASE rg.criterios_desempate[3]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0) + p.aciertos_iniciales
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

-- ── 3. RPC: editar arranque completo (solo admin del grupo) ─────────────────
-- Cambia la firma (de 2 a 5 args): se elimina la versión anterior para no dejar
-- una sobrecarga huérfana que cause ambigüedad al llamar por nombre.
drop function if exists public.actualizar_puntos_iniciales(uuid, int);

create function public.actualizar_puntos_iniciales(
  p_participante_id uuid,
  p_puntos          int,
  p_exactos         int default 0,
  p_unicas          int default 0,
  p_aciertos        int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
begin
  select grupo_id into v_grupo_id
  from public."tblParticipantes"
  where id = p_participante_id and eliminado_en is null;

  if v_grupo_id is null then
    raise exception 'El participante no existe';
  end if;

  -- Solo el admin del grupo puede ajustar el arranque.
  if not public.es_admin_grupo(v_grupo_id) then
    raise exception 'Solo el administrador puede ajustar el puntaje inicial';
  end if;

  if p_puntos < 0 or p_exactos < 0 or p_unicas < 0 or p_aciertos < 0 then
    raise exception 'Los valores de arranque no pueden ser negativos';
  end if;

  update public."tblParticipantes"
    set puntos_iniciales   = p_puntos,
        exactos_iniciales  = p_exactos,
        unicas_iniciales   = p_unicas,
        aciertos_iniciales = p_aciertos
  where id = p_participante_id;
end;
$$;

revoke execute on function public.actualizar_puntos_iniciales(uuid, int, int, int, int) from public, anon;
grant  execute on function public.actualizar_puntos_iniciales(uuid, int, int, int, int) to authenticated;

-- ── 4. grupo_detalle expone los iniciales de desempate en participantes ─────
-- Idéntica a 0043 salvo los tres campos nuevos en el objeto de participantes.
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
          'codigo_invitacion', g.codigo_invitacion, 'creador_id', g.creador_id)
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
          'unicas_acertadas', v.unicas_acertadas) order by v.posicion asc)
        from public."vwTablaPosiciones" v where v.grupo_id = p_grupo_id), '[]'::jsonb),
      'partidos', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pa.id, 'torneo_id', pa.torneo_id, 'numero_partido', pa.numero_partido,
          'fase', pa.fase, 'grupo', pa.grupo,
          'placeholder_local', pa.placeholder_local,
          'placeholder_visitante', pa.placeholder_visitante,
          'fecha_hora', pa.fecha_hora, 'estadio', pa.estadio, 'ciudad', pa.ciudad,
          'goles_local', pa.goles_local, 'goles_visitante', pa.goles_visitante,
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
          'puntos_obtenidos', pr.puntos_obtenidos, 'prediccion_unica', pr.prediccion_unica))
        from public."tblPredicciones" pr
        where pr.participante_id = (select mi_id from acc)), '[]'::jsonb)
    )
  end;
$function$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;
