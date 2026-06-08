-- 1) Fijar search_path en la función de trigger (advisor: function_search_path_mutable)
create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- 2) Vistas de identidad → security_invoker: aplican el RLS del usuario que
--    consulta. Las 4 vistas de AGREGADOS anónimos se quedan como definer a
--    propósito (deben sumar predicciones que el usuario no ve individualmente
--    antes del cierre; solo exponen conteos/porcentajes, sin PII).
alter view public."vwTablaPosiciones"          set (security_invoker = on);
alter view public."vwPrediccionesGrupoPartido" set (security_invoker = on);

-- 3) Funciones de trigger: nadie debe poder invocarlas vía API (/rpc).
revoke execute on function public.handle_new_user()    from public, anon, authenticated;
revoke execute on function public.set_actualizado_en() from public, anon, authenticated;

-- 4) Helpers de RLS: quitar de anon y public; mantener en authenticated.
revoke execute on function public.es_miembro_grupo(uuid)      from public, anon;
revoke execute on function public.es_admin_grupo(uuid)        from public, anon;
revoke execute on function public.partido_cerrado(uuid, uuid) from public, anon;
grant  execute on function public.es_miembro_grupo(uuid)      to authenticated;
grant  execute on function public.es_admin_grupo(uuid)        to authenticated;
grant  execute on function public.partido_cerrado(uuid, uuid) to authenticated;
