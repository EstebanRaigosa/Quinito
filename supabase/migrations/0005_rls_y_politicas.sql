-- ════════════════════════════════════════════════════════════════════════
-- Habilitar RLS en todas las tablas (deny-by-default).
-- ════════════════════════════════════════════════════════════════════════
alter table public."tblTorneos"        enable row level security;
alter table public."tblEquipos"        enable row level security;
alter table public."tblPartidos"       enable row level security;
alter table public."tblProfiles"       enable row level security;
alter table public."tblGrupos"         enable row level security;
alter table public."tblReglasGrupo"    enable row level security;
alter table public."tblGrupoPartidos"  enable row level security;
alter table public."tblParticipantes"  enable row level security;
alter table public."tblPredicciones"   enable row level security;

-- ── Catálogo: lectura para autenticados; escritura solo service_role ──────
create policy "torneos_select"  on public."tblTorneos"  for select to authenticated using (true);
create policy "equipos_select"  on public."tblEquipos"  for select to authenticated using (true);
create policy "partidos_select" on public."tblPartidos" for select to authenticated using (true);

-- ── Perfiles: el propio + los de compañeros de grupo ─────────────────────
create policy "profiles_select" on public."tblProfiles"
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public."tblParticipantes" p1
    join public."tblParticipantes" p2 on p1.grupo_id = p2.grupo_id
    where p1.usuario_id = auth.uid() and p2.usuario_id = "tblProfiles".id
  )
);

create policy "profiles_insert" on public."tblProfiles"
for insert to authenticated with check (id = auth.uid());

create policy "profiles_update" on public."tblProfiles"
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── Grupos: lectura por autenticados (buscar por código); escritura creador ──
create policy "grupos_select" on public."tblGrupos"
for select to authenticated using (true);

create policy "grupos_insert" on public."tblGrupos"
for insert to authenticated with check (creador_id = auth.uid());

create policy "grupos_update" on public."tblGrupos"
for update to authenticated using (creador_id = auth.uid()) with check (creador_id = auth.uid());

create policy "grupos_delete" on public."tblGrupos"
for delete to authenticated using (creador_id = auth.uid());

-- ── Reglas: lectura por autenticados; escritura por admin del grupo ──────
create policy "reglas_select" on public."tblReglasGrupo"
for select to authenticated using (true);

create policy "reglas_insert" on public."tblReglasGrupo"
for insert to authenticated
with check (es_admin_grupo(grupo_id) or exists (
  select 1 from public."tblGrupos" g where g.id = grupo_id and g.creador_id = auth.uid()
));

create policy "reglas_update" on public."tblReglasGrupo"
for update to authenticated using (es_admin_grupo(grupo_id)) with check (es_admin_grupo(grupo_id));

-- ── Partidos del grupo: lectura por miembros; escritura por admin ────────
create policy "grupopartidos_select" on public."tblGrupoPartidos"
for select to authenticated using (es_miembro_grupo(grupo_id));

create policy "grupopartidos_insert" on public."tblGrupoPartidos"
for insert to authenticated
with check (es_admin_grupo(grupo_id) or exists (
  select 1 from public."tblGrupos" g where g.id = grupo_id and g.creador_id = auth.uid()
));

create policy "grupopartidos_delete" on public."tblGrupoPartidos"
for delete to authenticated using (es_admin_grupo(grupo_id));

-- ── Participantes: lectura miembros; auto-inscripción; admin edita; salida propia ──
create policy "participantes_select" on public."tblParticipantes"
for select to authenticated using (es_miembro_grupo(grupo_id));

create policy "participantes_insert" on public."tblParticipantes"
for insert to authenticated with check (usuario_id = auth.uid());

create policy "participantes_update" on public."tblParticipantes"
for update to authenticated using (es_admin_grupo(grupo_id)) with check (es_admin_grupo(grupo_id));

create policy "participantes_delete" on public."tblParticipantes"
for delete to authenticated using (usuario_id = auth.uid() or es_admin_grupo(grupo_id));

-- ════════════════════════════════════════════════════════════════════════
-- Predicciones — el núcleo de la privacidad.
-- ════════════════════════════════════════════════════════════════════════

-- SELECT: las propias siempre; las de compañeros SOLO tras el cierre.
create policy "predicciones_select" on public."tblPredicciones"
for select to authenticated
using (
  exists (
    select 1 from public."tblParticipantes" pa
    where pa.id = participante_id and pa.usuario_id = auth.uid()
  )
  or exists (
    select 1 from public."tblParticipantes" pa
    where pa.id = participante_id
      and es_miembro_grupo(pa.grupo_id)
      and partido_cerrado("tblPredicciones".partido_id, pa.grupo_id)
  )
);

-- INSERT: solo propias y solo mientras la ventana esté abierta.
create policy "predicciones_insert" on public."tblPredicciones"
for insert to authenticated
with check (
  exists (
    select 1 from public."tblParticipantes" pa
    where pa.id = participante_id and pa.usuario_id = auth.uid()
  )
  and not partido_cerrado(
    partido_id,
    (select grupo_id from public."tblParticipantes" where id = participante_id)
  )
);

-- UPDATE: solo propias y solo antes del cierre.
create policy "predicciones_update" on public."tblPredicciones"
for update to authenticated
using (
  exists (
    select 1 from public."tblParticipantes" pa
    where pa.id = participante_id and pa.usuario_id = auth.uid()
  )
  and not partido_cerrado(
    partido_id,
    (select grupo_id from public."tblParticipantes" where id = participante_id)
  )
)
with check (
  exists (
    select 1 from public."tblParticipantes" pa
    where pa.id = participante_id and pa.usuario_id = auth.uid()
  )
);

-- DELETE: solo propias y solo antes del cierre.
create policy "predicciones_delete" on public."tblPredicciones"
for delete to authenticated
using (
  exists (
    select 1 from public."tblParticipantes" pa
    where pa.id = participante_id and pa.usuario_id = auth.uid()
  )
  and not partido_cerrado(
    partido_id,
    (select grupo_id from public."tblParticipantes" where id = participante_id)
  )
);

-- Grants a nivel columna: el usuario solo puede escribir el marcador.
-- puntos_obtenidos y prediccion_unica los calcula el sistema (service_role).
revoke insert, update on public."tblPredicciones" from authenticated;
grant insert (participante_id, partido_id, goles_local, goles_visitante)
  on public."tblPredicciones" to authenticated;
grant update (goles_local, goles_visitante)
  on public."tblPredicciones" to authenticated;
