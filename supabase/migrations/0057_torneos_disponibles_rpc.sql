-- ============================================================================
-- torneos_disponibles(): catálogo de torneos seleccionables por el usuario.
--
-- Regla de visibilidad: los torneos con activo=false NO se muestran a usuarios
-- normales (sirven como torneos de PRUEBA del superadmin). El superadmin de
-- plataforma (tblSuperadmins, vía es_superadmin()) sí los ve, para poder crear
-- pollas de prueba y cargar marcadores antes de publicarlos.
--
-- Antes, las queries de la app filtraban .eq('activo', true) en cliente/servidor;
-- esto centraliza la decisión en la BD para que cliente y servidor coincidan sin
-- exponer la lista de superadmins (SUPERADMIN_EMAILS) al navegador.
-- ============================================================================

create or replace function public.torneos_disponibles()
returns table (
  id uuid,
  codigo text,
  nombre text,
  pais_sede text,
  fecha_inicio date,
  fecha_fin date,
  activo boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select t.id, t.codigo, t.nombre, t.pais_sede, t.fecha_inicio, t.fecha_fin, t.activo
  from public."tblTorneos" t
  where t.activo = true or public.es_superadmin()
  order by t.creado_en;
$function$;

revoke all on function public.torneos_disponibles() from anon;
grant execute on function public.torneos_disponibles() to authenticated;
