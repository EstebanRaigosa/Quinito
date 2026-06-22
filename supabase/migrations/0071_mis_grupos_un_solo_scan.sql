-- ════════════════════════════════════════════════════════════════════════
-- mis_grupos: optimización de carga del dashboard (lista de pollas).
--
-- Antes (0009) el RPC hacía DOS LATERAL joins a "vwTablaPosiciones" por cada
-- polla del usuario:
--   1) pos   → mi fila (participante_id = p.id)
--   2) lider → el primer lugar (posicion = 1)
-- El planner no las fusiona (condiciones distintas), así que la vista —la
-- consulta más cara del sistema: recorre participantes + todas sus
-- predicciones + partidos y calcula rank()— se evaluaba 2x por polla.
--
-- Ahora se hace UN SOLO LATERAL que recorre la vista una vez por polla y de
-- ahí extrae mi fila (agregación condicional con filter) y el líder
-- (array_agg ordenado por posición, primer elemento = posición 1).
-- Resultado idéntico al original; mitad de evaluaciones de la vista.
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
    pos.mi_posicion::int,
    coalesce(pos.mis_puntos, 0)::bigint,
    coalesce(pos.mis_aciertos, 0)::bigint,
    coalesce(pos.mis_exactos, 0)::bigint,
    r.valor_apuesta,
    pos.lider_nombre
  from public."tblParticipantes" p
  join public."tblGrupos" g on g.id = p.grupo_id
  join public."tblTorneos" t on t.id = g.torneo_id
  left join public."tblReglasGrupo" r on r.grupo_id = g.id
  left join lateral (
    select
      max(v.posicion)           filter (where v.participante_id = p.id) as mi_posicion,
      max(v.puntos_totales)     filter (where v.participante_id = p.id) as mis_puntos,
      max(v.aciertos)           filter (where v.participante_id = p.id) as mis_aciertos,
      max(v.marcadores_exactos) filter (where v.participante_id = p.id) as mis_exactos,
      (array_agg(v.nombre_completo order by v.posicion asc))[1]         as lider_nombre
    from public."vwTablaPosiciones" v
    where v.grupo_id = g.id
  ) pos on true
  where p.usuario_id = auth.uid()
  order by g.creado_en desc;
$$;

revoke execute on function public.mis_grupos() from public, anon;
grant execute on function public.mis_grupos() to authenticated;
