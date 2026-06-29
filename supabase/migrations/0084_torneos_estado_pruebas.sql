-- ============================================================================
-- Visibilidad de torneos en 3 estados, controlada desde /admin/torneos:
--   • Disponible → activo = true,  es_prueba = false  → lo ven todos.
--   • Pruebas    → activo = false, es_prueba = true   → solo el superadmin,
--                  con etiqueta "Pruebas" en el wizard.
--   • Oculto     → activo = false, es_prueba = false  → no lo ve nadie.
--
-- Se conserva `activo` como "disponible públicamente" (todo el código que ya
-- filtra activo=true sigue válido) y se añade `es_prueba` para el modo de
-- prueba visible solo al superadmin. La combinación activo=true Y es_prueba=true
-- no tiene sentido (sería público y de prueba a la vez), por eso el CHECK.
-- ============================================================================

alter table public."tblTorneos"
  add column es_prueba boolean not null default false;

-- Restaura el significado histórico: hasta 0083 un torneo inactivo era de prueba
-- (lo veía solo el superadmin). Los inactivos actuales pasan a 'Pruebas'; el
-- superadmin puede moverlos a 'Oculto' desde el panel si lo prefiere.
update public."tblTorneos" set es_prueba = true where activo = false;

alter table public."tblTorneos"
  add constraint "tblTorneos_visibilidad_check" check (not (activo and es_prueba));

-- ----------------------------------------------------------------------------
-- torneos_disponibles(): activos para todos + de prueba solo para el superadmin.
-- Devuelve también `es_prueba` para que el wizard muestre la etiqueta "Pruebas".
-- Se hace DROP porque cambia el conjunto de columnas OUT (no basta REPLACE).
-- ----------------------------------------------------------------------------
drop function if exists public.torneos_disponibles();

create or replace function public.torneos_disponibles()
returns table (
  id uuid,
  codigo text,
  nombre text,
  pais_sede text,
  fecha_inicio date,
  fecha_fin date,
  activo boolean,
  es_prueba boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select t.id, t.codigo, t.nombre, t.pais_sede, t.fecha_inicio, t.fecha_fin,
         t.activo, t.es_prueba
  from public."tblTorneos" t
  where t.activo = true
     or (t.es_prueba = true and public.es_superadmin())
  order by t.creado_en;
$function$;

revoke all on function public.torneos_disponibles() from anon;
grant execute on function public.torneos_disponibles() to authenticated;
