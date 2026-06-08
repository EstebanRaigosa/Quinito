-- ── Torneo ────────────────────────────────────────────────────────────────
insert into public."tblTorneos" (codigo, nombre, fecha_inicio, fecha_fin, pais_sede)
values ('mundial-2026', 'Mundial 2026', '2026-06-11', '2026-07-19', 'USA / México / Canadá');

-- ── 48 equipos (bandera_url → banderas locales en public/flags/) ──────────
insert into public."tblEquipos" (torneo_id, nombre, codigo_iso, grupo, bandera_url)
select t.id, d.nombre, d.iso3, d.grupo, '/flags/' || d.iso2 || '.svg'
from public."tblTorneos" t
cross join (values
  ('A','México','MEX','mx'),
  ('A','Sudáfrica','RSA','za'),
  ('A','Corea del Sur','KOR','kr'),
  ('A','Chequia','CZE','cz'),
  ('B','Canadá','CAN','ca'),
  ('B','Bosnia & Herzegovina','BIH','ba'),
  ('B','Catar','QAT','qa'),
  ('B','Suiza','SUI','ch'),
  ('C','Brasil','BRA','br'),
  ('C','Marruecos','MAR','ma'),
  ('C','Haití','HAI','ht'),
  ('C','Escocia','SCO','gb-sct'),
  ('D','Estados Unidos','USA','us'),
  ('D','Paraguay','PAR','py'),
  ('D','Australia','AUS','au'),
  ('D','Turquía','TUR','tr'),
  ('E','Alemania','GER','de'),
  ('E','Curazao','CUW','cw'),
  ('E','Costa de Marfil','CIV','ci'),
  ('E','Ecuador','ECU','ec'),
  ('F','Países Bajos','NED','nl'),
  ('F','Japón','JPN','jp'),
  ('F','Suecia','SWE','se'),
  ('F','Túnez','TUN','tn'),
  ('G','Bélgica','BEL','be'),
  ('G','Egipto','EGY','eg'),
  ('G','Irán','IRN','ir'),
  ('G','Nueva Zelanda','NZL','nz'),
  ('H','España','ESP','es'),
  ('H','Cabo Verde','CPV','cv'),
  ('H','Arabia Saudita','KSA','sa'),
  ('H','Uruguay','URU','uy'),
  ('I','Francia','FRA','fr'),
  ('I','Senegal','SEN','sn'),
  ('I','Irak','IRQ','iq'),
  ('I','Noruega','NOR','no'),
  ('J','Argentina','ARG','ar'),
  ('J','Argelia','ALG','dz'),
  ('J','Austria','AUT','at'),
  ('J','Jordania','JOR','jo'),
  ('K','Portugal','POR','pt'),
  ('K','RD Congo','COD','cd'),
  ('K','Uzbekistán','UZB','uz'),
  ('K','Colombia','COL','co'),
  ('L','Inglaterra','ENG','gb-eng'),
  ('L','Croacia','CRO','hr'),
  ('L','Ghana','GHA','gh'),
  ('L','Panamá','PAN','pa')
) as d(grupo, nombre, iso3, iso2)
where t.codigo = 'mundial-2026';
