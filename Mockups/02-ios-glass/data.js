/* =============================================================================
 * Polla — Datos y lógica mock compartida (Mundial 2026)
 * -----------------------------------------------------------------------------
 * Fuente de verdad para los 3 mockups. NO depende de ningún framework.
 * Se expone como `window.POLLA` (script clásico, funciona con file://).
 *
 * Contiene:
 *   - TORNEO, EQUIPOS (12 grupos A–L), PARTIDOS (los 104 del calendario oficial)
 *   - GRUPO_DEMO (la "polla" del usuario) con reglas, participantes y leaderboard
 *   - USUARIO actual
 *   - Helpers deterministas: estado de partido, resultado real, predicciones,
 *     puntajes y estadísticas agregadas (ganador % y top marcadores).
 *
 * Fecha "ahora" simulada: 2026-06-20 16:00 COL  → así hay partidos finalizados,
 * en vivo y programados simultáneamente para poder demostrar TODOS los estados.
 * ========================================================================== */
(function () {
  "use strict";

  const DEMO_NOW = new Date("2026-06-20T16:00:00-05:00");

  // ---------------------------------------------------------------------------
  // EQUIPOS — code → { nombre, bandera (emoji), grupo }
  // ---------------------------------------------------------------------------
  const EQUIPOS = {
    // Grupo A
    MEX:{nombre:"México",bandera:"🇲🇽",grupo:"A"}, RSA:{nombre:"Sudáfrica",bandera:"🇿🇦",grupo:"A"},
    KOR:{nombre:"Corea del Sur",bandera:"🇰🇷",grupo:"A"}, CZE:{nombre:"Chequia",bandera:"🇨🇿",grupo:"A"},
    // Grupo B
    CAN:{nombre:"Canadá",bandera:"🇨🇦",grupo:"B"}, BIH:{nombre:"Bosnia & H.",bandera:"🇧🇦",grupo:"B"},
    QAT:{nombre:"Catar",bandera:"🇶🇦",grupo:"B"}, SUI:{nombre:"Suiza",bandera:"🇨🇭",grupo:"B"},
    // Grupo C
    BRA:{nombre:"Brasil",bandera:"🇧🇷",grupo:"C"}, MAR:{nombre:"Marruecos",bandera:"🇲🇦",grupo:"C"},
    HAI:{nombre:"Haití",bandera:"🇭🇹",grupo:"C"}, SCO:{nombre:"Escocia",bandera:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",grupo:"C"},
    // Grupo D
    USA:{nombre:"Estados Unidos",bandera:"🇺🇸",grupo:"D"}, PAR:{nombre:"Paraguay",bandera:"🇵🇾",grupo:"D"},
    AUS:{nombre:"Australia",bandera:"🇦🇺",grupo:"D"}, TUR:{nombre:"Turquía",bandera:"🇹🇷",grupo:"D"},
    // Grupo E
    GER:{nombre:"Alemania",bandera:"🇩🇪",grupo:"E"}, CUW:{nombre:"Curazao",bandera:"🇨🇼",grupo:"E"},
    CIV:{nombre:"Costa de Marfil",bandera:"🇨🇮",grupo:"E"}, ECU:{nombre:"Ecuador",bandera:"🇪🇨",grupo:"E"},
    // Grupo F
    NED:{nombre:"Países Bajos",bandera:"🇳🇱",grupo:"F"}, JPN:{nombre:"Japón",bandera:"🇯🇵",grupo:"F"},
    SWE:{nombre:"Suecia",bandera:"🇸🇪",grupo:"F"}, TUN:{nombre:"Túnez",bandera:"🇹🇳",grupo:"F"},
    // Grupo G
    BEL:{nombre:"Bélgica",bandera:"🇧🇪",grupo:"G"}, EGY:{nombre:"Egipto",bandera:"🇪🇬",grupo:"G"},
    IRN:{nombre:"Irán",bandera:"🇮🇷",grupo:"G"}, NZL:{nombre:"Nueva Zelanda",bandera:"🇳🇿",grupo:"G"},
    // Grupo H
    ESP:{nombre:"España",bandera:"🇪🇸",grupo:"H"}, CPV:{nombre:"Cabo Verde",bandera:"🇨🇻",grupo:"H"},
    KSA:{nombre:"Arabia Saudita",bandera:"🇸🇦",grupo:"H"}, URU:{nombre:"Uruguay",bandera:"🇺🇾",grupo:"H"},
    // Grupo I
    FRA:{nombre:"Francia",bandera:"🇫🇷",grupo:"I"}, SEN:{nombre:"Senegal",bandera:"🇸🇳",grupo:"I"},
    IRQ:{nombre:"Irak",bandera:"🇮🇶",grupo:"I"}, NOR:{nombre:"Noruega",bandera:"🇳🇴",grupo:"I"},
    // Grupo J
    ARG:{nombre:"Argentina",bandera:"🇦🇷",grupo:"J"}, ALG:{nombre:"Argelia",bandera:"🇩🇿",grupo:"J"},
    AUT:{nombre:"Austria",bandera:"🇦🇹",grupo:"J"}, JOR:{nombre:"Jordania",bandera:"🇯🇴",grupo:"J"},
    // Grupo K
    POR:{nombre:"Portugal",bandera:"🇵🇹",grupo:"K"}, COD:{nombre:"RD Congo",bandera:"🇨🇩",grupo:"K"},
    UZB:{nombre:"Uzbekistán",bandera:"🇺🇿",grupo:"K"}, COL:{nombre:"Colombia",bandera:"🇨🇴",grupo:"K"},
    // Grupo L
    ENG:{nombre:"Inglaterra",bandera:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",grupo:"L"}, CRO:{nombre:"Croacia",bandera:"🇭🇷",grupo:"L"},
    GHA:{nombre:"Ghana",bandera:"🇬🇭",grupo:"L"}, PAN:{nombre:"Panamá",bandera:"🇵🇦",grupo:"L"},
  };

  const GRUPOS_TORNEO = ["A","B","C","D","E","F","G","H","I","J","K","L"];

  // ---------------------------------------------------------------------------
  // PARTIDOS — calendario oficial Mundial 2026 (hora COL, UTC-5)
  //   m: { n, fase, grupo?, local, visitante, fecha (ISO), estadio }
  //   En fase de grupos `local`/`visitante` son códigos de EQUIPOS.
  //   En eliminatorias son placeholders string (ej. "2A", "3ABCDF", "G73", "P101").
  // ---------------------------------------------------------------------------
  const G = "fase_grupos";
  const PARTIDOS = [
    // ---- Fase de grupos ----
    {n:1, fase:G,grupo:"A",local:"MEX",visitante:"RSA",fecha:"2026-06-11T14:00:00-05:00",estadio:"Ciudad de México"},
    {n:2, fase:G,grupo:"A",local:"KOR",visitante:"CZE",fecha:"2026-06-11T21:00:00-05:00",estadio:"Guadalajara"},
    {n:3, fase:G,grupo:"B",local:"CAN",visitante:"BIH",fecha:"2026-06-12T14:00:00-05:00",estadio:"Toronto"},
    {n:4, fase:G,grupo:"D",local:"USA",visitante:"PAR",fecha:"2026-06-12T20:00:00-05:00",estadio:"Los Angeles"},
    {n:8, fase:G,grupo:"B",local:"QAT",visitante:"SUI",fecha:"2026-06-13T14:00:00-05:00",estadio:"San Francisco"},
    {n:7, fase:G,grupo:"C",local:"BRA",visitante:"MAR",fecha:"2026-06-13T17:00:00-05:00",estadio:"Nueva York / NJ"},
    {n:5, fase:G,grupo:"C",local:"HAI",visitante:"SCO",fecha:"2026-06-13T20:00:00-05:00",estadio:"Boston"},
    {n:6, fase:G,grupo:"D",local:"AUS",visitante:"TUR",fecha:"2026-06-13T23:00:00-05:00",estadio:"Vancouver"},
    {n:10,fase:G,grupo:"E",local:"GER",visitante:"CUW",fecha:"2026-06-14T12:00:00-05:00",estadio:"Houston"},
    {n:11,fase:G,grupo:"F",local:"NED",visitante:"JPN",fecha:"2026-06-14T15:00:00-05:00",estadio:"Dallas"},
    {n:9, fase:G,grupo:"E",local:"CIV",visitante:"ECU",fecha:"2026-06-14T18:00:00-05:00",estadio:"Filadelfia"},
    {n:12,fase:G,grupo:"F",local:"SWE",visitante:"TUN",fecha:"2026-06-14T21:00:00-05:00",estadio:"Monterrey"},
    {n:14,fase:G,grupo:"H",local:"ESP",visitante:"CPV",fecha:"2026-06-15T11:00:00-05:00",estadio:"Atlanta"},
    {n:16,fase:G,grupo:"G",local:"BEL",visitante:"EGY",fecha:"2026-06-15T14:00:00-05:00",estadio:"Seattle"},
    {n:13,fase:G,grupo:"H",local:"KSA",visitante:"URU",fecha:"2026-06-15T17:00:00-05:00",estadio:"Miami"},
    {n:15,fase:G,grupo:"G",local:"IRN",visitante:"NZL",fecha:"2026-06-15T20:00:00-05:00",estadio:"Los Angeles"},
    {n:17,fase:G,grupo:"I",local:"FRA",visitante:"SEN",fecha:"2026-06-16T14:00:00-05:00",estadio:"Nueva York / NJ"},
    {n:18,fase:G,grupo:"I",local:"IRQ",visitante:"NOR",fecha:"2026-06-16T17:00:00-05:00",estadio:"Boston"},
    {n:19,fase:G,grupo:"J",local:"ARG",visitante:"ALG",fecha:"2026-06-16T20:00:00-05:00",estadio:"Kansas City"},
    {n:20,fase:G,grupo:"J",local:"AUT",visitante:"JOR",fecha:"2026-06-16T23:00:00-05:00",estadio:"San Francisco"},
    {n:23,fase:G,grupo:"K",local:"POR",visitante:"COD",fecha:"2026-06-17T12:00:00-05:00",estadio:"Houston"},
    {n:22,fase:G,grupo:"L",local:"ENG",visitante:"CRO",fecha:"2026-06-17T15:00:00-05:00",estadio:"Dallas"},
    {n:21,fase:G,grupo:"L",local:"GHA",visitante:"PAN",fecha:"2026-06-17T18:00:00-05:00",estadio:"Toronto"},
    {n:24,fase:G,grupo:"K",local:"UZB",visitante:"COL",fecha:"2026-06-17T21:00:00-05:00",estadio:"Ciudad de México"},
    {n:25,fase:G,grupo:"A",local:"CZE",visitante:"RSA",fecha:"2026-06-18T11:00:00-05:00",estadio:"Atlanta"},
    {n:26,fase:G,grupo:"B",local:"SUI",visitante:"BIH",fecha:"2026-06-18T14:00:00-05:00",estadio:"Los Angeles"},
    {n:27,fase:G,grupo:"B",local:"CAN",visitante:"QAT",fecha:"2026-06-18T17:00:00-05:00",estadio:"Vancouver"},
    {n:28,fase:G,grupo:"A",local:"MEX",visitante:"KOR",fecha:"2026-06-18T20:00:00-05:00",estadio:"Guadalajara"},
    {n:32,fase:G,grupo:"D",local:"USA",visitante:"AUS",fecha:"2026-06-19T14:00:00-05:00",estadio:"Seattle"},
    {n:30,fase:G,grupo:"C",local:"SCO",visitante:"MAR",fecha:"2026-06-19T17:00:00-05:00",estadio:"Boston"},
    {n:29,fase:G,grupo:"C",local:"BRA",visitante:"HAI",fecha:"2026-06-19T20:00:00-05:00",estadio:"Filadelfia"},
    {n:31,fase:G,grupo:"D",local:"TUR",visitante:"PAR",fecha:"2026-06-19T23:00:00-05:00",estadio:"San Francisco"},
    {n:35,fase:G,grupo:"F",local:"NED",visitante:"SWE",fecha:"2026-06-20T12:00:00-05:00",estadio:"Houston"},
    {n:33,fase:G,grupo:"E",local:"GER",visitante:"CIV",fecha:"2026-06-20T15:00:00-05:00",estadio:"Toronto"},
    {n:34,fase:G,grupo:"E",local:"ECU",visitante:"CUW",fecha:"2026-06-20T19:00:00-05:00",estadio:"Kansas City"},
    {n:36,fase:G,grupo:"F",local:"TUN",visitante:"JPN",fecha:"2026-06-20T23:00:00-05:00",estadio:"Monterrey"},
    {n:38,fase:G,grupo:"H",local:"ESP",visitante:"KSA",fecha:"2026-06-21T11:00:00-05:00",estadio:"Atlanta"},
    {n:39,fase:G,grupo:"G",local:"BEL",visitante:"IRN",fecha:"2026-06-21T14:00:00-05:00",estadio:"Los Angeles"},
    {n:37,fase:G,grupo:"H",local:"URU",visitante:"CPV",fecha:"2026-06-21T17:00:00-05:00",estadio:"Miami"},
    {n:40,fase:G,grupo:"G",local:"NZL",visitante:"EGY",fecha:"2026-06-21T20:00:00-05:00",estadio:"Vancouver"},
    {n:43,fase:G,grupo:"J",local:"ARG",visitante:"AUT",fecha:"2026-06-22T12:00:00-05:00",estadio:"Dallas"},
    {n:42,fase:G,grupo:"I",local:"FRA",visitante:"IRQ",fecha:"2026-06-22T16:00:00-05:00",estadio:"Filadelfia"},
    {n:41,fase:G,grupo:"I",local:"NOR",visitante:"SEN",fecha:"2026-06-22T19:00:00-05:00",estadio:"Nueva York / NJ"},
    {n:44,fase:G,grupo:"J",local:"JOR",visitante:"ALG",fecha:"2026-06-22T22:00:00-05:00",estadio:"San Francisco"},
    {n:47,fase:G,grupo:"K",local:"POR",visitante:"UZB",fecha:"2026-06-23T12:00:00-05:00",estadio:"Houston"},
    {n:45,fase:G,grupo:"L",local:"ENG",visitante:"GHA",fecha:"2026-06-23T15:00:00-05:00",estadio:"Boston"},
    {n:46,fase:G,grupo:"L",local:"PAN",visitante:"CRO",fecha:"2026-06-23T18:00:00-05:00",estadio:"Toronto"},
    {n:48,fase:G,grupo:"K",local:"COL",visitante:"COD",fecha:"2026-06-23T21:00:00-05:00",estadio:"Guadalajara"},
    {n:51,fase:G,grupo:"B",local:"SUI",visitante:"CAN",fecha:"2026-06-24T14:00:00-05:00",estadio:"Vancouver"},
    {n:52,fase:G,grupo:"B",local:"BIH",visitante:"QAT",fecha:"2026-06-24T14:00:00-05:00",estadio:"Seattle"},
    {n:49,fase:G,grupo:"C",local:"SCO",visitante:"BRA",fecha:"2026-06-24T17:00:00-05:00",estadio:"Miami"},
    {n:50,fase:G,grupo:"C",local:"MAR",visitante:"HAI",fecha:"2026-06-24T17:00:00-05:00",estadio:"Atlanta"},
    {n:53,fase:G,grupo:"A",local:"CZE",visitante:"MEX",fecha:"2026-06-24T20:00:00-05:00",estadio:"Ciudad de México"},
    {n:54,fase:G,grupo:"A",local:"RSA",visitante:"KOR",fecha:"2026-06-24T20:00:00-05:00",estadio:"Monterrey"},
    {n:55,fase:G,grupo:"E",local:"CUW",visitante:"CIV",fecha:"2026-06-25T15:00:00-05:00",estadio:"Filadelfia"},
    {n:56,fase:G,grupo:"E",local:"ECU",visitante:"GER",fecha:"2026-06-25T15:00:00-05:00",estadio:"Nueva York / NJ"},
    {n:57,fase:G,grupo:"F",local:"JPN",visitante:"SWE",fecha:"2026-06-25T18:00:00-05:00",estadio:"Dallas"},
    {n:58,fase:G,grupo:"F",local:"TUN",visitante:"NED",fecha:"2026-06-25T18:00:00-05:00",estadio:"Kansas City"},
    {n:59,fase:G,grupo:"D",local:"TUR",visitante:"USA",fecha:"2026-06-25T21:00:00-05:00",estadio:"Los Angeles"},
    {n:60,fase:G,grupo:"D",local:"PAR",visitante:"AUS",fecha:"2026-06-25T21:00:00-05:00",estadio:"San Francisco"},
    {n:61,fase:G,grupo:"I",local:"NOR",visitante:"FRA",fecha:"2026-06-26T14:00:00-05:00",estadio:"Boston"},
    {n:62,fase:G,grupo:"I",local:"SEN",visitante:"IRQ",fecha:"2026-06-26T14:00:00-05:00",estadio:"Toronto"},
    {n:65,fase:G,grupo:"H",local:"CPV",visitante:"KSA",fecha:"2026-06-26T19:00:00-05:00",estadio:"Houston"},
    {n:66,fase:G,grupo:"H",local:"URU",visitante:"ESP",fecha:"2026-06-26T19:00:00-05:00",estadio:"Guadalajara"},
    {n:63,fase:G,grupo:"G",local:"EGY",visitante:"IRN",fecha:"2026-06-26T22:00:00-05:00",estadio:"Seattle"},
    {n:64,fase:G,grupo:"G",local:"NZL",visitante:"BEL",fecha:"2026-06-26T22:00:00-05:00",estadio:"Vancouver"},
    {n:67,fase:G,grupo:"L",local:"PAN",visitante:"ENG",fecha:"2026-06-27T16:00:00-05:00",estadio:"Nueva York / NJ"},
    {n:68,fase:G,grupo:"L",local:"CRO",visitante:"GHA",fecha:"2026-06-27T16:00:00-05:00",estadio:"Filadelfia"},
    {n:71,fase:G,grupo:"K",local:"COL",visitante:"POR",fecha:"2026-06-27T18:30:00-05:00",estadio:"Miami"},
    {n:72,fase:G,grupo:"K",local:"COD",visitante:"UZB",fecha:"2026-06-27T18:30:00-05:00",estadio:"Atlanta"},
    {n:69,fase:G,grupo:"J",local:"ALG",visitante:"AUT",fecha:"2026-06-27T21:00:00-05:00",estadio:"Kansas City"},
    {n:70,fase:G,grupo:"J",local:"JOR",visitante:"ARG",fecha:"2026-06-27T21:00:00-05:00",estadio:"Dallas"},
    // ---- Dieciseisavos ----
    {n:73,fase:"dieciseisavos",local:"2A",visitante:"2B",fecha:"2026-06-28T14:00:00-05:00",estadio:"Los Angeles"},
    {n:76,fase:"dieciseisavos",local:"1C",visitante:"2F",fecha:"2026-06-29T12:00:00-05:00",estadio:"Houston"},
    {n:74,fase:"dieciseisavos",local:"1E",visitante:"3ABCDF",fecha:"2026-06-29T15:30:00-05:00",estadio:"Boston"},
    {n:75,fase:"dieciseisavos",local:"1F",visitante:"2C",fecha:"2026-06-29T20:00:00-05:00",estadio:"Monterrey"},
    {n:78,fase:"dieciseisavos",local:"2E",visitante:"2I",fecha:"2026-06-30T12:00:00-05:00",estadio:"Dallas"},
    {n:77,fase:"dieciseisavos",local:"1I",visitante:"3CDFGH",fecha:"2026-06-30T16:00:00-05:00",estadio:"Nueva York / NJ"},
    {n:79,fase:"dieciseisavos",local:"1A",visitante:"3CEFHI",fecha:"2026-06-30T20:00:00-05:00",estadio:"Ciudad de México"},
    {n:80,fase:"dieciseisavos",local:"1L",visitante:"3EHIJK",fecha:"2026-07-01T11:00:00-05:00",estadio:"Atlanta"},
    {n:82,fase:"dieciseisavos",local:"1G",visitante:"3AEHIJ",fecha:"2026-07-01T15:00:00-05:00",estadio:"Seattle"},
    {n:81,fase:"dieciseisavos",local:"1D",visitante:"3BEFIJ",fecha:"2026-07-01T19:00:00-05:00",estadio:"San Francisco"},
    {n:84,fase:"dieciseisavos",local:"1H",visitante:"2J",fecha:"2026-07-02T14:00:00-05:00",estadio:"Los Angeles"},
    {n:83,fase:"dieciseisavos",local:"2K",visitante:"2L",fecha:"2026-07-02T18:00:00-05:00",estadio:"Toronto"},
    {n:85,fase:"dieciseisavos",local:"1B",visitante:"3EFGIJ",fecha:"2026-07-02T20:00:00-05:00",estadio:"Vancouver"},
    {n:88,fase:"dieciseisavos",local:"2D",visitante:"2G",fecha:"2026-07-03T13:00:00-05:00",estadio:"Dallas"},
    {n:86,fase:"dieciseisavos",local:"1J",visitante:"2H",fecha:"2026-07-03T17:00:00-05:00",estadio:"Miami"},
    {n:87,fase:"dieciseisavos",local:"1K",visitante:"3DEIJL",fecha:"2026-07-03T20:30:00-05:00",estadio:"Kansas City"},
    // ---- Octavos ----
    {n:90,fase:"octavos",local:"G73",visitante:"G75",fecha:"2026-07-04T12:00:00-05:00",estadio:"Houston"},
    {n:89,fase:"octavos",local:"G74",visitante:"G77",fecha:"2026-07-04T16:00:00-05:00",estadio:"Filadelfia"},
    {n:91,fase:"octavos",local:"G76",visitante:"G78",fecha:"2026-07-05T15:00:00-05:00",estadio:"Nueva York / NJ"},
    {n:92,fase:"octavos",local:"G79",visitante:"G80",fecha:"2026-07-05T19:00:00-05:00",estadio:"Ciudad de México"},
    {n:93,fase:"octavos",local:"G83",visitante:"G84",fecha:"2026-07-06T14:00:00-05:00",estadio:"Dallas"},
    {n:94,fase:"octavos",local:"G81",visitante:"G82",fecha:"2026-07-06T19:00:00-05:00",estadio:"Seattle"},
    {n:95,fase:"octavos",local:"G86",visitante:"G88",fecha:"2026-07-07T11:00:00-05:00",estadio:"Atlanta"},
    {n:96,fase:"octavos",local:"G85",visitante:"G87",fecha:"2026-07-07T15:00:00-05:00",estadio:"Vancouver"},
    // ---- Cuartos ----
    {n:97, fase:"cuartos",local:"G89",visitante:"G90",fecha:"2026-07-09T15:00:00-05:00",estadio:"Boston"},
    {n:98, fase:"cuartos",local:"G93",visitante:"G94",fecha:"2026-07-10T14:00:00-05:00",estadio:"Los Angeles"},
    {n:99, fase:"cuartos",local:"G91",visitante:"G92",fecha:"2026-07-11T16:00:00-05:00",estadio:"Miami"},
    {n:100,fase:"cuartos",local:"G95",visitante:"G96",fecha:"2026-07-11T20:00:00-05:00",estadio:"Kansas City"},
    // ---- Semifinales ----
    {n:101,fase:"semifinales",local:"G97",visitante:"G98",fecha:"2026-07-14T14:00:00-05:00",estadio:"Dallas"},
    {n:102,fase:"semifinales",local:"G99",visitante:"G100",fecha:"2026-07-15T14:00:00-05:00",estadio:"Atlanta"},
    // ---- Tercer lugar ----
    {n:103,fase:"tercer_lugar",local:"P101",visitante:"P102",fecha:"2026-07-18T16:00:00-05:00",estadio:"Miami"},
    // ---- Final ----
    {n:104,fase:"final",local:"G101",visitante:"G102",fecha:"2026-07-19T14:00:00-05:00",estadio:"Nueva York / NJ"},
  ];

  const FASES = [
    {id:"fase_grupos",  nombre:"Fase de Grupos"},
    {id:"dieciseisavos",nombre:"Dieciseisavos de Final"},
    {id:"octavos",      nombre:"Octavos de Final"},
    {id:"cuartos",      nombre:"Cuartos de Final"},
    {id:"semifinales",  nombre:"Semifinales"},
    {id:"tercer_lugar", nombre:"Tercer Lugar"},
    {id:"final",        nombre:"Final"},
  ];

  // ---------------------------------------------------------------------------
  // USUARIO + GRUPO DEMO (la polla del usuario)
  // ---------------------------------------------------------------------------
  const USUARIO = {
    id:"u-yo", nombre:"Andrés Ramírez", email:"admin@polla.co",
    avatar:"AR", inicialesColor:"#E11D48", rol:"admin", esAdminPlataforma:true,
  };

  // Credenciales de DEMO "quemadas" para poder probar el login.
  // El login del mockup valida contra esto; si coinciden → dashboard.
  const CREDENCIALES = { usuario:"admin@polla.co", clave:"Mundial2026" };

  const REGLAS = {
    pts_marcador_exacto:5, pts_ganador:2, pts_gol_acertado:1, pts_prediccion_unica:2,
    bono_dieciseisavos:10, bono_octavos:8, bono_cuartos:4, bono_semifinales:2, bono_final:5,
    valor_apuesta:50000, premio_primer_lugar:60, premio_segundo_lugar:30, premio_tercer_lugar:10,
    minutos_cierre_prediccion:5,
  };

  // Participantes de la polla demo (incluye al usuario). avatar = iniciales.
  const PARTICIPANTES = [
    {id:"u-yo",  nombre:"Andrés Ramírez", avatar:"AR", color:"#E11D48", rol:"admin",   pago:true},
    {id:"p-2",   nombre:"Laura Gómez",    avatar:"LG", color:"#2563EB", rol:"jugador", pago:true},
    {id:"p-3",   nombre:"Carlos Pérez",   avatar:"CP", color:"#16A34A", rol:"jugador", pago:true},
    {id:"p-4",   nombre:"Mariana Ruiz",   avatar:"MR", color:"#9333EA", rol:"jugador", pago:false},
    {id:"p-5",   nombre:"Julián Torres",  avatar:"JT", color:"#EA580C", rol:"jugador", pago:true},
    {id:"p-6",   nombre:"Sofía Castro",   avatar:"SC", color:"#0891B2", rol:"jugador", pago:true},
    {id:"p-7",   nombre:"Diego Morales",  avatar:"DM", color:"#CA8A04", rol:"jugador", pago:false},
    {id:"p-8",   nombre:"Valentina Díaz", avatar:"VD", color:"#DB2777", rol:"jugador", pago:true},
  ];

  const GRUPO_DEMO = {
    id:"g-oficina", nombre:"Polla de la Oficina 2026", descripcion:"La polla oficial del equipo. ¡Que gane el mejor pronosticador!",
    torneo:"Mundial 2026", codigo:"PLLA26", creador:"u-yo", reglas:REGLAS, participantes:PARTICIPANTES,
  };

  // Otros grupos del usuario (para el dashboard "Mis Grupos")
  const MIS_GRUPOS = [
    {id:"g-oficina", nombre:"Polla de la Oficina 2026", torneo:"Mundial 2026", participantes:8, posicion:2, estado:"Activo"},
    {id:"g-familia", nombre:"Mundial en Familia",       torneo:"Mundial 2026", participantes:14,posicion:5, estado:"Activo"},
    {id:"g-amigos",  nombre:"Los Pibes del Barrio",     torneo:"Mundial 2026", participantes:6, posicion:1, estado:"Activo"},
  ];

  // ---------------------------------------------------------------------------
  // HELPERS DETERMINISTAS
  // ---------------------------------------------------------------------------
  function hash(n){ // PRNG determinista simple a partir de un entero
    let x = Math.sin(n * 9973.7) * 43758.5453;
    return x - Math.floor(x); // [0,1)
  }
  function golesPseudo(n, lado){ // marcador real reproducible para partidos finalizados
    const r = hash(n * 31 + (lado==="local"?7:13));
    if (r < 0.30) return 0; if (r < 0.62) return 1; if (r < 0.84) return 2; if (r < 0.95) return 3; return 4;
  }

  function fechaPartido(m){ return new Date(m.fecha); }

  /** Estado calculado del partido respecto a DEMO_NOW. */
  function estadoPartido(m, now){
    now = now || DEMO_NOW;
    const ini = fechaPartido(m).getTime();
    const fin = ini + 110 * 60 * 1000; // ~110 min de partido
    if (now.getTime() >= fin) return "finalizado";
    if (now.getTime() >= ini) return "en_vivo";
    return "programado";
  }

  /** ¿Está abierta la predicción? Cierra `minutos_cierre` antes del kickoff. */
  function prediccionAbierta(m, reglas, now){
    now = now || DEMO_NOW;
    const cierre = fechaPartido(m).getTime() - (reglas?.minutos_cierre_prediccion ?? 5) * 60 * 1000;
    return now.getTime() < cierre;
  }

  /** ¿Tiene equipos definidos? (eliminatorias con placeholder no se pueden predecir) */
  function equiposDefinidos(m){
    return !!EQUIPOS[m.local] && !!EQUIPOS[m.visitante];
  }

  /** Resultado real (solo si finalizado / en vivo). Devuelve {gl, gv} o null. */
  function resultadoReal(m, now){
    const est = estadoPartido(m, now);
    if (est === "programado") return null;
    return { gl: golesPseudo(m.n,"local"), gv: golesPseudo(m.n,"visitante") };
  }

  /** Etiqueta de equipo: nombre real o placeholder ("2A", "Ganador P73", etc.). */
  function etiquetaEquipo(code){
    if (EQUIPOS[code]) return EQUIPOS[code].nombre;
    if (/^G\d+$/.test(code)) return "Ganador P"+code.slice(1);
    if (/^P\d+$/.test(code)) return "Perdedor P"+code.slice(1);
    return code; // placeholders de grupo: 2A, 3ABCDF...
  }
  function banderaEquipo(code){ return EQUIPOS[code] ? EQUIPOS[code].bandera : "🏳️"; }
  function nombreCortoEquipo(code){
    if (EQUIPOS[code]) return EQUIPOS[code].nombre;
    return code;
  }

  /** Predicción del usuario para un partido (determinista para los ya jugados). */
  function miPrediccion(m){
    // Genera predicciones plausibles para los primeros ~45 partidos (los que el user ya jugó)
    const r1 = hash(m.n*5+1), r2 = hash(m.n*5+2);
    const gl = r1<0.4?1:r1<0.7?2:r1<0.9?0:3;
    const gv = r2<0.45?1:r2<0.75?0:r2<0.92?2:3;
    return { gl, gv };
  }

  /** Predicción de un participante específico (determinista). */
  function prediccionDe(participanteId, m){
    const seed = (participanteId.charCodeAt(participanteId.length-1) || 1);
    const r1 = hash(m.n*7 + seed), r2 = hash(m.n*7 + seed*2);
    const gl = r1<0.42?1:r1<0.72?2:r1<0.9?0:3;
    const gv = r2<0.48?1:r2<0.78?0:r2<0.93?2:3;
    return { gl, gv };
  }

  /** Cálculo de puntos según REQUIREMENTS §7.1. */
  function calcularPuntos(pred, real, fase, reglas, esUnica){
    if (!real) return 0;
    let pts = 0;
    const signo = (a,b)=> a>b?1 : a<b?-1 : 0;
    if (pred.gl === real.gl && pred.gv === real.gv){
      pts += reglas.pts_marcador_exacto;
      const bono = {dieciseisavos:reglas.bono_dieciseisavos, octavos:reglas.bono_octavos,
        cuartos:reglas.bono_cuartos, semifinales:reglas.bono_semifinales, final:reglas.bono_final}[fase];
      if (bono) pts += bono;
      if (esUnica) pts += reglas.pts_prediccion_unica;
    } else {
      if (signo(pred.gl,pred.gv) === signo(real.gl,real.gv)) pts += reglas.pts_ganador;
      if (pred.gl === real.gl) pts += reglas.pts_gol_acertado;
      if (pred.gv === real.gv) pts += reglas.pts_gol_acertado;
    }
    return pts;
  }

  /** Puntos del usuario en un partido finalizado. */
  function misPuntos(m, reglas){
    const real = resultadoReal(m);
    if (estadoPartido(m) !== "finalizado") return null;
    return calcularPuntos(miPrediccion(m), real, m.fase, reglas, false);
  }

  /** Tabla de posiciones del grupo (suma puntos de todos los partidos finalizados). */
  function tablaPosiciones(grupo){
    const reglas = grupo.reglas;
    const finalizados = PARTIDOS.filter(m => estadoPartido(m)==="finalizado");
    const filas = grupo.participantes.map(p => {
      let total = 0, aciertos = 0;
      finalizados.forEach(m => {
        const pred = (p.id==="u-yo") ? miPrediccion(m) : prediccionDe(p.id, m);
        const pts = calcularPuntos(pred, resultadoReal(m), m.fase, reglas, false);
        total += pts; if (pts>0) aciertos++;
      });
      return { ...p, puntos: total, aciertos };
    });
    filas.sort((a,b)=> b.puntos - a.puntos);
    filas.forEach((f,i)=> f.posicion = i+1);
    return filas;
  }

  /** Estadísticas agregadas GLOBALES de un partido (toda la plataforma). */
  function estadisticasGlobales(m){
    // Caso curado bonito para el primer partido (México-Sudáfrica), como en el briefing.
    if (m.n === 1){
      return {
        total: 4821,
        ganador: { local:82.90, visitante:4.64, empate:12.46 },
        topMarcadores: [
          {m:"2-1",pct:31.30},{m:"2-0",pct:26.38},{m:"1-0",pct:13.33},
          {m:"3-0",pct:8.10},{m:"3-1",pct:6.92},{m:"1-1",pct:4.85},
          {m:"2-2",pct:3.10},{m:"4-0",pct:2.20},{m:"4-1",pct:1.50},{m:"0-0",pct:1.32},
        ],
      };
    }
    // Generación determinista para el resto.
    const a = hash(m.n*3+1), b = hash(m.n*3+2);
    let local = Math.round((35 + a*45)*100)/100;
    let empate = Math.round((10 + b*22)*100)/100;
    let visitante = Math.round((100 - local - empate)*100)/100;
    if (visitante < 4){ visitante = 4; empate = Math.round((100-local-visitante)*100)/100; }
    const combos = ["1-0","2-1","1-1","2-0","0-0","0-1","3-1","2-2","1-2","3-0"];
    let resto = 100, top = [];
    combos.forEach((c,i)=>{
      const w = hash(m.n*11 + i);
      let pct = i===combos.length-1 ? resto : Math.round(Math.min(resto-1, (resto*(0.18+w*0.22)))*100)/100;
      resto = Math.round((resto-pct)*100)/100; top.push({m:c, pct});
    });
    top.sort((x,y)=> y.pct - x.pct);
    return { total: 800 + Math.round(hash(m.n)*4000), ganador:{local,visitante,empate}, topMarcadores: top };
  }

  /** Estadísticas agregadas del GRUPO (solo participantes del grupo). */
  function estadisticasGrupo(grupo, m){
    const preds = grupo.participantes.map(p => p.id==="u-yo"?miPrediccion(m):prediccionDe(p.id,m));
    const n = preds.length;
    const cuenta = (f)=> preds.filter(f).length;
    const pct = (c)=> Math.round(1000*c/n)/10;
    const local = pct(cuenta(p=>p.gl>p.gv)), visitante = pct(cuenta(p=>p.gl<p.gv)), empate = pct(cuenta(p=>p.gl===p.gv));
    const mapa = {};
    preds.forEach(p=>{ const k=p.gl+"-"+p.gv; mapa[k]=(mapa[k]||0)+1; });
    const top = Object.entries(mapa).map(([k,c])=>({m:k,pct:pct(c)})).sort((a,b)=>b.pct-a.pct);
    return { total:n, ganador:{local,visitante,empate}, topMarcadores:top };
  }

  /** Lista nominal de predicciones del grupo (SOLO si la apuesta ya cerró). */
  function prediccionesNominales(grupo, m){
    if (prediccionAbierta(m, grupo.reglas)) return null; // privacidad: aún secretas
    const real = resultadoReal(m);
    const finalizado = estadoPartido(m)==="finalizado";
    const filas = grupo.participantes.map(p=>{
      const pred = p.id==="u-yo"?miPrediccion(m):prediccionDe(p.id,m);
      const pts = finalizado ? calcularPuntos(pred, real, m.fase, grupo.reglas, false) : null;
      return { ...p, pred, puntos: pts };
    });
    if (finalizado) filas.sort((a,b)=> b.puntos - a.puntos);
    else filas.sort((a,b)=> a.nombre.localeCompare(b.nombre));
    return filas;
  }

  // ---------------------------------------------------------------------------
  // Formato de fechas en zona America/Bogota
  // ---------------------------------------------------------------------------
  const fmtFecha = new Intl.DateTimeFormat("es-CO", {timeZone:"America/Bogota", weekday:"short", day:"numeric", month:"short"});
  const fmtHora  = new Intl.DateTimeFormat("es-CO", {timeZone:"America/Bogota", hour:"2-digit", minute:"2-digit", hour12:true});
  function fechaCorta(m){ return fmtFecha.format(fechaPartido(m)); }
  function horaCorta(m){ return fmtHora.format(fechaPartido(m)); }

  function partidosPorFase(faseId){ return PARTIDOS.filter(m=>m.fase===faseId).sort((a,b)=>fechaPartido(a)-fechaPartido(b)); }
  function partidoPorN(n){ return PARTIDOS.find(m=>m.n===n); }
  function proximoPartido(){
    return PARTIDOS.filter(m=>estadoPartido(m)==="programado").sort((a,b)=>fechaPartido(a)-fechaPartido(b))[0];
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.POLLA = {
    DEMO_NOW, EQUIPOS, GRUPOS_TORNEO, PARTIDOS, FASES, FASES_KO:FASES.filter(f=>f.id!=="fase_grupos"),
    USUARIO, CREDENCIALES, REGLAS, PARTICIPANTES, GRUPO_DEMO, MIS_GRUPOS,
    // helpers
    estadoPartido, prediccionAbierta, equiposDefinidos, resultadoReal,
    etiquetaEquipo, banderaEquipo, nombreCortoEquipo,
    miPrediccion, prediccionDe, calcularPuntos, misPuntos,
    tablaPosiciones, estadisticasGlobales, estadisticasGrupo, prediccionesNominales,
    fechaCorta, horaCorta, fechaPartido, partidosPorFase, partidoPorN, proximoPartido,
  };
})();
