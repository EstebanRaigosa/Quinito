-- 0069_revocar_rpcs_admin_anon.sql
--
-- Seguridad (advisor `anon_security_definer_function_executable`): varias RPC
-- SECURITY DEFINER de MUTACIÓN administrativa eran ejecutables por los roles
-- `anon` y `authenticated` vía /rest/v1/rpc, y NO validan rol internamente. Un
-- usuario cualquiera podía, por ejemplo, revertir un partido o forzar el ganador.
--
-- La app legítima las llama SOLO desde server actions con el cliente
-- `service_role` (lib/supabase/admin.ts), que bypassa estos grants. Por eso
-- revocar EXECUTE a anon/authenticated NO afecta el panel de admin. Las llamadas
-- internas desde otras funciones SECURITY DEFINER tampoco se ven afectadas
-- (corren como el owner, no como el rol del invocador).

revoke execute on function public.clasificacion_terceros(uuid) from anon, authenticated;
revoke execute on function public.ganador_partido(uuid, integer, boolean) from anon, authenticated;
revoke execute on function public.mejores_terceros(uuid) from anon, authenticated;
revoke execute on function public.resolver_cruces(uuid) from anon, authenticated;
revoke execute on function public.resolver_placeholder(uuid, text) from anon, authenticated;
revoke execute on function public.revertir_partido(uuid) from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
