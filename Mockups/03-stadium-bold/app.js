/* =============================================================================
 * Stadium Bold — App.js
 * SPA router + render de todas las pantallas
 * Polla | Mundial 2026
 * ============================================================================= */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // ESTADO GLOBAL DE LA APP
  // ---------------------------------------------------------------------------
  var STATE = {
    // Predicciones editadas por el usuario (persistidas en localStorage)
    predicciones: {},
    // Wizard crear grupo
    wizard: {
      fase: 1,
      datos: { nombre: "", descripcion: "" },
      reglas: null,
      partidos: null, // set de ns seleccionados
    },
    // Tab activa en vista de grupo
    grupoTab: "predicciones",
    // Tema actual
    tema: "dark",
  };

  var P = window.POLLA;
  var GRUPO_DEMO_ID = "g-oficina";

  // ---------------------------------------------------------------------------
  // INICIALIZACIÓN
  // ---------------------------------------------------------------------------
  function init() {
    // Cargar tema
    var temaSaved = localStorage.getItem("stadium_tema") || "dark";
    aplicarTema(temaSaved);

    // Cargar predicciones guardadas
    try {
      var pred = localStorage.getItem("stadium_predicciones");
      if (pred) STATE.predicciones = JSON.parse(pred);
    } catch (e) { STATE.predicciones = {}; }

    // Inicializar reglas wizard
    STATE.wizard.reglas = Object.assign({}, P.REGLAS);

    // Inicializar partidos wizard (todos seleccionados)
    STATE.wizard.partidos = new Set(P.PARTIDOS.map(function (m) { return m.n; }));

    // Escuchar cambios de hash
    window.addEventListener("hashchange", render);
    render();
  }

  // ---------------------------------------------------------------------------
  // TEMA
  // ---------------------------------------------------------------------------
  function aplicarTema(t) {
    STATE.tema = t;
    document.documentElement.className = t;
    localStorage.setItem("stadium_tema", t);
  }

  function toggleTema() {
    aplicarTema(STATE.tema === "dark" ? "light" : "dark");
  }

  // ---------------------------------------------------------------------------
  // ROUTER
  // ---------------------------------------------------------------------------
  function getRoute() {
    var hash = window.location.hash || "#/login";
    return hash.replace(/^#/, "");
  }

  function navTo(path) {
    window.location.hash = "#" + path;
  }

  function render() {
    var route = getRoute();
    var app = document.getElementById("app");

    // Sidebar y nav solo en rutas autenticadas
    var authenticated = route !== "/login" && route !== "/";
    var html = "";

    if (authenticated) {
      html += renderSidebar(route);
    }

    // Determinar pantalla
    var content = "";
    if (route === "/login" || route === "" || route === "/") {
      content = renderLogin();
    } else if (route === "/dashboard") {
      content = renderDashboard();
    } else if (route === "/crear") {
      content = renderCrearGrupo();
    } else if (route === "/buscar") {
      content = renderBuscar();
    } else if (route.indexOf("/grupo/" + GRUPO_DEMO_ID + "/prediccion/") === 0) {
      var nStr = route.split("/prediccion/")[1];
      var n = parseInt(nStr, 10);
      content = renderDetallePrediccion(n);
    } else if (route === "/grupo/" + GRUPO_DEMO_ID) {
      content = renderGrupo();
    } else if (route.indexOf("/grupo/") === 0) {
      // Otros grupos redirigen al demo
      navTo("/grupo/" + GRUPO_DEMO_ID);
      return;
    } else {
      content = renderLogin();
    }

    html += '<main class="app-content animate-fade-in" id="main-content">' + content + "</main>";

    if (authenticated) {
      html += renderBottomNav(route);
    }

    app.innerHTML = html;
    bindEvents(route);
  }

  // ---------------------------------------------------------------------------
  // NAVEGACIÓN — Sidebar y Bottom Nav
  // ---------------------------------------------------------------------------
  function renderSidebar(route) {
    var navItems = [
      { path: "/dashboard", label: "Mis Grupos", icon: iconHome() },
      { path: "/crear",     label: "Crear Grupo", icon: iconPlus() },
      { path: "/buscar",    label: "Buscar Grupo", icon: iconSearch() },
      { path: "/grupo/" + GRUPO_DEMO_ID, label: "La Oficina 2026", icon: iconTrophy() },
    ];

    var items = navItems.map(function (item) {
      var active = route === item.path || route.indexOf(item.path) === 0 && item.path !== "/dashboard";
      if (item.path === "/dashboard") active = route === "/dashboard";
      return (
        '<button class="sidebar-nav-item ' + (active ? "active" : "") + '" data-nav="' + item.path + '" aria-label="Ir a ' + item.label + '">' +
        item.icon +
        "<span>" + item.label + "</span>" +
        "</button>"
      );
    }).join("");

    return (
      '<nav class="sidebar" role="navigation" aria-label="Navegación principal">' +
      '<div class="sidebar-brand">' +
      '<div class="brand-mark">P<span>O</span>LLA</div>' +
      '<div class="text-overline" style="margin-top:4px">Mundial 2026</div>' +
      '</div>' +
      items +
      '<div style="flex:1"></div>' +
      '<div style="padding:var(--space-4) var(--space-6)">' +
      renderThemeToggle() +
      '</div>' +
      '<div style="padding:var(--space-2) var(--space-6) calc(var(--space-4) + env(safe-area-inset-bottom))">' +
      '<div style="display:flex;align-items:center;gap:var(--space-2)">' +
      renderAvatar(P.USUARIO, "sm") +
      '<div style="font-size:var(--text-xs);color:var(--text-muted)">' + esc(P.USUARIO.nombre) + '</div>' +
      '</div>' +
      '</div>' +
      '</nav>'
    );
  }

  function renderBottomNav(route) {
    var isGrupo = route.indexOf("/grupo/") === 0;
    var items = [
      { path: "/dashboard", label: "Grupos", icon: iconHome(), active: route === "/dashboard" },
      { path: "/crear",     label: "Crear",  icon: iconPlus(), active: route === "/crear" },
      { path: "/buscar",    label: "Buscar", icon: iconSearch(), active: route === "/buscar" },
      { path: "/grupo/" + GRUPO_DEMO_ID, label: "Polla", icon: iconTrophy(), active: isGrupo },
    ];

    var btns = items.map(function (item) {
      return (
        '<button class="bottom-nav-item ' + (item.active ? "active" : "") + '" data-nav="' + item.path + '" aria-label="' + item.label + '">' +
        item.icon +
        "<span>" + item.label + "</span>" +
        "</button>"
      );
    }).join("");

    return '<nav class="bottom-nav" role="navigation" aria-label="Navegación">' + btns + "</nav>";
  }

  function renderThemeToggle() {
    var label = STATE.tema === "dark" ? "☀️ Día" : "🌙 Noche";
    return '<button class="theme-toggle" id="theme-toggle" aria-label="Cambiar tema">' + label + "</button>";
  }

  // ---------------------------------------------------------------------------
  // PANTALLA: LOGIN / REGISTRO
  // ---------------------------------------------------------------------------
  function renderLogin() {
    return (
      '<div style="min-height:100dvh;display:flex;flex-direction:column;">' +
      // Hero
      '<div class="login-hero">' +
      '<div style="position:absolute;top:var(--space-4);right:var(--space-4);z-index:10">' + renderThemeToggle() + "</div>" +
      '<div class="login-logo">P<span>O</span>LLA</div>' +
      '<div class="login-tagline">Mundial 2026 · Quiniela con tus amigos</div>' +
      '<div style="margin-top:var(--space-4);font-size:2.5rem">🏆⚽🏟️</div>' +
      '</div>' +
      // Form
      '<div class="login-form-wrap">' +
      '<div class="login-tabs">' +
      '<button class="login-tab-btn active" id="tab-login" aria-selected="true">Ingresar</button>' +
      '<button class="login-tab-btn" id="tab-registro" aria-selected="false">Registrarse</button>' +
      '</div>' +
      '<div id="login-form-area">' + renderLoginForm() + '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function renderLoginForm() {
    return (
      '<form id="form-login" novalidate>' +
      '<div style="display:flex;gap:8px;align-items:flex-start;background:var(--surface-2,rgba(255,255,255,.06));border:1px solid var(--border,rgba(255,255,255,.12));border-radius:8px;padding:12px 14px;margin-bottom:var(--space-4);font-size:var(--text-sm,13px);line-height:1.5;">' +
      '<span aria-hidden="true">🔑</span><span><strong>ACCESO DEMO</strong><br>Usuario: <code>' + P.CREDENCIALES.usuario + '</code><br>Clave: <code>' + P.CREDENCIALES.clave + '</code><br><span style="opacity:.75">(ya vienen precargados)</span></span>' +
      '</div>' +
      '<button type="button" class="btn btn-google btn-full" id="btn-google" style="margin-bottom:var(--space-4)">' +
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>' +
      'Continuar con Google' +
      '</button>' +
      '<div class="divider" style="margin-bottom:var(--space-4)"><span>o</span></div>' +
      '<div class="form-group" style="margin-bottom:var(--space-3)">' +
      '<label class="form-label" for="login-email">Correo electrónico</label>' +
      '<input class="form-input" type="email" id="login-email" name="email" value="' + P.CREDENCIALES.usuario + '" placeholder="tu@correo.com" autocomplete="email" required aria-required="true">' +
      '<span class="form-error" id="login-email-err" role="alert" aria-live="polite"></span>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:var(--space-2)">' +
      '<label class="form-label" for="login-pass">Contraseña</label>' +
      '<input class="form-input" type="password" id="login-pass" name="password" value="' + P.CREDENCIALES.clave + '" placeholder="••••••••" autocomplete="current-password" required aria-required="true">' +
      '<span class="form-error" id="login-pass-err" role="alert" aria-live="polite"></span>' +
      '</div>' +
      '<button type="button" style="font-size:var(--text-sm);color:var(--text-accent);background:none;border:none;cursor:pointer;margin-bottom:var(--space-4)">¿Olvidaste tu contraseña?</button>' +
      '<button type="submit" class="btn btn-primary btn-full btn-lg">Iniciar sesión</button>' +
      '</form>'
    );
  }

  function renderRegistroForm() {
    return (
      '<form id="form-registro" novalidate>' +
      '<button type="button" class="btn btn-google btn-full" id="btn-google-reg" style="margin-bottom:var(--space-4)">' +
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>' +
      'Continuar con Google' +
      '</button>' +
      '<div class="divider" style="margin-bottom:var(--space-4)"><span>o</span></div>' +
      '<div class="form-group" style="margin-bottom:var(--space-3)">' +
      '<label class="form-label" for="reg-nombre">Nombre completo</label>' +
      '<input class="form-input" type="text" id="reg-nombre" placeholder="Andrés Ramírez" autocomplete="name" required aria-required="true">' +
      '<span class="form-error" id="reg-nombre-err" aria-live="polite"></span>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:var(--space-3)">' +
      '<label class="form-label" for="reg-email">Correo electrónico</label>' +
      '<input class="form-input" type="email" id="reg-email" placeholder="tu@correo.com" autocomplete="email" required aria-required="true">' +
      '<span class="form-error" id="reg-email-err" aria-live="polite"></span>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:var(--space-3)">' +
      '<label class="form-label" for="reg-pass">Contraseña</label>' +
      '<input class="form-input" type="password" id="reg-pass" placeholder="Mín. 8 caracteres" autocomplete="new-password" required aria-required="true">' +
      '<span class="form-error" id="reg-pass-err" aria-live="polite"></span>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:var(--space-3)">' +
      '<label class="form-label" for="reg-pass2">Confirmar contraseña</label>' +
      '<input class="form-input" type="password" id="reg-pass2" placeholder="Repite la contraseña" autocomplete="new-password" required aria-required="true">' +
      '<span class="form-error" id="reg-pass2-err" aria-live="polite"></span>' +
      '</div>' +
      '<label class="form-checkbox" style="margin-bottom:var(--space-4)">' +
      '<input type="checkbox" id="reg-terms" aria-required="true">' +
      '<span style="font-size:var(--text-sm);color:var(--text-secondary)">Acepto los <a href="#" style="color:var(--accent-primary)">Términos y condiciones</a></span>' +
      '</label>' +
      '<button type="submit" class="btn btn-primary btn-full btn-lg">Crear cuenta</button>' +
      '</form>'
    );
  }

  // ---------------------------------------------------------------------------
  // PANTALLA: DASHBOARD
  // ---------------------------------------------------------------------------
  function renderDashboard() {
    var usuario = P.USUARIO;
    var grupos = P.MIS_GRUPOS;

    var gruposHtml = grupos.length === 0
      ? renderEmptyState("🏟️", "Sin grupos aún", "Crea o únete a un grupo para comenzar.")
      : '<div class="stagger" style="display:flex;flex-direction:column;gap:var(--space-3)">' +
        grupos.map(renderGrupoCard).join("") +
        '</div>';

    return (
      // Greeting hero
      '<div class="dashboard-greeting">' +
      '<div style="position:absolute;top:var(--space-4);right:var(--space-4)">' + renderThemeToggle() + '</div>' +
      '<div class="text-overline" style="margin-bottom:var(--space-1)">Bienvenido</div>' +
      '<div style="font-family:var(--font-display);font-size:var(--text-3xl);text-transform:uppercase;letter-spacing:-0.02em;line-height:1.1">' +
      esc(usuario.nombre.split(" ")[0]) +
      '</div>' +
      '<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-1)">Mundial 2026 · ' +
      grupos.length + ' grupos activos</div>' +
      '</div>' +
      // Acciones
      '<div class="dashboard-actions" style="padding:var(--space-4);margin-top:0">' +
      '<button class="action-card" data-nav="/crear" aria-label="Crear un nuevo grupo">' +
      '<div class="action-card-icon">➕</div>' +
      '<div class="action-card-label">Crear Grupo</div>' +
      '</button>' +
      '<button class="action-card" data-nav="/buscar" aria-label="Buscar y unirse a un grupo">' +
      '<div class="action-card-icon">🔍</div>' +
      '<div class="action-card-label">Buscar Grupo</div>' +
      '</button>' +
      '</div>' +
      // Mis Grupos
      '<div style="padding:0 var(--space-4) var(--space-4)">' +
      '<div class="section-header">' +
      '<div class="section-title" style="padding-left:16px">Mis Grupos</div>' +
      '</div>' +
      gruposHtml +
      '</div>'
    );
  }

  function renderGrupoCard(g) {
    var estadoBadge = "";
    if (g.estado === "Activo")      estadoBadge = '<span class="badge badge-active">Activo</span>';
    else if (g.estado === "Próximo") estadoBadge = '<span class="badge badge-upcoming">Próximo</span>';
    else                            estadoBadge = '<span class="badge badge-finished">Finalizado</span>';

    var posLabel = g.posicion === 1 ? "🥇 Lider" : "Vas " + g.posicion + "º";

    return (
      '<div class="grupo-card animate-fade-in" data-nav="/grupo/' + GRUPO_DEMO_ID + '" role="article" tabindex="0" aria-label="Grupo ' + esc(g.nombre) + '">' +
      '<div class="grupo-card-header">' +
      '<div class="grupo-card-name">' + esc(g.nombre) + '</div>' +
      estadoBadge +
      '</div>' +
      '<div class="grupo-card-meta">' +
      '<span class="grupo-card-stat">⚽ ' + g.torneo + '</span>' +
      '<span class="grupo-card-stat">👥 ' + g.participantes + ' participantes</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-1)">' +
      '<span class="grupo-card-pos">' + posLabel + '</span>' +
      '<button class="btn btn-sm btn-secondary" data-nav="/grupo/' + GRUPO_DEMO_ID + '">Ver grupo</button>' +
      '</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------------
  // PANTALLA: WIZARD CREAR GRUPO
  // ---------------------------------------------------------------------------
  function renderCrearGrupo() {
    var fase = STATE.wizard.fase;

    var steps = [
      { n: 1, label: "Datos" },
      { n: 2, label: "Reglas" },
      { n: 3, label: "Partidos" },
    ];

    var stepperHtml = '<div class="wizard-stepper" role="list" aria-label="Progreso del formulario">';
    steps.forEach(function (step, i) {
      var estado = step.n < fase ? "done" : step.n === fase ? "active" : "";
      if (i > 0) {
        stepperHtml += '<div class="wizard-step-line ' + (step.n <= fase ? "done" : "") + '"></div>';
      }
      stepperHtml += (
        '<div class="wizard-step" role="listitem">' +
        '<div class="wizard-step-circle ' + estado + '" aria-current="' + (step.n === fase ? "step" : "false") + '">' +
        (step.n < fase ? "✓" : step.n) +
        '</div>' +
        '<span class="wizard-step-label ' + (step.n === fase ? "active" : "") + '">' + step.label + '</span>' +
        '</div>'
      );
    });
    stepperHtml += '</div>';

    var bodyHtml = "";
    if (fase === 1) bodyHtml = renderWizardFase1();
    else if (fase === 2) bodyHtml = renderWizardFase2();
    else bodyHtml = renderWizardFase3();

    return (
      '<div class="page-header">' +
      '<button class="btn btn-ghost btn-sm" data-nav="/dashboard" aria-label="Volver al inicio">' + iconChevronLeft() + '</button>' +
      '<div class="page-title">Crear Grupo</div>' +
      renderThemeToggle() +
      '</div>' +
      '<div style="background:var(--bg-surface);border-bottom:1px solid var(--border-subtle)">' +
      stepperHtml +
      '</div>' +
      bodyHtml
    );
  }

  function renderWizardFase1() {
    var d = STATE.wizard.datos;
    return (
      '<div style="padding:var(--space-4);max-width:600px;margin:0 auto" class="animate-fade-in">' +
      '<div class="text-overline" style="margin-bottom:var(--space-4)">Fase 1 · Datos del grupo</div>' +
      '<form id="wizard-f1">' +
      '<div class="form-group" style="margin-bottom:var(--space-4)">' +
      '<label class="form-label" for="w-nombre">Nombre del grupo <span style="color:var(--text-danger)">*</span></label>' +
      '<input class="form-input" type="text" id="w-nombre" placeholder="Ej: Los Pibes del Barrio" minlength="3" maxlength="50" required value="' + esc(d.nombre) + '" aria-required="true">' +
      '<span class="form-error" id="w-nombre-err" aria-live="polite"></span>' +
      '<span class="form-hint">Entre 3 y 50 caracteres</span>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:var(--space-4)">' +
      '<label class="form-label" for="w-desc">Descripción <span style="color:var(--text-muted);font-weight:400">(opcional)</span></label>' +
      '<textarea class="form-input" id="w-desc" placeholder="Describe tu grupo..." maxlength="280" rows="3" style="resize:vertical;min-height:80px">' + esc(d.descripcion) + '</textarea>' +
      '<span class="form-hint" id="w-desc-count">' + d.descripcion.length + '/280</span>' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:var(--space-6)">' +
      '<label class="form-label">Torneo</label>' +
      '<div class="form-input" style="background:var(--bg-muted);cursor:not-allowed;display:flex;align-items:center;gap:var(--space-2)">' +
      '<span>🏆</span><span>Mundial 2026</span>' +
      '<span class="badge badge-active" style="margin-left:auto">Fijo</span>' +
      '</div>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary btn-full btn-lg">Siguiente: Reglas</button>' +
      '</form>' +
      '</div>'
    );
  }

  function renderWizardFase2() {
    var r = STATE.wizard.reglas;
    var sumaP = r.premio_primer_lugar + r.premio_segundo_lugar + r.premio_tercer_lugar;
    var sumaOk = sumaP === 100;

    var tooltips = {
      pts_marcador_exacto: "Puntos por acertar el marcador exacto (goles local y visitante).",
      pts_ganador: "Puntos por acertar solo el ganador o empate (sin importar goles).",
      pts_gol_acertado: "Puntos por cada gol que aciertes (local o visitante) sin acertar el marcador completo.",
      pts_prediccion_unica: "Puntos extra si eres el único del grupo en acertar el marcador exacto.",
      bono_dieciseisavos: "Puntos adicionales por marcador exacto en dieciseisavos de final.",
      bono_octavos: "Puntos adicionales por marcador exacto en octavos de final.",
      bono_cuartos: "Puntos adicionales por marcador exacto en cuartos de final.",
      bono_semifinales: "Puntos adicionales por marcador exacto en semifinales.",
      bono_final: "Puntos adicionales por marcador exacto en la gran final.",
      valor_apuesta: "Cuota de inscripción por persona (en pesos colombianos).",
      premio_primer_lugar: "Porcentaje del pozo para el primer lugar.",
      premio_segundo_lugar: "Porcentaje del pozo para el segundo lugar.",
      premio_tercer_lugar: "Porcentaje del pozo para el tercer lugar.",
    };

    function field(key, label, tipo) {
      tipo = tipo || "number";
      var val = r[key];
      var isCop = key === "valor_apuesta";
      return (
        '<div class="form-group" style="margin-bottom:var(--space-3)">' +
        '<div style="display:flex;align-items:center;gap:var(--space-2)">' +
        '<label class="form-label" for="r-' + key + '">' + label + (isCop ? ' (COP)' : '') + '</label>' +
        '<div class="tooltip-wrap">' +
        '<span class="tooltip-icon" tabindex="0" aria-label="Información: ' + label + '">?</span>' +
        '<div class="tooltip-popup" role="tooltip">' + tooltips[key] + '</div>' +
        '</div>' +
        '</div>' +
        '<input class="form-input regla-input" type="number" id="r-' + key + '" data-key="' + key + '" value="' + val + '" min="0"' + (isCop ? ' step="5000"' : ' max="20"') + ' style="font-size:16px">' +
        '</div>'
      );
    }

    return (
      '<div style="padding:var(--space-4);max-width:600px;margin:0 auto" class="animate-fade-in">' +
      '<div class="text-overline" style="margin-bottom:var(--space-4)">Fase 2 · Reglas de puntuación</div>' +
      // Puntos
      '<div class="card" style="margin-bottom:var(--space-4)">' +
      '<div style="padding:var(--space-3) var(--space-4);background:var(--bg-raised);border-bottom:1px solid var(--border-subtle)">' +
      '<div class="section-title" style="font-size:var(--text-base)">Puntos por predicción</div>' +
      '</div>' +
      '<div style="padding:var(--space-4)">' +
      field("pts_marcador_exacto", "Marcador exacto") +
      field("pts_ganador", "Acertar ganador") +
      field("pts_gol_acertado", "Gol acertado") +
      field("pts_prediccion_unica", "Predicción única") +
      '</div>' +
      '</div>' +
      // Bonos
      '<div class="card" style="margin-bottom:var(--space-4)">' +
      '<div style="padding:var(--space-3) var(--space-4);background:var(--bg-raised);border-bottom:1px solid var(--border-subtle)">' +
      '<div class="section-title" style="font-size:var(--text-base)">Bonos por fase eliminatoria</div>' +
      '</div>' +
      '<div style="padding:var(--space-4)">' +
      field("bono_dieciseisavos", "Dieciseisavos") +
      field("bono_octavos", "Octavos de final") +
      field("bono_cuartos", "Cuartos de final") +
      field("bono_semifinales", "Semifinales") +
      field("bono_final", "Gran Final") +
      '</div>' +
      '</div>' +
      // Apuesta y premios
      '<div class="card" style="margin-bottom:var(--space-4)">' +
      '<div style="padding:var(--space-3) var(--space-4);background:var(--bg-raised);border-bottom:1px solid var(--border-subtle)">' +
      '<div class="section-title" style="font-size:var(--text-base)">Apuesta y premios</div>' +
      '</div>' +
      '<div style="padding:var(--space-4)">' +
      field("valor_apuesta", "Valor apuesta") +
      '<div style="padding:var(--space-3);background:var(--bg-raised);border-radius:var(--radius-lg);margin-bottom:var(--space-3)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">' +
      '<span style="font-size:var(--text-sm);color:var(--text-secondary)">Total distribución de premios</span>' +
      '<span id="premios-suma" style="font-family:var(--font-display);font-size:var(--text-xl);color:' + (sumaOk ? 'var(--c-lime-400)' : 'var(--c-magenta-400)') + '">' + sumaP + '%</span>' +
      '</div>' +
      '<span id="premios-error" class="form-error" style="' + (sumaOk ? 'display:none' : '') + '">La suma de premios debe ser exactamente 100%. Actualmente: ' + sumaP + '%</span>' +
      '</div>' +
      field("premio_primer_lugar", "1er lugar (%)") +
      field("premio_segundo_lugar", "2do lugar (%)") +
      field("premio_tercer_lugar", "3er lugar (%)") +
      '</div>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-3)">' +
      '<button class="btn btn-ghost btn-full" id="wizard-back">Atrás</button>' +
      '<button class="btn btn-primary btn-full btn-lg" id="wizard-next-2" ' + (sumaOk ? "" : "disabled") + '>Siguiente: Partidos</button>' +
      '</div>' +
      '</div>'
    );
  }

  function renderWizardFase3() {
    var selectedSet = STATE.wizard.partidos;

    var fasesHtml = P.FASES.map(function (fase) {
      var partidos = P.partidosPorFase(fase.id);
      var totalFase = partidos.length;
      var selFase = partidos.filter(function (m) { return selectedSet.has(m.n); }).length;
      var allSel = selFase === totalFase;
      var noneSel = selFase === 0;
      var indeterminate = !allSel && selFase > 0;

      var partidosHtml = partidos.map(function (m) {
        var sel = selectedSet.has(m.n);
        var localLabel = P.equiposDefinidos(m) ? P.banderaEquipo(m.local) + " " + P.nombreCortoEquipo(m.local) : m.local;
        var visLabel = P.equiposDefinidos(m) ? P.banderaEquipo(m.visitante) + " " + P.nombreCortoEquipo(m.visitante) : m.visitante;
        return (
          '<label class="form-checkbox" style="padding:var(--space-2) var(--space-4);border-bottom:1px solid var(--border-subtle);gap:var(--space-3)">' +
          '<input type="checkbox" class="partido-check" data-n="' + m.n + '" data-fase="' + fase.id + '" ' + (sel ? "checked" : "") + ' aria-label="Partido ' + localLabel + ' vs ' + visLabel + '">' +
          '<div style="flex:1;display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)">' +
          '<div style="font-size:var(--text-sm)">' +
          '<span style="color:var(--text-primary)">' + esc(localLabel) + '</span>' +
          '<span style="color:var(--text-muted);margin:0 var(--space-1)">vs</span>' +
          '<span style="color:var(--text-primary)">' + esc(visLabel) + '</span>' +
          '</div>' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);white-space:nowrap">' + P.fechaCorta(m) + '</div>' +
          '</div>' +
          '</label>'
        );
      }).join("");

      return (
        '<div class="card" style="margin-bottom:var(--space-3)" data-fase-block="' + fase.id + '">' +
        '<div class="phase-header">' +
        '<label class="form-checkbox" style="padding:0">' +
        '<input type="checkbox" class="fase-master-check" data-fase="' + fase.id + '" ' +
        (allSel ? "checked" : "") + ' ' +
        (indeterminate ? 'data-indeterminate="true"' : '') +
        ' aria-label="Seleccionar toda la fase ' + fase.nombre + '">' +
        '<span class="phase-header-title">' + fase.nombre + '</span>' +
        '</label>' +
        '<span class="phase-count">' + selFase + '/' + totalFase + '</span>' +
        '</div>' +
        '<div class="fase-partidos-list">' + partidosHtml + '</div>' +
        '</div>'
      );
    }).join("");

    var totalSel = selectedSet.size;

    return (
      '<div style="padding:var(--space-4);max-width:700px;margin:0 auto" class="animate-fade-in">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">' +
      '<div class="text-overline">Fase 3 · Seleccionar partidos</div>' +
      '<span class="badge badge-active" id="total-sel-badge">' + totalSel + ' seleccionados</span>' +
      '</div>' +
      fasesHtml +
      '<div style="position:sticky;bottom:calc(var(--nav-height-mobile) + env(safe-area-inset-bottom) + var(--space-2));display:flex;gap:var(--space-3);padding:var(--space-3);background:var(--bg-base);border-top:1px solid var(--border-subtle);margin:0 -var(--space-4)">' +
      '<button class="btn btn-ghost btn-full" id="wizard-back">Atrás</button>' +
      '<button class="btn btn-primary btn-full btn-lg" id="btn-crear-grupo">Crear Grupo</button>' +
      '</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------------
  // PANTALLA: BUSCAR / UNIRSE
  // ---------------------------------------------------------------------------
  function renderBuscar() {
    return (
      '<div class="page-header">' +
      '<button class="btn btn-ghost btn-sm" data-nav="/dashboard" aria-label="Volver">' + iconChevronLeft() + '</button>' +
      '<div class="page-title">Buscar Grupo</div>' +
      renderThemeToggle() +
      '</div>' +
      '<div style="padding:var(--space-4);max-width:500px;margin:0 auto">' +
      '<div style="background:var(--grad-hero);border-radius:var(--radius-2xl);padding:var(--space-6) var(--space-4);text-align:center;margin-bottom:var(--space-6)">' +
      '<div style="font-size:3rem;margin-bottom:var(--space-2)">🔍</div>' +
      '<div style="font-family:var(--font-display);font-size:var(--text-2xl);text-transform:uppercase;color:var(--text-primary)">Unirse a un grupo</div>' +
      '<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-1)">Pide el código de invitación a quien creó el grupo</div>' +
      '</div>' +
      '<form id="buscar-form" novalidate>' +
      '<div class="form-group" style="margin-bottom:var(--space-3)">' +
      '<label class="form-label" for="buscar-codigo">Código del grupo</label>' +
      '<input class="form-input" type="text" id="buscar-codigo" placeholder="Ej: PLLA26" maxlength="10" style="text-transform:uppercase;font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.15em;text-align:center" autocomplete="off" aria-required="true">' +
      '<span class="form-error" id="buscar-error" aria-live="polite"></span>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary btn-full btn-lg">Buscar</button>' +
      '</form>' +
      '<div id="buscar-result-area" style="margin-top:var(--space-5)"></div>' +
      '<div style="margin-top:var(--space-4);padding:var(--space-3);background:var(--bg-surface);border-radius:var(--radius-xl);border:1px solid var(--border-subtle)">' +
      '<div class="text-overline" style="margin-bottom:var(--space-1)">Consejo</div>' +
      '<div style="font-size:var(--text-sm);color:var(--text-secondary)">El código de tu grupo demo es <strong style="color:var(--accent-primary);letter-spacing:0.1em">PLLA26</strong> — pruébalo!</div>' +
      '</div>' +
      '</div>'
    );
  }

  function renderBuscarResultado() {
    var g = P.GRUPO_DEMO;
    var r = g.reglas;
    return (
      '<div class="buscar-result">' +
      '<div style="font-family:var(--font-display);font-size:var(--text-3xl);text-transform:uppercase;color:var(--accent-primary);margin-bottom:var(--space-1)">' + esc(g.nombre) + '</div>' +
      '<div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-4)">' + esc(g.descripcion) + '</div>' +
      '<div style="background:var(--bg-raised);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-4)">' +
      '<div class="summary-row"><span class="summary-key">Torneo</span><span class="summary-val">🏆 ' + esc(g.torneo) + '</span></div>' +
      '<div class="summary-row"><span class="summary-key">Participantes</span><span class="summary-val">👥 ' + g.participantes.length + '</span></div>' +
      '<div class="summary-row"><span class="summary-key">Valor apuesta</span><span class="summary-val">' + formatCOP(r.valor_apuesta) + '</span></div>' +
      '<div class="summary-row"><span class="summary-key">Organiza</span><span class="summary-val">Andrés Ramírez</span></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-full btn-lg" id="btn-unirme">Unirme al grupo</button>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------------
  // PANTALLA: VISTA DE GRUPO — 6 tabs
  // ---------------------------------------------------------------------------
  function renderGrupo() {
    var g = P.GRUPO_DEMO;
    var tab = STATE.grupoTab;

    var tabs = [
      { id: "predicciones", label: "Mis Predicciones" },
      { id: "tabla",        label: "Tabla" },
      { id: "partidos",     label: "Partidos" },
      { id: "reglas",       label: "Reglas" },
      { id: "participantes",label: "Participantes" },
      { id: "config",       label: "Config" },
    ];

    var tabsHtml = tabs.map(function (t) {
      return '<button class="tab-item ' + (tab === t.id ? "active" : "") + '" data-tab="' + t.id + '" role="tab" aria-selected="' + (tab === t.id) + '">' + t.label + '</button>';
    }).join("");

    var tabContent = "";
    if (tab === "predicciones") tabContent = renderTabPredicciones(g);
    else if (tab === "tabla")   tabContent = renderTabTabla(g);
    else if (tab === "partidos") tabContent = renderTabPartidos(g);
    else if (tab === "reglas")  tabContent = renderTabReglas(g);
    else if (tab === "participantes") tabContent = renderTabParticipantes(g);
    else if (tab === "config")  tabContent = renderTabConfig(g);

    return (
      // Header de grupo
      '<div class="grupo-header">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-2)">' +
      '<button class="btn btn-ghost btn-sm" data-nav="/dashboard" aria-label="Volver" style="padding:var(--space-1);min-height:36px">' + iconChevronLeft() + '<span style="font-size:var(--text-xs)">Grupos</span></button>' +
      renderThemeToggle() +
      '</div>' +
      '<div class="grupo-header-name">' + esc(g.nombre) + '</div>' +
      '<div style="display:flex;align-items:center;gap:var(--space-3);margin-top:var(--space-2);flex-wrap:wrap">' +
      '<span style="font-size:var(--text-sm);color:var(--text-secondary)">⚽ ' + esc(g.torneo) + '</span>' +
      '<span style="font-size:var(--text-sm);color:var(--text-secondary)">👥 ' + g.participantes.length + ' participantes</span>' +
      '<div class="invite-code" style="padding:var(--space-1) var(--space-3);border-radius:var(--radius-pill)">' +
      '<span style="font-family:var(--font-display);font-size:var(--text-base);letter-spacing:0.1em;color:var(--accent-primary)">' + g.codigo + '</span>' +
      '<button class="btn-icon btn-sm" id="btn-copiar-codigo" aria-label="Copiar código de invitación" style="min-height:32px;min-width:32px;padding:4px">' + iconCopy() + '</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // Tabs
      '<div class="tabs" role="tablist" aria-label="Secciones del grupo">' + tabsHtml + '</div>' +
      // Contenido
      '<div role="tabpanel" class="animate-fade-in">' + tabContent + '</div>'
    );
  }

  // --- TAB: Mis Predicciones ---
  function renderTabPredicciones(g) {
    var partidos = P.PARTIDOS.slice(0, 40); // primeros 40 para no abrumar
    var html = '<div style="padding:var(--space-3) var(--space-4) var(--space-4)">' +
      '<div class="text-overline" style="margin-bottom:var(--space-3)">Toca una tarjeta para ver estadísticas del partido</div>';

    partidos.forEach(function (m) {
      html += renderPartidoCard(m, g, true);
    });

    html += '</div>';
    return html;
  }

  function renderPartidoCard(m, g, clickable) {
    var estado = P.estadoPartido(m);
    var abierta = P.prediccionAbierta(m, g.reglas);
    var definidos = P.equiposDefinidos(m);
    var localLabel = P.banderaEquipo(m.local) + " " + P.nombreCortoEquipo(m.local);
    var visLabel   = P.banderaEquipo(m.visitante) + " " + P.nombreCortoEquipo(m.visitante);
    var real = P.resultadoReal(m);
    var pred = getPredStorage(m.n) || P.miPrediccion(m);
    var puntos = P.misPuntos(m, g.reglas);

    var estadoBadge = "";
    if (estado === "en_vivo")   estadoBadge = '<span class="live-badge"><span class="live-dot"></span>EN VIVO</span>';
    else if (estado === "finalizado") estadoBadge = '<span class="badge badge-finished">Finalizado</span>';
    else                         estadoBadge = '<span class="badge badge-upcoming">' + P.horaCorta(m) + '</span>';

    var matchupHtml = "";
    if (real) {
      // Con marcador real (en vivo o finalizado)
      matchupHtml = (
        '<div class="partido-matchup">' +
        '<div class="partido-team">' +
        '<div class="partido-team-flag">' + P.banderaEquipo(m.local) + '</div>' +
        '<div class="partido-team-name">' + esc(P.nombreCortoEquipo(m.local)) + '</div>' +
        '</div>' +
        '<div class="partido-score-real">' +
        '<span class="partido-score-num">' + real.gl + '</span>' +
        '<span style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--text-muted);padding:0 2px">-</span>' +
        '<span class="partido-score-num">' + real.gv + '</span>' +
        '</div>' +
        '<div class="partido-team">' +
        '<div class="partido-team-flag">' + P.banderaEquipo(m.visitante) + '</div>' +
        '<div class="partido-team-name">' + esc(P.nombreCortoEquipo(m.visitante)) + '</div>' +
        '</div>' +
        '</div>'
      );
    } else {
      matchupHtml = (
        '<div class="partido-matchup">' +
        '<div class="partido-team">' +
        '<div class="partido-team-flag">' + P.banderaEquipo(m.local) + '</div>' +
        '<div class="partido-team-name">' + esc(P.nombreCortoEquipo(m.local)) + '</div>' +
        '</div>' +
        '<div class="partido-vs">vs</div>' +
        '<div class="partido-team">' +
        '<div class="partido-team-flag">' + P.banderaEquipo(m.visitante) + '</div>' +
        '<div class="partido-team-name">' + esc(P.nombreCortoEquipo(m.visitante)) + '</div>' +
        '</div>' +
        '</div>'
      );
    }

    // Sección de predicción
    var predHtml = "";
    if (!definidos) {
      predHtml = '<div class="partido-pred-section"><p class="pred-disabled-msg">Los equipos de este partido se conocerán al finalizar la fase anterior.</p></div>';
    } else if (estado === "finalizado") {
      var ptsBadge = puntos > 0
        ? '<span class="badge-points">' + puntos + ' pts</span>'
        : '<span class="badge-points-0">0 pts</span>';
      predHtml = (
        '<div class="partido-pred-section">' +
        '<span style="font-size:var(--text-xs);color:var(--text-muted)">Tu predicción:</span>' +
        '<span style="font-family:var(--font-heading);font-weight:700;color:var(--text-secondary)">' + pred.gl + ' - ' + pred.gv + '</span>' +
        '<div style="flex:1"></div>' +
        ptsBadge +
        '</div>'
      );
    } else if (estado === "en_vivo" || !abierta) {
      predHtml = (
        '<div class="partido-pred-section">' +
        '<span style="font-size:var(--text-xs);color:var(--text-muted)">Tu predicción:</span>' +
        '<span style="font-family:var(--font-heading);font-weight:700;color:var(--text-secondary)">' + pred.gl + ' - ' + pred.gv + '</span>' +
        '<span style="font-size:var(--text-xs);color:var(--text-muted);margin-left:auto">Cerrada</span>' +
        '</div>'
      );
    } else {
      // Abierta y editable
      predHtml = (
        '<div class="partido-pred-section" id="pred-section-' + m.n + '">' +
        '<span style="font-size:var(--text-xs);color:var(--text-muted)">Tu predicción:</span>' +
        '<div class="pred-inputs">' +
        renderStepper(m.n, "gl", pred.gl) +
        '<span style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--text-muted);padding:0 var(--space-1)">-</span>' +
        renderStepper(m.n, "gv", pred.gv) +
        '</div>' +
        '<button class="btn btn-sm btn-secondary" data-save-pred="' + m.n + '" aria-label="Guardar predicción">Guardar</button>' +
        '</div>'
      );
    }

    var clickAttr = clickable
      ? 'data-nav="/grupo/' + GRUPO_DEMO_ID + '/prediccion/' + m.n + '"'
      : '';

    return (
      '<div class="partido-card ' + (clickable ? "card-interactive" : "") + '" ' + clickAttr + ' role="' + (clickable ? "button" : "article") + '" ' + (clickable ? 'tabindex="0" aria-label="Ver detalle del partido ' + P.nombreCortoEquipo(m.local) + ' vs ' + P.nombreCortoEquipo(m.visitante) + '"' : '') + '>' +
      '<div class="partido-card-header">' +
      '<span style="font-size:var(--text-xs);color:var(--text-muted)">' + P.fechaCorta(m) + ' · ' + esc(m.estadio) + '</span>' +
      estadoBadge +
      '</div>' +
      '<div class="partido-card-body">' + matchupHtml + '</div>' +
      predHtml +
      '</div>'
    );
  }

  function renderStepper(n, campo, valor) {
    return (
      '<div class="goal-stepper">' +
      '<button class="goal-stepper-btn" data-stepper-dec data-n="' + n + '" data-campo="' + campo + '" aria-label="Reducir goles">&minus;</button>' +
      '<span class="goal-stepper-value" id="stepper-val-' + n + '-' + campo + '">' + valor + '</span>' +
      '<button class="goal-stepper-btn" data-stepper-inc data-n="' + n + '" data-campo="' + campo + '" aria-label="Aumentar goles">+</button>' +
      '</div>'
    );
  }

  // --- TAB: Tabla de Posiciones ---
  function renderTabTabla(g) {
    var tabla = P.tablaPosiciones(g);
    var top3 = tabla.slice(0, 3);
    var rest = tabla.slice(3);

    // Podio
    var podio = "";
    if (top3.length === 3) {
      var orden = [top3[1], top3[0], top3[2]]; // 2, 1, 3
      var tipos = ["silver", "gold", "bronze"];
      var ranks = [2, 1, 3];
      podio = (
        '<div class="podium" aria-label="Top 3 del podio">' +
        orden.map(function (p, i) {
          var isMe = p.id === P.USUARIO.id;
          return (
            '<div class="podium-item">' +
            renderAvatar(p, "lg") +
            '<div style="font-size:var(--text-xs);text-align:center;color:var(--text-secondary);font-weight:600;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (isMe ? "Tú" : esc(p.nombre.split(" ")[0])) + '</div>' +
            '<div style="font-family:var(--font-display);font-size:var(--text-lg);color:var(--text-primary)">' + p.puntos + ' pts</div>' +
            '<div class="podium-platform ' + tipos[i] + '"><span class="podium-rank">' + ranks[i] + '</span></div>' +
            '</div>'
          );
        }).join("") +
        '</div>'
      );
    }

    var rows = tabla.map(function (p) {
      var isMe = p.id === P.USUARIO.id;
      var posClass = p.posicion === 1 ? " pos-1" : p.posicion === 2 ? " pos-2" : p.posicion === 3 ? " pos-3" : "";
      return (
        '<div class="leaderboard-row ' + (isMe ? "is-me" : "") + '" role="row">' +
        '<div class="leaderboard-pos' + posClass + '">' + p.posicion + '</div>' +
        renderAvatar(p, "sm") +
        '<div class="leaderboard-info">' +
        '<div class="leaderboard-name">' + (isMe ? "Tú · " : "") + esc(p.nombre) + '</div>' +
        '<div class="leaderboard-sub">' + p.aciertos + ' aciertos</div>' +
        '</div>' +
        '<div class="leaderboard-pts">' + p.puntos + '</div>' +
        '</div>'
      );
    }).join("");

    return (
      '<div>' +
      podio +
      '<div style="padding:var(--space-3) var(--space-4)">' +
      '<div class="text-overline" style="margin-bottom:var(--space-2)">Clasificación completa</div>' +
      '</div>' +
      '<div class="leaderboard" role="table" aria-label="Tabla de posiciones">' + rows + '</div>' +
      '</div>'
    );
  }

  // --- TAB: Partidos ---
  function renderTabPartidos(g) {
    var faseActiva = STATE.grupoFaseFiltro || "todos";

    var chipsHtml = '<div style="display:flex;gap:var(--space-2);overflow-x:auto;padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border-subtle);scrollbar-width:none">' +
      '<button class="chip ' + (faseActiva === "todos" ? "active" : "") + '" data-filtro-fase="todos">Todos</button>' +
      P.FASES.map(function (f) {
        return '<button class="chip ' + (faseActiva === f.id ? "active" : "") + '" data-filtro-fase="' + f.id + '">' + f.nombre + '</button>';
      }).join("") +
      '</div>';

    var partidos = faseActiva === "todos" ? P.PARTIDOS : P.PARTIDOS.filter(function (m) { return m.fase === faseActiva; });
    // Mostrar máx 50
    partidos = partidos.slice(0, 50);

    var filas = partidos.map(function (m) {
      var estado = P.estadoPartido(m);
      var real = P.resultadoReal(m);
      var pred = getPredStorage(m.n) || P.miPrediccion(m);
      var puntos = P.misPuntos(m, g.reglas);

      var estadoBadge = estado === "en_vivo"
        ? '<span class="live-badge"><span class="live-dot"></span>VIVO</span>'
        : estado === "finalizado"
        ? '<span class="badge badge-finished">Fin.</span>'
        : '<span class="badge badge-upcoming">' + P.horaCorta(m) + '</span>';

      var localStr = P.banderaEquipo(m.local) + " " + P.nombreCortoEquipo(m.local);
      var visStr   = P.banderaEquipo(m.visitante) + " " + P.nombreCortoEquipo(m.visitante);
      var marcadorReal = real ? (real.gl + " - " + real.gv) : "vs";
      var marcadorPred = (pred.gl + " - " + pred.gv);

      var ptsBadge = puntos !== null
        ? (puntos > 0
            ? '<span class="badge-points">' + puntos + ' pts</span>'
            : '<span class="badge-points-0">0 pts</span>')
        : "";

      return (
        '<div class="partido-card card-interactive" data-nav="/grupo/' + GRUPO_DEMO_ID + '/prediccion/' + m.n + '" tabindex="0" aria-label="' + P.nombreCortoEquipo(m.local) + ' vs ' + P.nombreCortoEquipo(m.visitante) + '">' +
        '<div class="partido-card-header">' +
        '<span style="font-size:var(--text-xs);color:var(--text-muted)">' + P.fechaCorta(m) + '</span>' +
        estadoBadge +
        '</div>' +
        '<div style="padding:var(--space-2) var(--space-4);display:flex;align-items:center;gap:var(--space-3)">' +
        '<div style="flex:1;font-size:var(--text-sm);color:var(--text-secondary)">' + esc(localStr) + '</div>' +
        '<div style="font-family:var(--font-heading);font-weight:700;font-size:var(--text-lg);color:' + (real ? 'var(--text-primary)' : 'var(--text-muted)') + '">' + marcadorReal + '</div>' +
        '<div style="flex:1;font-size:var(--text-sm);color:var(--text-secondary);text-align:right">' + esc(visStr) + '</div>' +
        '</div>' +
        '<div class="partido-pred-section" style="justify-content:space-between">' +
        '<span style="font-size:var(--text-xs);color:var(--text-muted)">Pred: <strong>' + marcadorPred + '</strong></span>' +
        ptsBadge +
        '</div>' +
        '</div>'
      );
    }).join("");

    return (
      '<div>' +
      chipsHtml +
      '<div style="padding:var(--space-3) var(--space-4) var(--space-4)">' +
      (filas || renderEmptyState("📅", "Sin partidos", "No hay partidos para esta fase.")) +
      '</div>' +
      '</div>'
    );
  }

  // --- TAB: Reglas ---
  function renderTabReglas(g) {
    var r = g.reglas;
    var participantes = g.participantes;
    var pagaron = participantes.filter(function (p) { return p.pago; }).length;
    var pozo = r.valor_apuesta * pagaron;
    var p1 = Math.round(pozo * r.premio_primer_lugar / 100);
    var p2 = Math.round(pozo * r.premio_segundo_lugar / 100);
    var p3 = Math.round(pozo * r.premio_tercer_lugar / 100);

    return (
      '<div style="padding:var(--space-4)">' +
      // Puntos
      '<div class="card" style="margin-bottom:var(--space-4)">' +
      '<div style="padding:var(--space-3) var(--space-4);background:var(--bg-raised);border-bottom:1px solid var(--border-subtle)">' +
      '<div style="font-family:var(--font-display);font-size:var(--text-lg);text-transform:uppercase">Puntos por predicción</div>' +
      '</div>' +
      '<div class="rules-grid" style="padding:var(--space-4)">' +
      ruleItem(r.pts_marcador_exacto, "Marcador exacto") +
      ruleItem(r.pts_ganador, "Acertar ganador") +
      ruleItem(r.pts_gol_acertado, "Gol acertado") +
      ruleItem(r.pts_prediccion_unica, "Predicción única") +
      '</div>' +
      '</div>' +
      // Bonos
      '<div class="card" style="margin-bottom:var(--space-4)">' +
      '<div style="padding:var(--space-3) var(--space-4);background:var(--bg-raised);border-bottom:1px solid var(--border-subtle)">' +
      '<div style="font-family:var(--font-display);font-size:var(--text-lg);text-transform:uppercase">Bonos por fase eliminatoria</div>' +
      '</div>' +
      '<div class="rules-grid" style="padding:var(--space-4)">' +
      ruleItem(r.bono_dieciseisavos, "Dieciseisavos") +
      ruleItem(r.bono_octavos, "Octavos") +
      ruleItem(r.bono_cuartos, "Cuartos") +
      ruleItem(r.bono_semifinales, "Semifinales") +
      ruleItem(r.bono_final, "Final") +
      '</div>' +
      '</div>' +
      // Pozo y premios
      '<div class="card" style="margin-bottom:var(--space-4)">' +
      '<div style="padding:var(--space-3) var(--space-4);background:var(--bg-raised);border-bottom:1px solid var(--border-subtle)">' +
      '<div style="font-family:var(--font-display);font-size:var(--text-lg);text-transform:uppercase">Apuesta y pozo</div>' +
      '</div>' +
      '<div style="padding:var(--space-4)">' +
      '<div style="text-align:center;margin-bottom:var(--space-4)">' +
      '<div class="text-overline">Pozo acumulado</div>' +
      '<div style="font-family:var(--font-display);font-size:var(--text-4xl);color:var(--accent-gold)">' + formatCOP(pozo) + '</div>' +
      '<div style="font-size:var(--text-xs);color:var(--text-muted)">' + formatCOP(r.valor_apuesta) + ' × ' + pagaron + ' pagaron</div>' +
      '</div>' +
      // Premio 1
      '<div style="margin-bottom:var(--space-3)">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
      '<span style="font-size:var(--text-sm);color:var(--text-secondary)">🥇 Primer lugar (' + r.premio_primer_lugar + '%)</span>' +
      '<strong style="color:var(--c-gold-400)">' + formatCOP(p1) + '</strong>' +
      '</div>' +
      '<div class="prize-bar"><div class="prize-fill-1" style="width:' + r.premio_primer_lugar + '%"></div></div>' +
      '</div>' +
      // Premio 2
      '<div style="margin-bottom:var(--space-3)">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
      '<span style="font-size:var(--text-sm);color:var(--text-secondary)">🥈 Segundo lugar (' + r.premio_segundo_lugar + '%)</span>' +
      '<strong style="color:var(--c-silver-300)">' + formatCOP(p2) + '</strong>' +
      '</div>' +
      '<div class="prize-bar"><div class="prize-fill-2" style="width:' + r.premio_segundo_lugar + '%"></div></div>' +
      '</div>' +
      // Premio 3
      '<div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
      '<span style="font-size:var(--text-sm);color:var(--text-secondary)">🥉 Tercer lugar (' + r.premio_tercer_lugar + '%)</span>' +
      '<strong style="color:var(--c-bronze-400)">' + formatCOP(p3) + '</strong>' +
      '</div>' +
      '<div class="prize-bar"><div class="prize-fill-3" style="width:' + r.premio_tercer_lugar + '%"></div></div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // Cierre
      '<div class="card">' +
      '<div style="padding:var(--space-3) var(--space-4);background:var(--bg-raised);border-bottom:1px solid var(--border-subtle)">' +
      '<div style="font-family:var(--font-display);font-size:var(--text-lg);text-transform:uppercase">Cierre de apuestas</div>' +
      '</div>' +
      '<div style="padding:var(--space-4);font-size:var(--text-sm);color:var(--text-secondary)">' +
      'Las predicciones cierran <strong style="color:var(--text-primary)">' + r.minutos_cierre_prediccion + ' minutos</strong> antes del inicio de cada partido. Una vez cerradas, no pueden modificarse.' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function ruleItem(value, label) {
    return (
      '<div class="rule-item">' +
      '<div class="rule-value">' + value + '</div>' +
      '<div class="rule-label">' + label + '</div>' +
      '</div>'
    );
  }

  // --- TAB: Participantes ---
  function renderTabParticipantes(g) {
    var tabla = P.tablaPosiciones(g);
    var puntosMap = {};
    tabla.forEach(function (f) { puntosMap[f.id] = f.puntos; });

    var rows = g.participantes.map(function (p) {
      var isMe = p.id === P.USUARIO.id;
      var rolBadge = p.rol === "admin"
        ? '<span class="badge badge-admin">Admin</span>'
        : '<span class="badge badge-finished">Jugador</span>';
      var pagoBadge = p.pago
        ? '<span class="badge badge-paid">Pagado</span>'
        : '<span class="badge badge-unpaid">Pendiente</span>';

      return (
        '<div class="leaderboard-row ' + (isMe ? "is-me" : "") + '">' +
        renderAvatar(p, "default") +
        '<div class="leaderboard-info">' +
        '<div class="leaderboard-name">' + (isMe ? "Tú · " : "") + esc(p.nombre) + '</div>' +
        '<div style="display:flex;gap:var(--space-1);margin-top:2px">' + rolBadge + pagoBadge + '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
        '<div style="font-family:var(--font-display);font-size:var(--text-xl);color:var(--accent-primary)">' + (puntosMap[p.id] || 0) + '</div>' +
        '<div style="font-size:var(--text-xs);color:var(--text-muted)">pts</div>' +
        '</div>' +
        '</div>'
      );
    }).join("");

    return (
      '<div>' +
      '<div style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--border-subtle)">' +
      '<span style="font-size:var(--text-sm);color:var(--text-secondary)">👥 ' + g.participantes.length + ' participantes · ' +
      g.participantes.filter(function (p) { return p.pago; }).length + ' han pagado</span>' +
      '</div>' +
      '<div>' + rows + '</div>' +
      '</div>'
    );
  }

  // --- TAB: Configuración ---
  function renderTabConfig(g) {
    return (
      '<div style="padding:var(--space-4)">' +
      // Editar info
      '<div class="config-section">' +
      '<div class="config-section-header">Información del grupo</div>' +
      '<div class="config-section-body">' +
      '<div class="form-group" style="margin-bottom:var(--space-3)">' +
      '<label class="form-label" for="cfg-nombre">Nombre del grupo</label>' +
      '<input class="form-input" type="text" id="cfg-nombre" value="' + esc(g.nombre) + '">' +
      '</div>' +
      '<div class="form-group" style="margin-bottom:var(--space-4)">' +
      '<label class="form-label" for="cfg-desc">Descripción</label>' +
      '<textarea class="form-input" id="cfg-desc" rows="2">' + esc(g.descripcion) + '</textarea>' +
      '</div>' +
      '<button class="btn btn-primary btn-full" id="btn-guardar-config">Guardar cambios</button>' +
      '</div>' +
      '</div>' +
      // Código de invitación
      '<div class="config-section">' +
      '<div class="config-section-header">Código de invitación</div>' +
      '<div class="config-section-body">' +
      '<div class="invite-code" style="margin-bottom:var(--space-3)">' +
      '<span class="invite-code-text">' + g.codigo + '</span>' +
      '<button class="btn-icon btn-sm" id="btn-copiar-cfg" aria-label="Copiar código" style="min-height:40px;min-width:40px">' + iconCopy() + '</button>' +
      '</div>' +
      '<div style="font-size:var(--text-sm);color:var(--text-secondary)">Comparte este código con tus amigos para que se unan al grupo.</div>' +
      '</div>' +
      '</div>' +
      // Peligro
      '<div class="config-section" style="border-color:rgba(225,29,72,0.3)">' +
      '<div class="config-section-header" style="color:var(--c-magenta-400)">Zona de peligro</div>' +
      '<div class="config-section-body">' +
      '<p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3)">Al salir del grupo perderás tu posición y todas tus predicciones en este grupo.</p>' +
      '<button class="btn btn-danger btn-full" id="btn-salir-grupo">Salir del grupo</button>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------------
  // PANTALLA: DETALLE DE PREDICCIÓN
  // ---------------------------------------------------------------------------
  function renderDetallePrediccion(n) {
    var m = P.partidoPorN(n);
    if (!m) {
      return renderEmptyState("❓", "Partido no encontrado", "El partido #" + n + " no existe.");
    }

    var estado = P.estadoPartido(m);
    var abierta = P.prediccionAbierta(m, P.GRUPO_DEMO.reglas);
    var definidos = P.equiposDefinidos(m);
    var real = P.resultadoReal(m);
    var pred = getPredStorage(m.n) || P.miPrediccion(m);
    var statsGlobal = P.estadisticasGlobales(m);
    var statsGrupo = P.estadisticasGrupo(P.GRUPO_DEMO, m);
    var nominales = P.prediccionesNominales(P.GRUPO_DEMO, m);

    // Cabecera del partido (scoreboard)
    var estadoBadge = "";
    if (estado === "en_vivo") estadoBadge = '<span class="live-badge"><span class="live-dot"></span>EN VIVO</span>';
    else if (estado === "finalizado") estadoBadge = '<span class="badge badge-finished">Finalizado</span>';
    else estadoBadge = '<span class="badge badge-upcoming">' + P.horaCorta(m) + '</span>';

    var scoreHtml = "";
    if (real) {
      scoreHtml = (
        '<div class="scoreboard-score-block animate-score-in">' +
        '<span class="scoreboard-score-num">' + real.gl + '</span>' +
        '<span class="scoreboard-score-sep">:</span>' +
        '<span class="scoreboard-score-num">' + real.gv + '</span>' +
        '</div>'
      );
    } else {
      scoreHtml = (
        '<div style="display:flex;flex-direction:column;align-items:center;gap:4px">' +
        '<div style="font-family:var(--font-heading);font-size:var(--text-sm);color:var(--text-muted);text-transform:uppercase;letter-spacing:var(--tracking-widest)">vs</div>' +
        '<div style="font-size:var(--text-xs);color:var(--text-muted)">' + P.fechaCorta(m) + '</div>' +
        '</div>'
      );
    }

    var localLabel = P.banderaEquipo(m.local) + " " + P.etiquetaEquipo(m.local);
    var visLabel   = P.banderaEquipo(m.visitante) + " " + P.etiquetaEquipo(m.visitante);

    // Form de predicción
    var predForm = "";
    if (!definidos) {
      predForm = (
        '<div style="padding:var(--space-4);text-align:center;color:var(--text-muted);font-size:var(--text-sm);font-style:italic">' +
        'Los equipos de este partido se conocerán al finalizar la fase anterior.' +
        '</div>'
      );
    } else if (estado === "finalizado") {
      var puntos = P.misPuntos(m, P.GRUPO_DEMO.reglas);
      predForm = (
        '<div style="padding:var(--space-4);display:flex;align-items:center;justify-content:center;gap:var(--space-4)">' +
        '<div style="text-align:center">' +
        '<div class="text-overline">Tu predicción</div>' +
        '<div style="font-family:var(--font-display);font-size:var(--text-4xl);color:var(--text-secondary)">' + pred.gl + ' - ' + pred.gv + '</div>' +
        '</div>' +
        '<div style="text-align:center">' +
        '<div class="text-overline">Puntos obtenidos</div>' +
        (puntos > 0
          ? '<div style="font-family:var(--font-display);font-size:var(--text-4xl);color:var(--accent-primary)">' + puntos + '</div>'
          : '<div style="font-family:var(--font-display);font-size:var(--text-4xl);color:var(--text-muted)">0</div>') +
        '</div>' +
        '</div>'
      );
    } else if (estado === "en_vivo" || !abierta) {
      predForm = (
        '<div style="padding:var(--space-4);text-align:center">' +
        '<div class="text-overline" style="margin-bottom:var(--space-2)">Tu predicción (cerrada)</div>' +
        '<div style="font-family:var(--font-display);font-size:var(--text-4xl);color:var(--text-secondary)">' + pred.gl + ' - ' + pred.gv + '</div>' +
        '</div>'
      );
    } else {
      predForm = (
        '<div style="padding:var(--space-4)" id="det-pred-section">' +
        '<div class="text-overline" style="margin-bottom:var(--space-3)">Tu predicción</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:var(--space-4)">' +
        renderStepper(m.n, "gl", pred.gl) +
        '<span style="font-family:var(--font-display);font-size:var(--text-3xl);color:var(--text-muted)">-</span>' +
        renderStepper(m.n, "gv", pred.gv) +
        '</div>' +
        '<button class="btn btn-primary btn-full" style="margin-top:var(--space-3)" data-save-pred="' + m.n + '">Guardar predicción</button>' +
        '</div>'
      );
    }

    // Panel: Todos los usuarios
    var panelGlobal = renderStatsPanel(
      "Todos los usuarios",
      statsGlobal.total + " predicciones",
      statsGlobal,
      m
    );

    // Panel: Predicciones de mi grupo
    var panelGrupo = "";
    if (!nominales) {
      // Aún abierta
      if (statsGrupo.total >= 5) {
        // Mostrar agregados anónimos
        panelGrupo = renderStatsPanel(
          "Predicciones de mi grupo",
          "Agregados anónimos (" + statsGrupo.total + ")",
          statsGrupo,
          m
        );
      } else {
        panelGrupo = (
          '<div class="stats-panel">' +
          '<div class="stats-panel-header">' +
          '<span class="stats-panel-title">Predicciones de mi grupo</span>' +
          '</div>' +
          '<div style="padding:var(--space-5);text-align:center">' +
          '<div style="font-size:2rem;margin-bottom:var(--space-2)">🔒</div>' +
          '<div style="font-size:var(--text-sm);color:var(--text-secondary)">Las predicciones de tus amigos son secretas. Estarán disponibles luego de que se cierre la apuesta.</div>' +
          '</div>' +
          '</div>'
        );
      }
    } else {
      // Nominales: apuesta cerrada
      var nomRows = nominales.map(function (f) {
        var isMe = f.id === P.USUARIO.id;
        var ptsBadge = f.puntos !== null
          ? (f.puntos > 0 ? '<span class="badge-points">' + f.puntos + ' pts</span>' : '<span class="badge-points-0">0 pts</span>')
          : "";
        return (
          '<div class="pred-nominal-row ' + (isMe ? "is-me" : "") + '" style="' + (isMe ? "background:rgba(132,204,22,0.06);" : "") + '">' +
          renderAvatar(f, "sm") +
          '<div class="pred-nominal-name">' + (isMe ? "Tú · " : "") + esc(f.nombre) + '</div>' +
          '<div class="pred-nominal-score">' + f.pred.gl + ' - ' + f.pred.gv + '</div>' +
          ptsBadge +
          '</div>'
        );
      }).join("");

      panelGrupo = (
        '<div class="stats-panel">' +
        '<div class="stats-panel-header">' +
        '<span class="stats-panel-title">Predicciones de mi grupo</span>' +
        '<span style="font-size:var(--text-xs);color:var(--text-muted)">' + nominales.length + ' participantes</span>' +
        '</div>' +
        '<div>' + nomRows + '</div>' +
        '</div>'
      );
    }

    return (
      // Header
      '<div class="page-header">' +
      '<button class="btn btn-ghost btn-sm" data-nav="/grupo/' + GRUPO_DEMO_ID + '" aria-label="Volver al grupo">' + iconChevronLeft() + '<span style="font-size:var(--text-xs)">Grupo</span></button>' +
      '<div style="font-family:var(--font-heading);font-size:var(--text-base);font-weight:700;text-transform:uppercase">' +
      esc(P.nombreCortoEquipo(m.local)) + ' vs ' + esc(P.nombreCortoEquipo(m.visitante)) +
      '</div>' +
      renderThemeToggle() +
      '</div>' +
      // Scoreboard
      '<div class="scoreboard" style="margin:var(--space-4);border-radius:var(--radius-2xl)">' +
      '<div class="scoreboard-corner"></div>' +
      '<div class="scoreboard-header">' +
      '<span style="font-size:var(--text-xs);color:var(--text-muted)">' + P.fechaCorta(m) + ' · ' + esc(m.estadio) + '</span>' +
      estadoBadge +
      '</div>' +
      '<div class="scoreboard-body">' +
      '<div class="scoreboard-team">' +
      '<div class="scoreboard-team-flag">' + P.banderaEquipo(m.local) + '</div>' +
      '<div class="scoreboard-team-name">' + esc(P.etiquetaEquipo(m.local)) + '</div>' +
      '</div>' +
      scoreHtml +
      '<div class="scoreboard-team">' +
      '<div class="scoreboard-team-flag">' + P.banderaEquipo(m.visitante) + '</div>' +
      '<div class="scoreboard-team-name">' + esc(P.etiquetaEquipo(m.visitante)) + '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      // Predicción
      '<div class="card" style="margin:0 var(--space-4) var(--space-4);overflow:hidden">' +
      predForm +
      '</div>' +
      // Estadísticas
      '<div style="padding:0 var(--space-4) var(--space-4)">' +
      panelGlobal +
      panelGrupo +
      '</div>'
    );
  }

  function renderStatsPanel(titulo, subtitulo, stats, m) {
    var g = stats.ganador;

    var winnerHtml = (
      '<div class="winner-dist" style="margin-bottom:var(--space-3)">' +
      '<div class="winner-dist-col">' +
      '<div class="winner-dist-pct local">' + g.local + '%</div>' +
      '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">' + esc(P.nombreCortoEquipo(m.local)) + '</div>' +
      '<div class="winner-dist-label">Local</div>' +
      '</div>' +
      '<div class="winner-dist-col">' +
      '<div class="winner-dist-pct empate">' + g.empate + '%</div>' +
      '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">·</div>' +
      '<div class="winner-dist-label">Empate</div>' +
      '</div>' +
      '<div class="winner-dist-col">' +
      '<div class="winner-dist-pct visitante">' + g.visitante + '%</div>' +
      '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:4px">' + esc(P.nombreCortoEquipo(m.visitante)) + '</div>' +
      '<div class="winner-dist-label">Visitante</div>' +
      '</div>' +
      '</div>'
    );

    // Barras de resultados más comunes
    var maxPct = Math.max.apply(null, stats.topMarcadores.map(function (t) { return t.pct; }));
    var barsHtml = '<div class="stat-bar-group">' +
      stats.topMarcadores.slice(0, 8).map(function (t, i) {
        var fillPct = maxPct > 0 ? (t.pct / maxPct * 100) : 0;
        var fillClass = i === 0 ? "fill-generic" : "fill-generic";
        return (
          '<div class="stat-bar-item">' +
          '<div class="stat-bar-label">' + t.m + '</div>' +
          '<div class="stat-bar-track"><div class="stat-bar-fill ' + fillClass + '" style="width:' + fillPct + '%"></div></div>' +
          '<div class="stat-bar-pct">' + t.pct + '%</div>' +
          '</div>'
        );
      }).join("") +
      '</div>';

    return (
      '<div class="stats-panel">' +
      '<div class="stats-panel-header">' +
      '<span class="stats-panel-title">' + titulo + '</span>' +
      '<span style="font-size:var(--text-xs);color:var(--text-muted)">' + subtitulo + '</span>' +
      '</div>' +
      '<div class="stats-panel-body">' +
      '<div class="text-overline" style="margin-bottom:var(--space-2)">Ganador pronosticado</div>' +
      winnerHtml +
      '<div class="text-overline" style="margin-bottom:var(--space-2)">Resultados más comunes</div>' +
      barsHtml +
      '</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------------
  // HELPERS DE UI
  // ---------------------------------------------------------------------------
  function renderAvatar(p, size) {
    var sizeClass = size === "sm" ? " avatar-sm" : size === "lg" ? " avatar-lg" : size === "xl" ? " avatar-xl" : "";
    return (
      '<div class="avatar' + sizeClass + '" style="background:' + (p.color || "#6366f1") + '" aria-hidden="true">' +
      (p.avatar || (p.nombre ? p.nombre.charAt(0).toUpperCase() : "?")) +
      '</div>'
    );
  }

  function renderEmptyState(icon, titulo, desc) {
    return (
      '<div class="empty-state">' +
      '<div class="empty-state-icon">' + icon + '</div>' +
      '<div class="empty-state-title">' + esc(titulo) + '</div>' +
      '<div class="empty-state-desc">' + esc(desc) + '</div>' +
      '</div>'
    );
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCIA DE PREDICCIONES
  // ---------------------------------------------------------------------------
  function getPredStorage(n) {
    return STATE.predicciones[n] || null;
  }

  function setPredStorage(n, gl, gv) {
    STATE.predicciones[n] = { gl: gl, gv: gv };
    try {
      localStorage.setItem("stadium_predicciones", JSON.stringify(STATE.predicciones));
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // EVENTOS (binding tras render)
  // ---------------------------------------------------------------------------
  function bindEvents(route) {
    // Navegación global (data-nav)
    document.querySelectorAll("[data-nav]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        var path = this.getAttribute("data-nav");
        e.preventDefault();
        e.stopPropagation();
        navTo(path);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navTo(this.getAttribute("data-nav"));
        }
      });
    });

    // Theme toggle
    var toggleBtn = document.getElementById("theme-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        toggleTema();
        render();
      });
    }

    // Login tabs
    var tabLogin = document.getElementById("tab-login");
    var tabRegistro = document.getElementById("tab-registro");
    var formArea = document.getElementById("login-form-area");
    if (tabLogin && tabRegistro && formArea) {
      tabLogin.addEventListener("click", function () {
        tabLogin.classList.add("active");
        tabRegistro.classList.remove("active");
        tabLogin.setAttribute("aria-selected", "true");
        tabRegistro.setAttribute("aria-selected", "false");
        formArea.innerHTML = renderLoginForm();
        bindLoginEvents();
      });
      tabRegistro.addEventListener("click", function () {
        tabRegistro.classList.add("active");
        tabLogin.classList.remove("active");
        tabRegistro.setAttribute("aria-selected", "true");
        tabLogin.setAttribute("aria-selected", "false");
        formArea.innerHTML = renderRegistroForm();
        bindRegistroEvents();
      });
      bindLoginEvents();
    }

    // Group tabs
    document.querySelectorAll("[data-tab]").forEach(function (el) {
      el.addEventListener("click", function () {
        STATE.grupoTab = this.getAttribute("data-tab");
        render();
      });
    });

    // Copiar código
    ["btn-copiar-codigo", "btn-copiar-cfg"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          copyText(P.GRUPO_DEMO.codigo);
        });
      }
    });

    // Wizard: fases checkboxes
    if (route === "/crear") {
      bindWizardEvents();
    }

    // Buscar form
    var buscarForm = document.getElementById("buscar-form");
    if (buscarForm) {
      bindBuscarEvents();
    }

    // Tabla de partidos: filtro
    document.querySelectorAll("[data-filtro-fase]").forEach(function (el) {
      el.addEventListener("click", function () {
        STATE.grupoFaseFiltro = this.getAttribute("data-filtro-fase");
        render();
      });
    });

    // Stepper de goles
    document.querySelectorAll("[data-stepper-dec]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var n = parseInt(this.getAttribute("data-n"), 10);
        var campo = this.getAttribute("data-campo");
        stepperChange(n, campo, -1);
      });
    });
    document.querySelectorAll("[data-stepper-inc]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var n = parseInt(this.getAttribute("data-n"), 10);
        var campo = this.getAttribute("data-campo");
        stepperChange(n, campo, 1);
      });
    });

    // Guardar predicción
    document.querySelectorAll("[data-save-pred]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var n = parseInt(this.getAttribute("data-save-pred"), 10);
        guardarPrediccion(n);
      });
    });

    // Config: guardar
    var btnGuardarCfg = document.getElementById("btn-guardar-config");
    if (btnGuardarCfg) {
      btnGuardarCfg.addEventListener("click", function () {
        showToast("Cambios guardados correctamente.", "success");
      });
    }

    // Config: salir
    var btnSalir = document.getElementById("btn-salir-grupo");
    if (btnSalir) {
      btnSalir.addEventListener("click", function () {
        if (confirm("¿Estás seguro que quieres salir del grupo?")) {
          showToast("Has salido del grupo.", "info");
          navTo("/dashboard");
        }
      });
    }

    // Aplicar indeterminate a checkboxes (no se puede hacer via HTML)
    document.querySelectorAll("[data-indeterminate='true']").forEach(function (cb) {
      cb.indeterminate = true;
    });

    // Unirme
    var btnUnirme = document.getElementById("btn-unirme");
    if (btnUnirme) {
      btnUnirme.addEventListener("click", function () {
        showToast("Te uniste a Polla de la Oficina 2026.", "success");
        setTimeout(function () { navTo("/grupo/" + GRUPO_DEMO_ID); }, 800);
      });
    }

    // Crear grupo (wizard fase 3)
    var btnCrear = document.getElementById("btn-crear-grupo");
    if (btnCrear) {
      btnCrear.addEventListener("click", function () {
        var codigo = "PLLA26";
        showToast("Grupo creado exitosamente. Código: " + codigo, "success");
        STATE.wizard = {
          fase: 1,
          datos: { nombre: "", descripcion: "" },
          reglas: Object.assign({}, P.REGLAS),
          partidos: new Set(P.PARTIDOS.map(function (m) { return m.n; })),
        };
        setTimeout(function () { navTo("/grupo/" + GRUPO_DEMO_ID); }, 800);
      });
    }
  }

  function bindLoginEvents() {
    var formLogin = document.getElementById("form-login");
    if (formLogin) {
      formLogin.addEventListener("submit", function (e) {
        e.preventDefault();
        var valid = true;
        var email = document.getElementById("login-email").value.trim();
        var pass  = document.getElementById("login-pass").value;
        var emailErr = document.getElementById("login-email-err");
        var passErr  = document.getElementById("login-pass-err");

        emailErr.textContent = "";
        passErr.textContent = "";

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emailErr.textContent = "Ingresa un correo válido.";
          document.getElementById("login-email").classList.add("error");
          valid = false;
        } else {
          document.getElementById("login-email").classList.remove("error");
        }
        if (!pass || pass.length < 6) {
          passErr.textContent = "La contraseña debe tener al menos 6 caracteres.";
          document.getElementById("login-pass").classList.add("error");
          valid = false;
        } else {
          document.getElementById("login-pass").classList.remove("error");
        }

        if (valid && (email.toLowerCase() !== P.CREDENCIALES.usuario.toLowerCase() || pass !== P.CREDENCIALES.clave)) {
          passErr.textContent = "Credenciales incorrectas. Usa el acceso demo: " + P.CREDENCIALES.usuario + " / " + P.CREDENCIALES.clave + ".";
          document.getElementById("login-pass").classList.add("error");
          valid = false;
        }

        if (valid) {
          showToast("Iniciando sesión...", "info");
          setTimeout(function () { navTo("/dashboard"); }, 600);
        }
      });

      var btnGoogle = document.getElementById("btn-google");
      if (btnGoogle) {
        btnGoogle.addEventListener("click", function () {
          showToast("Conectando con Google...", "info");
          setTimeout(function () { navTo("/dashboard"); }, 800);
        });
      }
    }
  }

  function bindRegistroEvents() {
    var formReg = document.getElementById("form-registro");
    if (!formReg) return;
    var btnGoogleReg = document.getElementById("btn-google-reg");
    if (btnGoogleReg) {
      btnGoogleReg.addEventListener("click", function () {
        showToast("Conectando con Google...", "info");
        setTimeout(function () { navTo("/dashboard"); }, 800);
      });
    }
    formReg.addEventListener("submit", function (e) {
      e.preventDefault();
      var nombre = document.getElementById("reg-nombre").value.trim();
      var email  = document.getElementById("reg-email").value.trim();
      var pass   = document.getElementById("reg-pass").value;
      var pass2  = document.getElementById("reg-pass2").value;
      var terms  = document.getElementById("reg-terms").checked;
      var valid  = true;

      [["reg-nombre-err","reg-nombre", !nombre, "Ingresa tu nombre."],
       ["reg-email-err","reg-email", !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Correo inválido."],
       ["reg-pass-err","reg-pass", pass.length < 8, "Mínimo 8 caracteres."],
       ["reg-pass2-err","reg-pass2", pass !== pass2, "Las contraseñas no coinciden."]
      ].forEach(function (row) {
        var errEl = document.getElementById(row[0]);
        var inp   = document.getElementById(row[1]);
        if (errEl) errEl.textContent = row[2] ? row[3] : "";
        if (inp)  inp.classList.toggle("error", row[2]);
        if (row[2]) valid = false;
      });

      if (!terms) {
        showToast("Debes aceptar los términos y condiciones.", "error");
        valid = false;
      }

      if (valid) {
        showToast("Cuenta creada. ¡Bienvenido!", "success");
        setTimeout(function () { navTo("/dashboard"); }, 700);
      }
    });
  }

  function bindWizardEvents() {
    var fase = STATE.wizard.fase;

    // Botón atrás
    var btnBack = document.getElementById("wizard-back");
    if (btnBack) {
      btnBack.addEventListener("click", function () {
        if (STATE.wizard.fase > 1) {
          STATE.wizard.fase--;
          render();
        } else {
          navTo("/dashboard");
        }
      });
    }

    // Fase 1: form
    var f1 = document.getElementById("wizard-f1");
    if (f1) {
      var wNombre = document.getElementById("w-nombre");
      var wDesc   = document.getElementById("w-desc");
      var descCount = document.getElementById("w-desc-count");

      if (wDesc && descCount) {
        wDesc.addEventListener("input", function () {
          STATE.wizard.datos.descripcion = this.value;
          descCount.textContent = this.value.length + "/280";
        });
      }
      if (wNombre) {
        wNombre.addEventListener("input", function () {
          STATE.wizard.datos.nombre = this.value;
        });
      }

      f1.addEventListener("submit", function (e) {
        e.preventDefault();
        var nombre = wNombre ? wNombre.value.trim() : "";
        var errEl = document.getElementById("w-nombre-err");
        if (nombre.length < 3) {
          if (errEl) errEl.textContent = "El nombre debe tener al menos 3 caracteres.";
          if (wNombre) wNombre.classList.add("error");
          return;
        }
        if (errEl) errEl.textContent = "";
        if (wNombre) wNombre.classList.remove("error");
        STATE.wizard.datos.nombre = nombre;
        STATE.wizard.fase = 2;
        render();
      });
    }

    // Fase 2: reglas en tiempo real
    document.querySelectorAll(".regla-input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var key = this.getAttribute("data-key");
        var val = parseFloat(this.value) || 0;
        STATE.wizard.reglas[key] = val;

        // Suma premios en vivo
        var r = STATE.wizard.reglas;
        var suma = (r.premio_primer_lugar || 0) + (r.premio_segundo_lugar || 0) + (r.premio_tercer_lugar || 0);
        var sumaEl = document.getElementById("premios-suma");
        var errEl  = document.getElementById("premios-error");
        var nextBtn = document.getElementById("wizard-next-2");

        if (sumaEl) {
          sumaEl.textContent = suma + "%";
          sumaEl.style.color = suma === 100 ? "var(--c-lime-400)" : "var(--c-magenta-400)";
        }
        if (errEl) {
          if (suma !== 100) {
            errEl.style.display = "";
            errEl.textContent = "La suma de premios debe ser exactamente 100%. Actualmente: " + suma + "%";
          } else {
            errEl.style.display = "none";
          }
        }
        if (nextBtn) nextBtn.disabled = suma !== 100;
      });
    });

    var next2 = document.getElementById("wizard-next-2");
    if (next2) {
      next2.addEventListener("click", function () {
        if (this.disabled) return;
        STATE.wizard.fase = 3;
        render();
      });
    }

    // Fase 3: checkboxes partidos
    if (fase === 3) {
      // Checkboxes individuales
      document.querySelectorAll(".partido-check").forEach(function (cb) {
        cb.addEventListener("change", function () {
          var n = parseInt(this.getAttribute("data-n"), 10);
          var faseId = this.getAttribute("data-fase");
          if (this.checked) STATE.wizard.partidos.add(n);
          else STATE.wizard.partidos.delete(n);
          actualizarFaseMaster(faseId);
          actualizarContador();
        });
      });

      // Checkboxes master de fase
      document.querySelectorAll(".fase-master-check").forEach(function (cb) {
        cb.addEventListener("change", function () {
          var faseId = this.getAttribute("data-fase");
          var partidos = P.partidosPorFase(faseId);
          partidos.forEach(function (m) {
            if (cb.checked) STATE.wizard.partidos.add(m.n);
            else STATE.wizard.partidos.delete(m.n);
          });
          // Actualizar checkboxes individuales de la fase
          document.querySelectorAll(".partido-check[data-fase='" + faseId + "']").forEach(function (pCb) {
            pCb.checked = cb.checked;
          });
          actualizarContador();
        });
      });
    }
  }

  function actualizarFaseMaster(faseId) {
    var partidos = P.partidosPorFase(faseId);
    var total = partidos.length;
    var sel = partidos.filter(function (m) { return STATE.wizard.partidos.has(m.n); }).length;
    var master = document.querySelector(".fase-master-check[data-fase='" + faseId + "']");
    if (master) {
      master.checked = sel === total;
      master.indeterminate = sel > 0 && sel < total;
    }
    var countEl = document.querySelector("[data-fase-block='" + faseId + "'] .phase-count");
    if (countEl) countEl.textContent = sel + "/" + total;
  }

  function actualizarContador() {
    var badge = document.getElementById("total-sel-badge");
    if (badge) badge.textContent = STATE.wizard.partidos.size + " seleccionados";
  }

  function bindBuscarEvents() {
    var form = document.getElementById("buscar-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var codigo = document.getElementById("buscar-codigo").value.trim().toUpperCase();
      var errEl  = document.getElementById("buscar-error");
      var resultArea = document.getElementById("buscar-result-area");

      if (!codigo) {
        errEl.textContent = "Ingresa un código de grupo.";
        if (resultArea) resultArea.innerHTML = "";
        return;
      }
      errEl.textContent = "";
      if (resultArea) resultArea.innerHTML = renderBuscarResultado();
      // Re-bind el botón de unirse
      var btnU = document.getElementById("btn-unirme");
      if (btnU) {
        btnU.addEventListener("click", function () {
          showToast("Te uniste a " + P.GRUPO_DEMO.nombre + ".", "success");
          setTimeout(function () { navTo("/grupo/" + GRUPO_DEMO_ID); }, 800);
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // STEPPER DINÁMICO (sin re-render)
  // ---------------------------------------------------------------------------
  function stepperChange(n, campo, delta) {
    var pred = getPredStorage(n) || Object.assign({}, P.miPrediccion(n > 0 ? P.partidoPorN(n) : { n: n }));
    if (!STATE.predicciones[n]) {
      var m = P.partidoPorN(n);
      pred = m ? Object.assign({}, P.miPrediccion(m)) : { gl: 0, gv: 0 };
    } else {
      pred = Object.assign({}, STATE.predicciones[n]);
    }
    var nuevo = Math.max(0, Math.min(20, (pred[campo] || 0) + delta));
    pred[campo] = nuevo;
    STATE.predicciones[n] = pred;
    // Actualizar solo el valor visual
    var el = document.getElementById("stepper-val-" + n + "-" + campo);
    if (el) el.textContent = nuevo;
  }

  function guardarPrediccion(n) {
    var pred = STATE.predicciones[n];
    if (!pred) {
      var m = P.partidoPorN(n);
      pred = m ? Object.assign({}, P.miPrediccion(m)) : { gl: 0, gv: 0 };
    }
    setPredStorage(n, pred.gl, pred.gv);
    showToast("Predicción guardada: " + pred.gl + " - " + pred.gv, "success");
  }

  // ---------------------------------------------------------------------------
  // UTILIDADES
  // ---------------------------------------------------------------------------
  function esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatCOP(n) {
    return "$" + Number(n).toLocaleString("es-CO");
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        showToast("Código " + text + " copiado al portapapeles.", "success");
      });
    } else {
      // Fallback
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        showToast("Código " + text + " copiado.", "success");
      } catch (e) {
        showToast("Copia manualmente: " + text, "info");
      }
      document.body.removeChild(ta);
    }
  }

  // ---------------------------------------------------------------------------
  // TOAST
  // ---------------------------------------------------------------------------
  function showToast(msg, tipo) {
    tipo = tipo || "info";
    var container = document.getElementById("toast-container");
    if (!container) return;

    var icons = { success: "✅", error: "❌", info: "ℹ️" };
    var classes = { success: "toast-success", error: "toast-error", info: "toast-info" };

    var toast = document.createElement("div");
    toast.className = "toast " + (classes[tipo] || "toast-info");
    toast.setAttribute("role", "status");
    toast.innerHTML = '<span class="toast-icon" aria-hidden="true">' + (icons[tipo] || "ℹ️") + '</span><span class="toast-msg">' + esc(msg) + '</span>';
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-8px)";
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3000);
  }

  // ---------------------------------------------------------------------------
  // ICONOS (SVG inline)
  // ---------------------------------------------------------------------------
  function iconHome() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  }
  function iconPlus() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  }
  function iconSearch() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  }
  function iconTrophy() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="12"/><path d="M7 4h10l1 3.5C19 10.5 16.5 13 12 13S5 10.5 6 7.5Z"/><path d="M4.5 5.5C3 7 3 9 4.5 10.5"/><path d="M19.5 5.5C21 7 21 9 19.5 10.5"/></svg>';
  }
  function iconChevronLeft() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
  }
  function iconCopy() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  }

  // ---------------------------------------------------------------------------
  // ARRANQUE
  // ---------------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
