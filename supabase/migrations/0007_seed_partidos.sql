-- Calendario Mundial 2026 (REQUIREMENTS §6.3). Horas convertidas de
-- America/Bogota (UTC-5) a UTC sumando 5h.

-- ── Fase de grupos (72 partidos) — equipos resueltos por nombre ───────────
insert into public."tblPartidos"
  (torneo_id, numero_partido, fase, grupo, equipo_local_id, equipo_visitante_id, fecha_hora, ciudad, estado)
select t.id, d.num, 'fase_grupos', d.grupo, el.id, ev.id, d.fecha::timestamptz, d.ciudad, 'programado'
from public."tblTorneos" t
join (values
  (1,'A','México','Sudáfrica','2026-06-11T19:00:00Z','Ciudad de México'),
  (2,'A','Corea del Sur','Chequia','2026-06-12T02:00:00Z','Guadalajara'),
  (3,'B','Canadá','Bosnia & Herzegovina','2026-06-12T19:00:00Z','Toronto'),
  (4,'D','Estados Unidos','Paraguay','2026-06-13T01:00:00Z','Los Angeles'),
  (5,'C','Haití','Escocia','2026-06-14T01:00:00Z','Boston'),
  (6,'D','Australia','Turquía','2026-06-14T04:00:00Z','Vancouver'),
  (7,'C','Brasil','Marruecos','2026-06-13T22:00:00Z','Nueva York / Nueva Jersey'),
  (8,'B','Catar','Suiza','2026-06-13T19:00:00Z','San Francisco'),
  (9,'E','Costa de Marfil','Ecuador','2026-06-14T23:00:00Z','Filadelfia'),
  (10,'E','Alemania','Curazao','2026-06-14T17:00:00Z','Houston'),
  (11,'F','Países Bajos','Japón','2026-06-14T20:00:00Z','Dallas'),
  (12,'F','Suecia','Túnez','2026-06-15T02:00:00Z','Monterrey'),
  (13,'H','Arabia Saudita','Uruguay','2026-06-15T22:00:00Z','Miami'),
  (14,'H','España','Cabo Verde','2026-06-15T16:00:00Z','Atlanta'),
  (15,'G','Irán','Nueva Zelanda','2026-06-16T01:00:00Z','Los Angeles'),
  (16,'G','Bélgica','Egipto','2026-06-15T19:00:00Z','Seattle'),
  (17,'I','Francia','Senegal','2026-06-16T19:00:00Z','Nueva York / Nueva Jersey'),
  (18,'I','Irak','Noruega','2026-06-16T22:00:00Z','Boston'),
  (19,'J','Argentina','Argelia','2026-06-17T01:00:00Z','Kansas City'),
  (20,'J','Austria','Jordania','2026-06-17T04:00:00Z','San Francisco'),
  (21,'L','Ghana','Panamá','2026-06-17T23:00:00Z','Toronto'),
  (22,'L','Inglaterra','Croacia','2026-06-17T20:00:00Z','Dallas'),
  (23,'K','Portugal','RD Congo','2026-06-17T17:00:00Z','Houston'),
  (24,'K','Uzbekistán','Colombia','2026-06-18T02:00:00Z','Ciudad de México'),
  (25,'A','Chequia','Sudáfrica','2026-06-18T16:00:00Z','Atlanta'),
  (26,'B','Suiza','Bosnia & Herzegovina','2026-06-18T19:00:00Z','Los Angeles'),
  (27,'B','Canadá','Catar','2026-06-18T22:00:00Z','Vancouver'),
  (28,'A','México','Corea del Sur','2026-06-19T01:00:00Z','Guadalajara'),
  (29,'C','Brasil','Haití','2026-06-20T01:00:00Z','Filadelfia'),
  (30,'C','Escocia','Marruecos','2026-06-19T22:00:00Z','Boston'),
  (31,'D','Turquía','Paraguay','2026-06-20T04:00:00Z','San Francisco'),
  (32,'D','Estados Unidos','Australia','2026-06-19T19:00:00Z','Seattle'),
  (33,'E','Alemania','Costa de Marfil','2026-06-20T20:00:00Z','Toronto'),
  (34,'E','Ecuador','Curazao','2026-06-21T00:00:00Z','Kansas City'),
  (35,'F','Países Bajos','Suecia','2026-06-20T17:00:00Z','Houston'),
  (36,'F','Túnez','Japón','2026-06-21T04:00:00Z','Monterrey'),
  (37,'H','Uruguay','Cabo Verde','2026-06-21T22:00:00Z','Miami'),
  (38,'H','España','Arabia Saudita','2026-06-21T16:00:00Z','Atlanta'),
  (39,'G','Bélgica','Irán','2026-06-21T19:00:00Z','Los Angeles'),
  (40,'G','Nueva Zelanda','Egipto','2026-06-22T01:00:00Z','Vancouver'),
  (41,'I','Noruega','Senegal','2026-06-23T00:00:00Z','Nueva York / Nueva Jersey'),
  (42,'I','Francia','Irak','2026-06-22T21:00:00Z','Filadelfia'),
  (43,'J','Argentina','Austria','2026-06-22T17:00:00Z','Dallas'),
  (44,'J','Jordania','Argelia','2026-06-23T03:00:00Z','San Francisco'),
  (45,'L','Inglaterra','Ghana','2026-06-23T20:00:00Z','Boston'),
  (46,'L','Panamá','Croacia','2026-06-23T23:00:00Z','Toronto'),
  (47,'K','Portugal','Uzbekistán','2026-06-23T17:00:00Z','Houston'),
  (48,'K','Colombia','RD Congo','2026-06-24T02:00:00Z','Guadalajara'),
  (49,'C','Escocia','Brasil','2026-06-24T22:00:00Z','Miami'),
  (50,'C','Marruecos','Haití','2026-06-24T22:00:00Z','Atlanta'),
  (51,'B','Suiza','Canadá','2026-06-24T19:00:00Z','Vancouver'),
  (52,'B','Bosnia & Herzegovina','Catar','2026-06-24T19:00:00Z','Seattle'),
  (53,'A','Chequia','México','2026-06-25T01:00:00Z','Ciudad de México'),
  (54,'A','Sudáfrica','Corea del Sur','2026-06-25T01:00:00Z','Monterrey'),
  (55,'E','Curazao','Costa de Marfil','2026-06-25T20:00:00Z','Filadelfia'),
  (56,'E','Ecuador','Alemania','2026-06-25T20:00:00Z','Nueva York / Nueva Jersey'),
  (57,'F','Japón','Suecia','2026-06-25T23:00:00Z','Dallas'),
  (58,'F','Túnez','Países Bajos','2026-06-25T23:00:00Z','Kansas City'),
  (59,'D','Turquía','Estados Unidos','2026-06-26T02:00:00Z','Los Angeles'),
  (60,'D','Paraguay','Australia','2026-06-26T02:00:00Z','San Francisco'),
  (61,'I','Noruega','Francia','2026-06-26T19:00:00Z','Boston'),
  (62,'I','Senegal','Irak','2026-06-26T19:00:00Z','Toronto'),
  (63,'G','Egipto','Irán','2026-06-27T03:00:00Z','Seattle'),
  (64,'G','Nueva Zelanda','Bélgica','2026-06-27T03:00:00Z','Vancouver'),
  (65,'H','Cabo Verde','Arabia Saudita','2026-06-27T00:00:00Z','Houston'),
  (66,'H','Uruguay','España','2026-06-27T00:00:00Z','Guadalajara'),
  (67,'L','Panamá','Inglaterra','2026-06-27T21:00:00Z','Nueva York / Nueva Jersey'),
  (68,'L','Croacia','Ghana','2026-06-27T21:00:00Z','Filadelfia'),
  (69,'J','Argelia','Austria','2026-06-28T02:00:00Z','Kansas City'),
  (70,'J','Jordania','Argentina','2026-06-28T02:00:00Z','Dallas'),
  (71,'K','Colombia','Portugal','2026-06-27T23:30:00Z','Miami'),
  (72,'K','RD Congo','Uzbekistán','2026-06-27T23:30:00Z','Atlanta')
) as d(num, grupo, local, visitante, fecha, ciudad) on true
join public."tblEquipos" el on el.torneo_id = t.id and el.nombre = d.local
join public."tblEquipos" ev on ev.torneo_id = t.id and ev.nombre = d.visitante
where t.codigo = 'mundial-2026';

-- ── Eliminación directa (32 partidos) — placeholders hasta el cierre de grupos ──
-- Notación: 1A=primero grupo A, 2B=segundo grupo B, 3ABCDF=tercero de uno de
-- esos grupos, G74=ganador del partido 74, P101=perdedor del partido 101.
insert into public."tblPartidos"
  (torneo_id, numero_partido, fase, placeholder_local, placeholder_visitante, fecha_hora, ciudad, estado)
select t.id, d.num, d.fase::fase_torneo, d.ph_local, d.ph_visit, d.fecha::timestamptz, d.ciudad, 'programado'
from public."tblTorneos" t
join (values
  (73,'dieciseisavos','2A','2B','2026-06-28T19:00:00Z','Los Angeles'),
  (74,'dieciseisavos','1E','3ABCDF','2026-06-29T20:30:00Z','Boston'),
  (75,'dieciseisavos','1F','2C','2026-06-30T01:00:00Z','Monterrey'),
  (76,'dieciseisavos','1C','2F','2026-06-29T17:00:00Z','Houston'),
  (77,'dieciseisavos','1I','3CDFGH','2026-06-30T21:00:00Z','Nueva York / Nueva Jersey'),
  (78,'dieciseisavos','2E','2I','2026-06-30T17:00:00Z','Dallas'),
  (79,'dieciseisavos','1A','3CEFHI','2026-07-01T01:00:00Z','Ciudad de México'),
  (80,'dieciseisavos','1L','3EHIJK','2026-07-01T16:00:00Z','Atlanta'),
  (81,'dieciseisavos','1D','3BEFIJ','2026-07-02T00:00:00Z','San Francisco'),
  (82,'dieciseisavos','1G','3AEHIJ','2026-07-01T20:00:00Z','Seattle'),
  (83,'dieciseisavos','2K','2L','2026-07-02T23:00:00Z','Toronto'),
  (84,'dieciseisavos','1H','2J','2026-07-02T19:00:00Z','Los Angeles'),
  (85,'dieciseisavos','1B','3EFGIJ','2026-07-03T01:00:00Z','Vancouver'),
  (86,'dieciseisavos','1J','2H','2026-07-03T22:00:00Z','Miami'),
  (87,'dieciseisavos','1K','3DEIJL','2026-07-04T01:30:00Z','Kansas City'),
  (88,'dieciseisavos','2D','2G','2026-07-03T18:00:00Z','Dallas'),
  (89,'octavos','G74','G77','2026-07-04T21:00:00Z','Filadelfia'),
  (90,'octavos','G73','G75','2026-07-04T17:00:00Z','Houston'),
  (91,'octavos','G76','G78','2026-07-05T20:00:00Z','Nueva York / Nueva Jersey'),
  (92,'octavos','G79','G80','2026-07-06T00:00:00Z','Ciudad de México'),
  (93,'octavos','G83','G84','2026-07-06T19:00:00Z','Dallas'),
  (94,'octavos','G81','G82','2026-07-07T00:00:00Z','Seattle'),
  (95,'octavos','G86','G88','2026-07-07T16:00:00Z','Atlanta'),
  (96,'octavos','G85','G87','2026-07-07T20:00:00Z','Vancouver'),
  (97,'cuartos','G89','G90','2026-07-09T20:00:00Z','Boston'),
  (98,'cuartos','G93','G94','2026-07-10T19:00:00Z','Los Angeles'),
  (99,'cuartos','G91','G92','2026-07-11T21:00:00Z','Miami'),
  (100,'cuartos','G95','G96','2026-07-12T01:00:00Z','Kansas City'),
  (101,'semifinales','G97','G98','2026-07-14T19:00:00Z','Dallas'),
  (102,'semifinales','G99','G100','2026-07-15T19:00:00Z','Atlanta'),
  (103,'tercer_lugar','P101','P102','2026-07-18T21:00:00Z','Miami'),
  (104,'final','G101','G102','2026-07-19T19:00:00Z','Nueva York / Nueva Jersey')
) as d(num, fase, ph_local, ph_visit, fecha, ciudad) on true
where t.codigo = 'mundial-2026';
