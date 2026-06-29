-- ============================================================================
-- torneos_disponibles(): el wizard de creación de pollas muestra SOLO los
-- torneos activos, para TODOS los usuarios (incluido el superadmin).
--
-- Antes (0057), la RPC hacía una excepción: al superadmin le mostraba también
-- los torneos con activo=false (de prueba). Ahora el catálogo se controla desde
-- el panel admin (/admin/torneos) con un toggle por torneo, así que la única
-- fuente de verdad de "qué aparece en el wizard" es la columna `activo`. Se
-- elimina la excepción `or es_superadmin()`: lo activo se ve, lo inactivo no,
-- sin distinción de rol.
--
-- El superadmin sigue viendo y gestionando TODOS los torneos en el panel admin
-- (que lee con service_role, sin pasar por esta RPC).
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
  where t.activo = true
  order by t.creado_en;
$function$;

revoke all on function public.torneos_disponibles() from anon;
grant execute on function public.torneos_disponibles() to authenticated;
