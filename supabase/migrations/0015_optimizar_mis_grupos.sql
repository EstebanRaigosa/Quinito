-- ════════════════════════════════════════════════════════════════════════
-- Optimización del RPC `mis_grupos` (dashboard).
--
-- Antes: por cada grupo del usuario se hacían DOS `left join lateral` contra
-- la vista pesada `vwTablaPosiciones` (una para mi fila, otra para el líder).
-- Como la vista agrega todas las predicciones de todos los participantes del
-- grupo, materializarla dos veces por grupo duplicaba el costo.
--
-- Ahora: un único `left join lateral` lee la vista UNA vez por grupo y extrae
-- de esa misma pasada tanto mi posición como el nombre del líder. Mismo
-- resultado, misma seguridad (sigue siendo `security invoker` y la vista se
-- auto-filtra con `es_miembro_grupo`), ~50% menos trabajo en el dashboard.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.mis_grupos()
returns table (
  id uuid,
  nombre text,
  descripcion text,
  codigo_invitacion text,
  creador_id uuid,
  torneo_id uuid,
  torneo_codigo text,
  torneo_nombre text,
  torneo_pais_sede text,
  torneo_fecha_inicio date,
  torneo_fecha_fin date,
  torneo_activo boolean,
  total_participantes bigint,
  mi_posicion int,
  mis_puntos bigint,
  mis_aciertos bigint,
  mis_exactos bigint,
  valor_apuesta numeric,
  lider_nombre text
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    g.id, g.nombre, g.descripcion, g.codigo_invitacion, g.creador_id,
    t.id, t.codigo, t.nombre, t.pais_sede, t.fecha_inicio, t.fecha_fin, t.activo,
    (select count(*) from public."tblParticipantes" pp where pp.grupo_id = g.id),
    pos.mi_posicion,
    coalesce(pos.mis_puntos, 0)::bigint,
    coalesce(pos.mis_aciertos, 0)::bigint,
    coalesce(pos.mis_exactos, 0)::bigint,
    r.valor_apuesta,
    pos.lider_nombre
  from public."tblParticipantes" p
  join public."tblGrupos" g on g.id = p.grupo_id
  join public."tblTorneos" t on t.id = g.torneo_id
  left join public."tblReglasGrupo" r on r.grupo_id = g.id
  -- Una sola pasada por la vista por grupo: mi fila + el líder salen de aquí.
  left join lateral (
    select
      max(v.posicion) filter (where v.participante_id = p.id)::int          as mi_posicion,
      max(v.puntos_totales) filter (where v.participante_id = p.id)         as mis_puntos,
      max(v.aciertos) filter (where v.participante_id = p.id)               as mis_aciertos,
      max(v.marcadores_exactos) filter (where v.participante_id = p.id)     as mis_exactos,
      (array_agg(v.nombre_completo order by v.posicion asc))[1]             as lider_nombre
    from public."vwTablaPosiciones" v
    where v.grupo_id = g.id
  ) pos on true
  where p.usuario_id = auth.uid()
  order by g.creado_en desc;
$$;

revoke execute on function public.mis_grupos() from public, anon;
grant execute on function public.mis_grupos() to authenticated;
