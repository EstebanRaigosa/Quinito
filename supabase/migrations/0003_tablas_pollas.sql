-- ── Grupos (pollas / quinielas) ───────────────────────────────────────────
create table public."tblGrupos" (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  torneo_id uuid not null references public."tblTorneos"(id) on delete restrict,
  codigo_invitacion text not null unique,
  creador_id uuid not null references public."tblProfiles"(id) on delete restrict,
  creado_en timestamptz default now() not null,
  actualizado_en timestamptz default now() not null
);

create index "idxGruposCreador" on public."tblGrupos" (creador_id);
create index "idxGruposTorneo"  on public."tblGrupos" (torneo_id);

create trigger "trgGruposActualizado"
  before update on public."tblGrupos"
  for each row execute function public.set_actualizado_en();

-- ── Reglas de puntuación (1-1 con grupo) ──────────────────────────────────
create table public."tblReglasGrupo" (
  grupo_id uuid primary key references public."tblGrupos"(id) on delete cascade,
  pts_marcador_exacto int not null default 5 check (pts_marcador_exacto >= 0),
  pts_ganador int not null default 2 check (pts_ganador >= 0),
  pts_gol_acertado int not null default 1 check (pts_gol_acertado >= 0),
  pts_prediccion_unica int not null default 2 check (pts_prediccion_unica >= 0),
  bono_dieciseisavos int not null default 10 check (bono_dieciseisavos >= 0),
  bono_octavos int not null default 8 check (bono_octavos >= 0),
  bono_cuartos int not null default 4 check (bono_cuartos >= 0),
  bono_semifinales int not null default 2 check (bono_semifinales >= 0),
  bono_final int not null default 5 check (bono_final >= 0),
  valor_apuesta numeric(12,2) not null default 0 check (valor_apuesta >= 0),
  premio_primer_lugar int not null default 60 check (premio_primer_lugar between 0 and 100),
  premio_segundo_lugar int not null default 30 check (premio_segundo_lugar between 0 and 100),
  premio_tercer_lugar int not null default 10 check (premio_tercer_lugar between 0 and 100),
  minutos_cierre_prediccion int not null default 5 check (minutos_cierre_prediccion >= 0),
  creado_en timestamptz default now() not null,
  actualizado_en timestamptz default now() not null,
  constraint suma_premios_100 check (
    premio_primer_lugar + premio_segundo_lugar + premio_tercer_lugar = 100
  )
);

create trigger "trgReglasActualizado"
  before update on public."tblReglasGrupo"
  for each row execute function public.set_actualizado_en();

-- ── Partidos seleccionados por cada grupo (N-N) ───────────────────────────
create table public."tblGrupoPartidos" (
  grupo_id uuid not null references public."tblGrupos"(id) on delete cascade,
  partido_id uuid not null references public."tblPartidos"(id) on delete cascade,
  primary key (grupo_id, partido_id)
);

create index "idxGrupoPartidosPartido" on public."tblGrupoPartidos" (partido_id);

-- ── Participantes (miembros de cada grupo) ────────────────────────────────
create table public."tblParticipantes" (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public."tblGrupos"(id) on delete cascade,
  usuario_id uuid not null references public."tblProfiles"(id) on delete cascade,
  rol rol_participante not null default 'jugador',
  pago_realizado boolean default false not null,
  unido_en timestamptz default now() not null,
  unique (grupo_id, usuario_id)
);

create index "idxParticipantesUsuario" on public."tblParticipantes" (usuario_id);

-- ── Predicciones ──────────────────────────────────────────────────────────
create table public."tblPredicciones" (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public."tblParticipantes"(id) on delete cascade,
  partido_id uuid not null references public."tblPartidos"(id) on delete cascade,
  goles_local int not null check (goles_local >= 0),
  goles_visitante int not null check (goles_visitante >= 0),
  puntos_obtenidos int default 0 not null,
  prediccion_unica boolean default false not null,
  creado_en timestamptz default now() not null,
  actualizado_en timestamptz default now() not null,
  unique (participante_id, partido_id)
);

create index "idxPrediccionesPartido" on public."tblPredicciones" (partido_id);

create trigger "trgPrediccionesActualizado"
  before update on public."tblPredicciones"
  for each row execute function public.set_actualizado_en();
