-- 0067_rls_initplan_auth_uid.sql
--
-- Optimización de rendimiento de RLS (advisor `auth_rls_initplan`).
--
-- PROBLEMA: `auth.uid()` sin envolver se reevalúa POR FILA en cada política y
-- función. En tblPredicciones (la tabla más grande y la del modelo de
-- privacidad) eso se multiplica con el volumen del Mundial. Envolverlo en
-- `(select auth.uid())` permite que el planner lo evalúe UNA vez por query
-- (InitPlan) en lugar de una vez por fila.
--
-- GARANTÍA: la transformación es SEMÁNTICAMENTE IDÉNTICA — mismas filas
-- visibles, mismas reglas de privacidad. Solo cambia cuántas veces se evalúa la
-- expresión. Las políticas se modifican con ALTER POLICY (sin ventana sin
-- política). Las definiciones se reconstruyeron desde el estado vivo de la BD.

-- ── Funciones helper (SECURITY DEFINER STABLE) ───────────────────────────────
-- Idénticas salvo `auth.uid()` → `(select auth.uid())`. `partido_cerrado` no usa
-- auth.uid(), no se toca.

create or replace function public.es_superadmin()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1
    from public."tblSuperadmins" s
    join auth.users u on lower(u.email) = lower(s.email)
    where u.id = (select auth.uid())
  );
$function$;

create or replace function public.es_miembro_grupo(p_grupo_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select public.es_superadmin() or exists (
    select 1 from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = (select auth.uid())
      and eliminado_en is null
  );
$function$;

create or replace function public.es_admin_grupo(p_grupo_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select public.es_superadmin() or exists (
    select 1 from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = (select auth.uid()) and rol = 'admin'
  );
$function$;

-- ── Políticas con auth.uid() directo ─────────────────────────────────────────

-- tblGrupos
alter policy grupos_delete on public."tblGrupos"
  using (creador_id = (select auth.uid()));
alter policy grupos_insert on public."tblGrupos"
  with check (creador_id = (select auth.uid()));
alter policy grupos_update on public."tblGrupos"
  using (creador_id = (select auth.uid()))
  with check (creador_id = (select auth.uid()));

-- tblGrupoPartidos
alter policy grupopartidos_insert on public."tblGrupoPartidos"
  with check (
    es_admin_grupo(grupo_id) or exists (
      select 1 from public."tblGrupos" g
      where g.id = "tblGrupoPartidos".grupo_id and g.creador_id = (select auth.uid())
    )
  );

-- tblParticipantes
alter policy participantes_delete on public."tblParticipantes"
  using ((usuario_id = (select auth.uid())) or es_admin_grupo(grupo_id));
alter policy participantes_insert on public."tblParticipantes"
  with check (usuario_id = (select auth.uid()));

-- tblPredicciones (modelo de privacidad — máximo cuidado)
alter policy predicciones_select on public."tblPredicciones"
  using (
    (exists (
      select 1 from public."tblParticipantes" pa
      where pa.id = "tblPredicciones".participante_id
        and pa.usuario_id = (select auth.uid())
    ))
    or
    (exists (
      select 1 from public."tblParticipantes" pa
      where pa.id = "tblPredicciones".participante_id
        and es_miembro_grupo(pa.grupo_id)
        and partido_cerrado("tblPredicciones".partido_id, pa.grupo_id)
    ))
  );

alter policy predicciones_insert on public."tblPredicciones"
  with check (
    (exists (
      select 1 from public."tblParticipantes" pa
      where pa.id = "tblPredicciones".participante_id
        and pa.usuario_id = (select auth.uid())
    ))
    and (not partido_cerrado(partido_id, (
      select "tblParticipantes".grupo_id from public."tblParticipantes"
      where "tblParticipantes".id = "tblPredicciones".participante_id
    )))
  );

alter policy predicciones_delete on public."tblPredicciones"
  using (
    (exists (
      select 1 from public."tblParticipantes" pa
      where pa.id = "tblPredicciones".participante_id
        and pa.usuario_id = (select auth.uid())
    ))
    and (not partido_cerrado(partido_id, (
      select "tblParticipantes".grupo_id from public."tblParticipantes"
      where "tblParticipantes".id = "tblPredicciones".participante_id
    )))
  );

alter policy predicciones_update on public."tblPredicciones"
  using (
    (exists (
      select 1 from public."tblParticipantes" pa
      where pa.id = "tblPredicciones".participante_id
        and pa.usuario_id = (select auth.uid())
    ))
    and (not partido_cerrado(partido_id, (
      select "tblParticipantes".grupo_id from public."tblParticipantes"
      where "tblParticipantes".id = "tblPredicciones".participante_id
    )))
  )
  with check (
    exists (
      select 1 from public."tblParticipantes" pa
      where pa.id = "tblPredicciones".participante_id
        and pa.usuario_id = (select auth.uid())
    )
  );

-- tblProfiles
alter policy profiles_insert on public."tblProfiles"
  with check (id = (select auth.uid()));
alter policy profiles_select on public."tblProfiles"
  using (
    (id = (select auth.uid()))
    or es_superadmin()
    or exists (
      select 1
      from public."tblParticipantes" p1
      join public."tblParticipantes" p2 on p1.grupo_id = p2.grupo_id
      where p1.usuario_id = (select auth.uid()) and p2.usuario_id = "tblProfiles".id
    )
  );
alter policy profiles_update on public."tblProfiles"
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- tblPushSuscripciones
alter policy push_delete_propias on public."tblPushSuscripciones"
  using (usuario_id = (select auth.uid()));
alter policy push_insert_propias on public."tblPushSuscripciones"
  with check (usuario_id = (select auth.uid()));
alter policy push_select_propias on public."tblPushSuscripciones"
  using (usuario_id = (select auth.uid()));
alter policy push_update_propias on public."tblPushSuscripciones"
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- tblReglasGrupo
alter policy reglas_insert on public."tblReglasGrupo"
  with check (
    es_admin_grupo(grupo_id) or exists (
      select 1 from public."tblGrupos" g
      where g.id = "tblReglasGrupo".grupo_id and g.creador_id = (select auth.uid())
    )
  );

-- tblSesionesActivas
alter policy "sesion propia" on public."tblSesionesActivas"
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
