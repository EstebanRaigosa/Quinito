-- Vista previa de un grupo por código (para la pantalla "unirse"). SECURITY
-- DEFINER porque el que busca aún NO es miembro (el RLS de tblParticipantes le
-- impediría contar). Solo expone datos públicos del grupo (sin PII).
create or replace function public.buscar_grupo(p_codigo text)
returns table (
  id uuid,
  nombre text,
  descripcion text,
  total_participantes bigint,
  valor_apuesta numeric,
  ya_es_miembro boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    g.id,
    g.nombre,
    g.descripcion,
    (select count(*) from public."tblParticipantes" pp where pp.grupo_id = g.id),
    coalesce(r.valor_apuesta, 0),
    exists (
      select 1 from public."tblParticipantes" pm
      where pm.grupo_id = g.id and pm.usuario_id = auth.uid()
    )
  from public."tblGrupos" g
  left join public."tblReglasGrupo" r on r.grupo_id = g.id
  where upper(g.codigo_invitacion) = upper(btrim(p_codigo))
  limit 1;
$$;

revoke execute on function public.buscar_grupo(text) from public, anon;
grant execute on function public.buscar_grupo(text) to authenticated;
