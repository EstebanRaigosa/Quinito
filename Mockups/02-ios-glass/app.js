/* =============================================================================
 * Polla — App SPA (iOS Glass Mockup)
 * Router por hash, vanilla JS, funciona en file://
 * ============================================================================= */
(function () {
  "use strict";

  var P = window.POLLA;

  // ---------------------------------------------------------------------------
  // ESTADO GLOBAL
  // ---------------------------------------------------------------------------
  var STATE = {
    theme: localStorage.getItem("polla_theme") || "light",
    predicciones: JSON.parse(localStorage.getItem("polla_predicciones") || "{}"),
    wizard: { fase: 1, datos: { nombre: "", descripcion: "" }, partidos: null, reglas: null },
    grupoTab: "predicciones",
    grupoTabPartidos_fase: "todas",
  };

  // ---------------------------------------------------------------------------
  // TEMA
  // ---------------------------------------------------------------------------
  function applyTheme(t) {
    STATE.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("polla_theme", t);
  }
  applyTheme(STATE.theme);

  // ---------------------------------------------------------------------------
  // HELPERS UI
  // ---------------------------------------------------------------------------
  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showToast(msg, type) {
    var container = document.getElementById("toastContainer");
    if (!container) return;
    var icons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="8"></line><line x1="12" y1="12" x2="12" y2="16"></line></svg>'
    };
    var t = type || "success";
    var el = document.createElement("div");
    el.className = "toast toast--" + t;
    el.innerHTML = (icons[t] || "") + esc(msg);
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
    }, 2800);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast("Código copiado: " + text, "success");
      }).catch(function () { fallbackCopy(text); });
    } else { fallbackCopy(text); }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand("copy"); showToast("Código copiado: " + text, "success"); }
    catch (e) { showToast("No se pudo copiar. Código: " + text, "error"); }
    document.body.removeChild(ta);
  }

  function formatCOP(n) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
  }

  function badgeEstado(estado) {
    var map = { "Activo": "badge--green", "Próximo": "badge--orange", "Finalizado": "badge--gray" };
    return '<span class="badge ' + (map[estado] || "badge--gray") + '">' + esc(estado) + '</span>';
  }

  function badgePartidoEstado(m) {
    var e = P.estadoPartido(m);
    if (e === "en_vivo") return '<span class="badge badge--red">EN VIVO</span>';
    if (e === "finalizado") return '<span class="badge badge--gray">Finalizado</span>';
    return '<span class="badge badge--blue">Programado</span>';
  }

  function svgChevron() {
    return '<svg class="inset-list__chevron" width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function svgBack() {
    return '<svg width="10" height="16" viewBox="0 0 10 18" fill="none" aria-hidden="true"><path d="M9 1L1 9l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function nombreFase(faseId) {
    var f = P.FASES.find(function (x) { return x.id === faseId; });
    return f ? f.nombre : faseId;
  }

  // ---------------------------------------------------------------------------
  // ROUTER
  // ---------------------------------------------------------------------------
  var ROUTES = {
    "/login": renderLogin,
    "/dashboard": renderDashboard,
    "/crear": renderCrear,
    "/buscar": renderBuscar,
    "/grupo/g-oficina": renderGrupo,
  };

  function getRoute() {
    var h = location.hash.replace(/^#/, "") || "/login";
    return h;
  }

  function navigate(route) {
    location.hash = "#" + route;
  }

  function render() {
    var route = getRoute();
    // match prediccion
    var predMatch = route.match(/^\/grupo\/[^/]+\/prediccion\/(\d+)$/);
    if (predMatch) {
      renderPrediccion(parseInt(predMatch[1], 10));
      return;
    }
    // match grupo
    if (route.match(/^\/grupo\/[^/]+$/)) {
      renderGrupo();
      return;
    }
    var fn = ROUTES[route];
    if (fn) {
      fn();
    } else {
      // default: si no hay hash o es desconocido, ir a login
      renderLogin();
    }
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", function () {
    if (!location.hash || location.hash === "#") {
      location.hash = "#/login";
    }
    render();
  });

  // ---------------------------------------------------------------------------
  // SHELL
  // ---------------------------------------------------------------------------
  function setShell(opts) {
    // opts: { title, backRoute, backLabel, actionHtml, showTabBar, tabBarActive, showNav }
    var app = document.getElementById("app");
    var hasTabBar = opts.showTabBar !== false;
    var hasNav = opts.showNav !== false;

    var sidebarItems = [
      { icon: svgHouse(), label: "Mis Grupos", route: "/dashboard" },
      { icon: svgPlus(), label: "Crear Grupo", route: "/crear" },
      { icon: svgSearch(), label: "Buscar Grupo", route: "/buscar" },
    ];

    var sidebarHtml = '<aside class="sidebar" role="navigation" aria-label="Navegación principal">' +
      '<div class="sidebar__logo">' +
        '<div class="auth-logo" style="font-size:1.8rem">Polla</div>' +
        '<div class="auth-tagline" style="text-align:left;margin-top:4px">Mundial 2026</div>' +
      '</div>' +
      '<nav class="sidebar__nav">';
    sidebarItems.forEach(function (item) {
      var active = getRoute() === item.route || (item.route !== "/dashboard" && getRoute().indexOf(item.route.replace("/dashboard","")) === 0);
      sidebarHtml += '<button class="sidebar__item' + (active ? " active" : "") + '" onclick="navigate(\'' + item.route + '\')" aria-label="' + esc(item.label) + '">' +
        item.icon + '<span>' + esc(item.label) + '</span></button>';
    });
    sidebarHtml += '</nav>' +
      '<div class="sidebar__footer">' +
        '<button class="sidebar__item" onclick="toggleTheme()" aria-label="Cambiar tema">' +
          svgMoon() + '<span>Modo ' + (STATE.theme === "dark" ? "Claro" : "Oscuro") + '</span>' +
        '</button>' +
        '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;">' +
          '<div class="avatar" style="background:' + P.USUARIO.inicialesColor + '">' + esc(P.USUARIO.avatar) + '</div>' +
          '<div>' +
            '<div style="font-size:var(--fs-footnote);font-weight:600;">' + esc(P.USUARIO.nombre) + '</div>' +
            '<div style="font-size:var(--fs-caption1);color:var(--color-label-secondary);">' + esc(P.USUARIO.email) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</aside>';

    var navHtml = "";
    if (hasNav) {
      var backHtml = "";
      if (opts.backRoute) {
        backHtml = '<button class="glass-navbar__back" onclick="navigate(\'' + opts.backRoute + '\')" aria-label="Volver a ' + esc(opts.backLabel || "atrás") + '">' +
          svgBack() + '<span>' + esc(opts.backLabel || "Atrás") + '</span></button>';
      } else {
        backHtml = '<div style="min-width:44px"></div>';
      }
      var actionHtml = opts.actionHtml || '<div style="min-width:44px"></div>';
      navHtml = '<header class="glass-navbar" role="banner">' +
        '<div class="glass-navbar__inner">' +
          backHtml +
          '<h1 class="glass-navbar__title">' + esc(opts.title || "") + '</h1>' +
          actionHtml +
        '</div>' +
      '</header>';
    }

    var tabBarHtml = "";
    if (hasTabBar) {
      var tabs = [
        { icon: svgHouse(), label: "Grupos", route: "/dashboard" },
        { icon: svgPlus(), label: "Crear", route: "/crear" },
        { icon: svgSearch(), label: "Buscar", route: "/buscar" },
      ];
      var active = opts.tabBarActive || "dashboard";
      tabBarHtml = '<nav class="glass-tabbar" role="navigation" aria-label="Barra de tabs">' +
        '<div class="glass-tabbar__items">';
      tabs.forEach(function (tab) {
        var isActive = (tab.route === "/" + active) || (active === "grupo" && tab.route === "/dashboard");
        tabBarHtml += '<button class="glass-tabbar__item' + (isActive ? " active" : "") + '" onclick="navigate(\'' + tab.route + '\')" aria-label="' + esc(tab.label) + '">' +
          tab.icon + '<span>' + esc(tab.label) + '</span></button>';
      });
      tabBarHtml += '</div></nav>';
    }

    var mainClass = "main-content" + (hasTabBar ? "" : " main-content--no-tabbar");

    app.innerHTML = '<div class="app-shell">' +
      sidebarHtml +
      navHtml +
      '<main class="' + mainClass + '" id="mainContent" role="main">' +
        '<div id="pageContent"></div>' +
      '</main>' +
      tabBarHtml +
    '</div>';
  }

  function setPage(html) {
    var el = document.getElementById("pageContent");
    if (el) el.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // SVG ICONS (SF Symbols inspirados)
  // ---------------------------------------------------------------------------
  function svgHouse() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
  }
  function svgPlus() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>';
  }
  function svgSearch() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  }
  function svgMoon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  }
  function svgSun() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
  }
  function svgCopy() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  }
  function svgCheck() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  }
  function svgMinus() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  }
  function svgStar() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
  }
  function svgTrophy() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="8 11 8 2 16 2 16 11"></polyline><path d="M4 11h16v1a8 8 0 0 1-16 0v-1z"></path><path d="M12 20v2m-4 0h8"></path><path d="M4 11H1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h3"></path><path d="M20 11h3a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3"></path></svg>';
  }
  function svgPeople() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
  }
  function svgSettings() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M21 12h-2M5 12H3M19.07 19.07l-1.41-1.41M5.34 5.34l-1.41-1.41M12 21v-2M12 5V3"></path></svg>';
  }
  function svgList() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>';
  }
  function svgGlobe() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
  }
  function svgInfo() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  // ---------------------------------------------------------------------------
  // TOGGLE THEME (expuesto globalmente para onclick)
  // ---------------------------------------------------------------------------
  window.toggleTheme = function () {
    applyTheme(STATE.theme === "dark" ? "light" : "dark");
    render();
  };
  window.navigate = navigate;

  // ---------------------------------------------------------------------------
  // 1. LOGIN / REGISTRO
  // ---------------------------------------------------------------------------
  function renderLogin() {
    setShell({ title: "", showTabBar: false, showNav: false });

    var tab = window._loginTab || "login";

    var loginForm = '<div style="display:flex;flex-direction:column;gap:var(--space-4);">' +
      '<div style="display:flex;gap:8px;align-items:flex-start;background:var(--color-fill-secondary,rgba(120,120,128,.12));border-radius:12px;padding:12px 14px;font-size:var(--fs-footnote,13px);line-height:1.5;color:var(--color-label-secondary);">' +
        '<span aria-hidden="true">🔑</span><span><strong style="color:var(--color-label-primary,inherit)">Acceso demo</strong><br>Usuario: <code>' + P.CREDENCIALES.usuario + '</code><br>Clave: <code>' + P.CREDENCIALES.clave + '</code><br><span style="opacity:.8">(ya vienen precargados)</span></span>' +
      '</div>' +
      '<div class="ios-field">' +
        '<label class="ios-field__label" for="email">Correo electrónico</label>' +
        '<input class="ios-field__input" type="email" id="email" name="email" value="' + P.CREDENCIALES.usuario + '" autocomplete="email" placeholder="tu@correo.com" aria-required="true">' +
        '<div class="ios-field__error" id="emailError" role="alert" style="display:none"></div>' +
      '</div>' +
      '<div class="ios-field">' +
        '<label class="ios-field__label" for="password">Contraseña</label>' +
        '<input class="ios-field__input" type="password" id="password" name="password" value="' + P.CREDENCIALES.clave + '" autocomplete="current-password" placeholder="••••••••" aria-required="true">' +
        '<div class="ios-field__error" id="passError" role="alert" style="display:none"></div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<button class="btn btn--plain" style="font-size:var(--fs-subhead)" onclick="">¿Olvidaste tu contraseña?</button>' +
      '</div>' +
      '<button class="btn btn--filled btn--full btn--lg" onclick="submitLogin()" id="btnLogin">Iniciar sesión</button>' +
    '</div>';

    var registerForm = '<div style="display:flex;flex-direction:column;gap:var(--space-4);">' +
      '<div class="ios-field">' +
        '<label class="ios-field__label" for="regNombre">Nombre completo</label>' +
        '<input class="ios-field__input" type="text" id="regNombre" name="nombre" autocomplete="name" placeholder="Tu nombre" aria-required="true">' +
        '<div class="ios-field__error" id="regNombreError" role="alert" style="display:none"></div>' +
      '</div>' +
      '<div class="ios-field">' +
        '<label class="ios-field__label" for="regEmail">Correo electrónico</label>' +
        '<input class="ios-field__input" type="email" id="regEmail" name="email" autocomplete="email" placeholder="tu@correo.com" aria-required="true">' +
        '<div class="ios-field__error" id="regEmailError" role="alert" style="display:none"></div>' +
      '</div>' +
      '<div class="ios-field">' +
        '<label class="ios-field__label" for="regPass">Contraseña</label>' +
        '<input class="ios-field__input" type="password" id="regPass" name="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres" aria-required="true">' +
        '<div class="ios-field__error" id="regPassError" role="alert" style="display:none"></div>' +
      '</div>' +
      '<div class="ios-field">' +
        '<label class="ios-field__label" for="regPass2">Confirmar contraseña</label>' +
        '<input class="ios-field__input" type="password" id="regPass2" name="password2" autocomplete="new-password" placeholder="Repite tu contraseña" aria-required="true">' +
        '<div class="ios-field__error" id="regPass2Error" role="alert" style="display:none"></div>' +
      '</div>' +
      '<label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;">' +
        '<input type="checkbox" id="terminos" style="width:20px;height:20px;flex-shrink:0;margin-top:2px;accent-color:var(--color-accent)">' +
        '<span style="font-size:var(--fs-subhead);color:var(--color-label-secondary)">Acepto los <span style="color:var(--color-accent)">términos y condiciones</span> y la política de privacidad</span>' +
      '</label>' +
      '<div class="ios-field__error" id="terminosError" role="alert" style="display:none"></div>' +
      '<button class="btn btn--filled btn--full btn--lg" onclick="submitRegister()" id="btnRegister">Crear cuenta</button>' +
    '</div>';

    var html = '<div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:env(safe-area-inset-top,0) 0 env(safe-area-inset-bottom,0) 0;">' +
      '<div style="width:100%;max-width:420px;padding:var(--space-8) var(--space-5);">' +
        '<!-- Branding -->' +
        '<div style="text-align:center;margin-bottom:var(--space-8);">' +
          '<div class="auth-logo" style="margin-bottom:8px">Polla</div>' +
          '<p class="auth-tagline">Tu quiniela del Mundial 2026</p>' +
          '<div style="font-size:40px;margin-top:var(--space-4)">⚽</div>' +
        '</div>' +

        '<!-- Glass card -->' +
        '<div class="card" style="padding:var(--space-5)">' +
          '<!-- Continuar con Google -->' +
          '<button class="btn btn--outlined btn--full" onclick="submitGoogle()" style="gap:var(--space-3);margin-bottom:var(--space-5);" aria-label="Continuar con Google">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
            'Continuar con Google' +
          '</button>' +

          '<div class="divider-text" style="margin-bottom:var(--space-5);">o</div>' +

          '<!-- Tabs segmented control -->' +
          '<div class="segmented-control" style="margin-bottom:var(--space-5);" role="tablist">' +
            '<button class="segmented-control__option' + (tab === "login" ? " active" : "") + '" onclick="switchLoginTab(\'login\')" role="tab" aria-selected="' + (tab === "login") + '" id="tab-login">Iniciar sesión</button>' +
            '<button class="segmented-control__option' + (tab === "register" ? " active" : "") + '" onclick="switchLoginTab(\'register\')" role="tab" aria-selected="' + (tab === "register") + '" id="tab-register">Crear cuenta</button>' +
          '</div>' +

          '<div id="authFormContent">' +
            (tab === "login" ? loginForm : registerForm) +
          '</div>' +
        '</div>' +

        '<!-- Theme toggle -->' +
        '<div style="text-align:center;margin-top:var(--space-6);">' +
          '<button class="btn btn--plain" onclick="toggleTheme()" aria-label="Cambiar tema">' +
            (STATE.theme === "dark" ? svgSun() : svgMoon()) +
            '<span style="margin-left:6px;font-size:var(--fs-subhead)">' + (STATE.theme === "dark" ? "Modo claro" : "Modo oscuro") + '</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    setPage(html);
  }

  window.switchLoginTab = function (tab) {
    window._loginTab = tab;
    renderLogin();
  };

  window.submitGoogle = function () {
    showToast("Iniciando sesión con Google...", "info");
    setTimeout(function () { navigate("/dashboard"); }, 600);
  };

  window.submitLogin = function () {
    var email = document.getElementById("email");
    var pass = document.getElementById("password");
    var ok = true;
    if (!email || !email.value.trim() || !email.value.includes("@")) {
      var eErr = document.getElementById("emailError");
      if (eErr) { eErr.textContent = "Ingresa un correo válido"; eErr.style.display = "block"; }
      if (email) email.classList.add("ios-field__input--error");
      ok = false;
    } else {
      var eErr2 = document.getElementById("emailError");
      if (eErr2) eErr2.style.display = "none";
      if (email) email.classList.remove("ios-field__input--error");
    }
    if (!pass || pass.value.length < 6) {
      var pErr = document.getElementById("passError");
      if (pErr) { pErr.textContent = "La contraseña debe tener al menos 6 caracteres"; pErr.style.display = "block"; }
      if (pass) pass.classList.add("ios-field__input--error");
      ok = false;
    } else {
      var pErr2 = document.getElementById("passError");
      if (pErr2) pErr2.style.display = "none";
      if (pass) pass.classList.remove("ios-field__input--error");
    }
    if (ok && (email.value.trim().toLowerCase() !== P.CREDENCIALES.usuario.toLowerCase() || pass.value !== P.CREDENCIALES.clave)) {
      var pErr3 = document.getElementById("passError");
      if (pErr3) { pErr3.textContent = "Credenciales incorrectas. Usa el acceso demo: " + P.CREDENCIALES.usuario + " / " + P.CREDENCIALES.clave; pErr3.style.display = "block"; }
      pass.classList.add("ios-field__input--error");
      ok = false;
    }
    if (ok) {
      showToast("Bienvenido/a de nuevo", "success");
      setTimeout(function () { navigate("/dashboard"); }, 500);
    }
  };

  window.submitRegister = function () {
    var nombre = document.getElementById("regNombre");
    var email = document.getElementById("regEmail");
    var pass = document.getElementById("regPass");
    var pass2 = document.getElementById("regPass2");
    var terminos = document.getElementById("terminos");
    var ok = true;

    function showErr(id, msg, inputEl) {
      var el = document.getElementById(id);
      if (el) { el.textContent = msg; el.style.display = msg ? "block" : "none"; }
      if (inputEl) inputEl.classList[msg ? "add" : "remove"]("ios-field__input--error");
    }

    if (!nombre || nombre.value.trim().length < 2) { showErr("regNombreError", "Ingresa tu nombre", nombre); ok = false; }
    else showErr("regNombreError", "", nombre);
    if (!email || !email.value.includes("@")) { showErr("regEmailError", "Correo inválido", email); ok = false; }
    else showErr("regEmailError", "", email);
    if (!pass || pass.value.length < 6) { showErr("regPassError", "Mínimo 6 caracteres", pass); ok = false; }
    else showErr("regPassError", "", pass);
    if (!pass2 || pass2.value !== (pass ? pass.value : "")) { showErr("regPass2Error", "Las contraseñas no coinciden", pass2); ok = false; }
    else showErr("regPass2Error", "", pass2);
    if (!terminos || !terminos.checked) { showErr("terminosError", "Debes aceptar los términos y condiciones", null); ok = false; }
    else showErr("terminosError", "", null);

    if (ok) {
      showToast("Cuenta creada exitosamente", "success");
      setTimeout(function () { navigate("/dashboard"); }, 500);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. DASHBOARD
  // ---------------------------------------------------------------------------
  function renderDashboard() {
    var themeAction = '<button class="glass-navbar__action" onclick="toggleTheme()" aria-label="Cambiar tema">' +
      (STATE.theme === "dark" ? svgSun() : svgMoon()) + '</button>';

    setShell({
      title: "Mis Grupos",
      showTabBar: true,
      tabBarActive: "dashboard",
      actionHtml: themeAction,
    });

    var html = '<div class="page-container">' +
      '<div class="large-title" style="padding-left:0">Hola, ' + esc(P.USUARIO.nombre.split(" ")[0]) + ' 👋</div>' +

      '<!-- Acciones primarias -->' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-6);">' +
        '<button class="card card--pressable" style="padding:var(--space-4);text-align:left;" onclick="navigate(\'/crear\')">' +
          '<div style="font-size:28px;margin-bottom:var(--space-2)">➕</div>' +
          '<div style="font-size:var(--fs-callout);font-weight:600;color:var(--color-label)">Crear Grupo</div>' +
          '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary);margin-top:2px">Invita a tus amigos</div>' +
        '</button>' +
        '<button class="card card--pressable" style="padding:var(--space-4);text-align:left;" onclick="navigate(\'/buscar\')">' +
          '<div style="font-size:28px;margin-bottom:var(--space-2)">🔍</div>' +
          '<div style="font-size:var(--fs-callout);font-weight:600;color:var(--color-label)">Buscar Grupo</div>' +
          '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary);margin-top:2px">Únete con código</div>' +
        '</button>' +
      '</div>' +

      '<!-- Mis Grupos -->' +
      '<div style="font-size:var(--fs-footnote);font-weight:400;color:var(--color-label-secondary);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:var(--space-2);padding:0 2px;">Mis Grupos</div>' +
      '<div style="display:flex;flex-direction:column;gap:var(--space-3);">';

    if (P.MIS_GRUPOS.length === 0) {
      html += '<div class="empty-state">' +
        '<div class="empty-state__icon">⚽</div>' +
        '<div class="empty-state__title">Sin grupos aún</div>' +
        '<div class="empty-state__message">Crea o únete a un grupo para empezar a hacer tus predicciones.</div>' +
      '</div>';
    } else {
      P.MIS_GRUPOS.forEach(function (g) {
        html += '<button class="card card--pressable" style="padding:var(--space-4);text-align:left;width:100%;" onclick="navigate(\'/grupo/' + esc(g.id) + '\')">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-2);">' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:var(--fs-headline);font-weight:600;color:var(--color-label);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(g.nombre) + '</div>' +
              '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary);">' + esc(g.torneo) + '</div>' +
            '</div>' +
            badgeEstado(g.estado) +
          '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;">' +
            '<div style="display:flex;align-items:center;gap:var(--space-3);">' +
              '<div style="display:flex;align-items:center;gap:4px;font-size:var(--fs-footnote);color:var(--color-label-secondary);">' +
                svgPeople() + '<span style="margin-left:4px">' + g.participantes + ' participantes</span>' +
              '</div>' +
            '</div>' +
            '<div style="font-size:var(--fs-subhead);color:var(--color-accent);font-weight:600;">Vas ' + ordinal(g.posicion) + '</div>' +
          '</div>' +
        '</button>';
      });
    }

    html += '</div></div>';
    setPage(html);
  }

  function ordinal(n) {
    if (n === 1) return "1.º";
    if (n === 2) return "2.º";
    if (n === 3) return "3.º";
    return n + ".º";
  }

  // ---------------------------------------------------------------------------
  // 3. WIZARD CREAR GRUPO
  // ---------------------------------------------------------------------------
  function renderCrear() {
    setShell({
      title: "Crear grupo",
      backRoute: "/dashboard",
      backLabel: "Mis Grupos",
      showTabBar: true,
      tabBarActive: "crear",
    });

    if (!STATE.wizard.partidos) {
      // Inicializar todos seleccionados
      STATE.wizard.partidos = {};
      P.PARTIDOS.forEach(function (m) { STATE.wizard.partidos[m.n] = true; });
    }
    if (!STATE.wizard.reglas) {
      STATE.wizard.reglas = Object.assign({}, P.REGLAS);
    }

    var fase = STATE.wizard.fase;

    var stepperHtml = '<div class="progress-steps">' +
      '<div class="progress-steps__step ' + (fase === 1 ? "active" : "done") + '"></div>' +
      '<div class="progress-steps__step ' + (fase === 2 ? "active" : fase > 2 ? "done" : "") + '"></div>' +
      '<div class="progress-steps__step ' + (fase === 3 ? "active" : "") + '"></div>' +
    '</div>' +
    '<div style="text-align:center;font-size:var(--fs-footnote);color:var(--color-label-secondary);margin-bottom:var(--space-4);">Paso ' + fase + ' de 3</div>';

    var content = "";
    if (fase === 1) content = renderWizardFase1();
    else if (fase === 2) content = renderWizardFase2();
    else content = renderWizardFase3();

    setPage('<div class="page-container">' + stepperHtml + content + '</div>');

    // Attach listeners after DOM
    setTimeout(attachWizardListeners, 50);
  }

  function renderWizardFase1() {
    var d = STATE.wizard.datos;
    return '<div class="card" style="padding:var(--space-5);">' +
      '<div style="font-size:var(--fs-title3);font-weight:600;color:var(--color-label);margin-bottom:var(--space-5);">Datos del grupo</div>' +
      '<div style="display:flex;flex-direction:column;gap:var(--space-4);">' +
        '<div class="ios-field">' +
          '<label class="ios-field__label" for="wNombre">Nombre del grupo <span style="color:var(--color-red)">*</span></label>' +
          '<input class="ios-field__input" type="text" id="wNombre" placeholder="Ej: Polla de la Oficina" minlength="3" maxlength="50" value="' + esc(d.nombre) + '" aria-required="true">' +
          '<div class="ios-field__error" id="wNombreErr" role="alert" style="display:none"></div>' +
          '<div class="ios-field__hint">Entre 3 y 50 caracteres</div>' +
        '</div>' +
        '<div class="ios-field">' +
          '<label class="ios-field__label" for="wDesc">Descripción</label>' +
          '<textarea class="ios-field__input" id="wDesc" placeholder="Describe tu grupo..." maxlength="280" rows="3" style="resize:vertical;height:auto">' + esc(d.descripcion) + '</textarea>' +
          '<div class="ios-field__hint" id="wDescCount">' + (d.descripcion ? d.descripcion.length : 0) + '/280 caracteres</div>' +
        '</div>' +
        '<div class="ios-field">' +
          '<div class="ios-field__label">Torneo</div>' +
          '<div class="ios-field__input" style="color:var(--color-label-secondary);cursor:not-allowed;background:var(--color-fill-tertiary);">Mundial 2026</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:flex-end;margin-top:var(--space-4);">' +
      '<button class="btn btn--filled" onclick="wizardNext()" id="wBtnNext">Siguiente</button>' +
    '</div>';
  }

  function renderWizardFase2() {
    var r = STATE.wizard.reglas;
    var suma = (r.premio_primer_lugar || 0) + (r.premio_segundo_lugar || 0) + (r.premio_tercer_lugar || 0);
    var sumaOk = suma === 100;

    var tooltip = function (txt) {
      return '<span style="color:var(--color-label-tertiary);margin-left:4px;cursor:help;" title="' + esc(txt) + '">' + svgInfo() + '</span>';
    };

    var numField = function (id, label, val, tip, min, max, step) {
      return '<div class="inset-list__row inset-list__row--no-action">' +
        '<div class="inset-list__row-content">' +
          '<div class="inset-list__row-title">' + esc(label) + tooltip(tip) + '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<input type="number" id="' + id + '" value="' + val + '" min="' + (min||0) + '" max="' + (max||999) + '" step="' + (step||1) + '" ' +
            'style="width:72px;text-align:right;font-size:var(--fs-callout);font-weight:600;background:var(--color-fill-tertiary);border:0.5px solid var(--color-separator);border-radius:var(--radius-md);padding:4px 8px;color:var(--color-label);-webkit-appearance:none;" ' +
            'onchange="updateWizardRegla(\'' + id + '\',this.value)">' +
        '</div>' +
      '</div>';
    };

    return '<div style="display:flex;flex-direction:column;gap:var(--space-4);">' +
      '<div style="font-size:var(--fs-title3);font-weight:600;color:var(--color-label)">Reglas de puntuación</div>' +

      '<div class="inset-list">' +
        '<div class="inset-list__section">' +
          '<div class="inset-list__header">Puntos base</div>' +
          '<div class="inset-list__group">' +
            numField("r_marcador","Marcador exacto",r.pts_marcador_exacto,"Acierto total del marcador (goles local y visitante)",0,20) +
            numField("r_ganador","Ganador correcto",r.pts_ganador,"Aciertas quién gana o si es empate, sin acertar el marcador exacto",0,10) +
            numField("r_gol","Gol acertado",r.pts_gol_acertado,"Aciertas los goles de un equipo (aunque falles el otro)",0,5) +
            numField("r_unica","Predicción única",r.pts_prediccion_unica,"Eres el único en el grupo con ese marcador exacto",0,10) +
          '</div>' +
        '</div>' +

        '<div class="inset-list__section">' +
          '<div class="inset-list__header">Bonos por fase eliminatoria</div>' +
          '<div class="inset-list__group">' +
            numField("r_d16","Dieciseisavos",r.bono_dieciseisavos,"Bono adicional por marcador exacto en dieciseisavos",0,20) +
            numField("r_oct","Octavos de final",r.bono_octavos,"Bono adicional por marcador exacto en octavos",0,20) +
            numField("r_cua","Cuartos de final",r.bono_cuartos,"Bono adicional por marcador exacto en cuartos",0,15) +
            numField("r_sem","Semifinales",r.bono_semifinales,"Bono adicional por marcador exacto en semifinales",0,15) +
            numField("r_fin","Final",r.bono_final,"Bono adicional por marcador exacto en la final",0,20) +
          '</div>' +
        '</div>' +

        '<div class="inset-list__section">' +
          '<div class="inset-list__header">Apuesta y premios</div>' +
          '<div class="inset-list__group">' +
            numField("r_apuesta","Valor apuesta (COP)",r.valor_apuesta,"Monto en pesos que paga cada participante",0,10000000,1000) +
            numField("r_p1","Premio 1.er lugar (%)",r.premio_primer_lugar,"Porcentaje del pozo para el ganador. La suma de los 3 premios debe ser 100%.",0,100) +
            numField("r_p2","Premio 2.º lugar (%)",r.premio_segundo_lugar,"Porcentaje del pozo para el segundo lugar.",0,100) +
            numField("r_p3","Premio 3.er lugar (%)",r.premio_tercer_lugar,"Porcentaje del pozo para el tercer lugar.",0,100) +
          '</div>' +
          '<div class="inset-list__footer" id="sumaPremioBanner" style="' + (sumaOk ? "color:var(--color-green)" : "color:var(--color-red)") + '">' +
            'Suma de premios: <strong>' + suma + '%</strong> ' + (sumaOk ? '✓ Correcto' : '— Debe sumar 100%') +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:var(--space-4);">' +
      '<button class="btn btn--outlined" onclick="wizardBack()">Atrás</button>' +
      '<button class="btn btn--filled" onclick="wizardNext()" id="wBtnNext2" ' + (sumaOk ? "" : "disabled") + '>Siguiente</button>' +
    '</div>';
  }

  function renderWizardFase3() {
    var seleccionados = STATE.wizard.partidos;

    var html = '<div style="font-size:var(--fs-title3);font-weight:600;color:var(--color-label);margin-bottom:var(--space-4)">Seleccionar partidos</div>';

    P.FASES.forEach(function (fase) {
      var partidosFase = P.partidosPorFase(fase.id);
      if (partidosFase.length === 0) return;

      var todosSel = partidosFase.every(function (m) { return seleccionados[m.n]; });
      var ningunSel = partidosFase.every(function (m) { return !seleccionados[m.n]; });
      var indeterminate = !todosSel && !ningunSel;

      var cbState = todosSel ? "checked" : (indeterminate ? "indeterminate" : "");
      var checkboxHtml = '<div class="ios-checkbox ' + cbState + '" id="cb_fase_' + fase.id + '" onclick="toggleFase(\'' + fase.id + '\')" role="checkbox" aria-label="Seleccionar toda la fase" aria-checked="' + (todosSel ? "true" : (indeterminate ? "mixed" : "false")) + '" tabindex="0">' +
        (todosSel ? svgCheck() : (indeterminate ? svgMinus() : "")) +
      '</div>';

      html += '<div style="margin-bottom:var(--space-4);">' +
        '<div style="display:flex;align-items:center;gap:var(--space-3);padding:0 2px var(--space-2);">' +
          checkboxHtml +
          '<span style="font-size:var(--fs-footnote);font-weight:600;color:var(--color-label-secondary);text-transform:uppercase;letter-spacing:0.04em;">' + esc(fase.nombre) + '</span>' +
        '</div>' +
        '<div class="inset-list__group">';

      partidosFase.forEach(function (m) {
        var sel = seleccionados[m.n];
        var cbLocal = '<div class="ios-checkbox ' + (sel ? "checked" : "") + '" id="cb_' + m.n + '" onclick="togglePartido(' + m.n + ')" role="checkbox" aria-label="Partido ' + P.etiquetaEquipo(m.local) + ' vs ' + P.etiquetaEquipo(m.visitante) + '" aria-checked="' + !!sel + '" tabindex="0">' +
          (sel ? svgCheck() : "") +
        '</div>';

        var banLocal = P.banderaEquipo(m.local);
        var banVis = P.banderaEquipo(m.visitante);
        var nomLocal = P.etiquetaEquipo(m.local);
        var nomVis = P.etiquetaEquipo(m.visitante);

        html += '<div class="inset-list__row inset-list__row--no-action" style="gap:var(--space-3);">' +
          cbLocal +
          '<div style="flex:1;display:flex;align-items:center;gap:var(--space-2);">' +
            '<span style="font-size:18px">' + banLocal + '</span>' +
            '<span style="font-size:var(--fs-footnote);color:var(--color-label);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(nomLocal) + '</span>' +
            '<span style="font-size:var(--fs-caption1);color:var(--color-label-tertiary);flex-shrink:0">vs</span>' +
            '<span style="font-size:var(--fs-footnote);color:var(--color-label);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;">' + esc(nomVis) + '</span>' +
            '<span style="font-size:18px">' + banVis + '</span>' +
          '</div>' +
          '<div style="font-size:var(--fs-caption1);color:var(--color-label-tertiary);white-space:nowrap;flex-shrink:0;">' +
            esc(P.fechaCorta(m)) +
          '</div>' +
        '</div>';
      });

      html += '</div></div>';
    });

    html += '<div style="display:flex;justify-content:space-between;margin-top:var(--space-4);">' +
      '<button class="btn btn--outlined" onclick="wizardBack()">Atrás</button>' +
      '<button class="btn btn--filled btn--lg" onclick="wizardConfirmar()">Crear grupo</button>' +
    '</div>';

    return html;
  }

  window.wizardNext = function () {
    var f = STATE.wizard.fase;
    if (f === 1) {
      var nombre = document.getElementById("wNombre");
      if (!nombre || nombre.value.trim().length < 3) {
        var err = document.getElementById("wNombreErr");
        if (err) { err.textContent = "El nombre debe tener entre 3 y 50 caracteres"; err.style.display = "block"; }
        if (nombre) nombre.classList.add("ios-field__input--error");
        return;
      }
      STATE.wizard.datos.nombre = nombre.value.trim();
      var desc = document.getElementById("wDesc");
      STATE.wizard.datos.descripcion = desc ? desc.value.trim() : "";
      STATE.wizard.fase = 2;
    } else if (f === 2) {
      var suma = (STATE.wizard.reglas.premio_primer_lugar || 0) +
                 (STATE.wizard.reglas.premio_segundo_lugar || 0) +
                 (STATE.wizard.reglas.premio_tercer_lugar || 0);
      if (suma !== 100) { showToast("Los premios deben sumar 100%", "error"); return; }
      STATE.wizard.fase = 3;
    }
    renderCrear();
  };

  window.wizardBack = function () {
    if (STATE.wizard.fase > 1) {
      STATE.wizard.fase--;
      renderCrear();
    } else {
      navigate("/dashboard");
    }
  };

  window.wizardConfirmar = function () {
    var sel = Object.values(STATE.wizard.partidos).filter(Boolean).length;
    if (sel === 0) { showToast("Selecciona al menos un partido", "error"); return; }
    showToast("Grupo creado. Código: PLLA26", "success");
    STATE.wizard = { fase: 1, datos: { nombre: "", descripcion: "" }, partidos: null, reglas: null };
    setTimeout(function () { navigate("/grupo/g-oficina"); }, 800);
  };

  window.updateWizardRegla = function (id, val) {
    var map = {
      r_marcador: "pts_marcador_exacto", r_ganador: "pts_ganador", r_gol: "pts_gol_acertado",
      r_unica: "pts_prediccion_unica", r_d16: "bono_dieciseisavos", r_oct: "bono_octavos",
      r_cua: "bono_cuartos", r_sem: "bono_semifinales", r_fin: "bono_final",
      r_apuesta: "valor_apuesta", r_p1: "premio_primer_lugar", r_p2: "premio_segundo_lugar",
      r_p3: "premio_tercer_lugar"
    };
    if (map[id]) STATE.wizard.reglas[map[id]] = parseFloat(val) || 0;

    // Actualizar banner de suma de premios en vivo
    var suma = (STATE.wizard.reglas.premio_primer_lugar || 0) +
               (STATE.wizard.reglas.premio_segundo_lugar || 0) +
               (STATE.wizard.reglas.premio_tercer_lugar || 0);
    var banner = document.getElementById("sumaPremioBanner");
    var btn = document.getElementById("wBtnNext2");
    if (banner) {
      banner.style.color = suma === 100 ? "var(--color-green)" : "var(--color-red)";
      banner.innerHTML = 'Suma de premios: <strong>' + suma + '%</strong> ' + (suma === 100 ? '✓ Correcto' : '— Debe sumar 100%');
    }
    if (btn) btn.disabled = suma !== 100;
  };

  window.togglePartido = function (n) {
    STATE.wizard.partidos[n] = !STATE.wizard.partidos[n];
    var cb = document.getElementById("cb_" + n);
    if (cb) {
      cb.className = "ios-checkbox " + (STATE.wizard.partidos[n] ? "checked" : "");
      cb.setAttribute("aria-checked", String(STATE.wizard.partidos[n]));
      cb.innerHTML = STATE.wizard.partidos[n] ? svgCheck() : "";
    }
    // Update phase parent checkbox
    updateFaseCheckbox(n);
  };

  function updateFaseCheckbox(n) {
    var m = P.PARTIDOS.find(function (x) { return x.n === n; });
    if (!m) return;
    var fase = m.fase;
    var fasePartidos = P.partidosPorFase(fase);
    var todosSel = fasePartidos.every(function (p) { return STATE.wizard.partidos[p.n]; });
    var ningunSel = fasePartidos.every(function (p) { return !STATE.wizard.partidos[p.n]; });
    var indeterminate = !todosSel && !ningunSel;
    var cbFase = document.getElementById("cb_fase_" + fase);
    if (cbFase) {
      cbFase.className = "ios-checkbox " + (todosSel ? "checked" : (indeterminate ? "indeterminate" : ""));
      cbFase.setAttribute("aria-checked", todosSel ? "true" : (indeterminate ? "mixed" : "false"));
      cbFase.innerHTML = todosSel ? svgCheck() : (indeterminate ? svgMinus() : "");
    }
  }

  window.toggleFase = function (faseId) {
    var fasePartidos = P.partidosPorFase(faseId);
    var todosSel = fasePartidos.every(function (m) { return STATE.wizard.partidos[m.n]; });
    var newVal = !todosSel;
    fasePartidos.forEach(function (m) { STATE.wizard.partidos[m.n] = newVal; });

    // Update all partido checkboxes
    fasePartidos.forEach(function (m) {
      var cb = document.getElementById("cb_" + m.n);
      if (cb) {
        cb.className = "ios-checkbox " + (newVal ? "checked" : "");
        cb.setAttribute("aria-checked", String(newVal));
        cb.innerHTML = newVal ? svgCheck() : "";
      }
    });

    var cbFase = document.getElementById("cb_fase_" + faseId);
    if (cbFase) {
      cbFase.className = "ios-checkbox " + (newVal ? "checked" : "");
      cbFase.setAttribute("aria-checked", String(newVal));
      cbFase.innerHTML = newVal ? svgCheck() : "";
    }
  };

  function attachWizardListeners() {
    var desc = document.getElementById("wDesc");
    if (desc) {
      desc.addEventListener("input", function () {
        var cnt = document.getElementById("wDescCount");
        if (cnt) cnt.textContent = desc.value.length + "/280 caracteres";
      });
    }
    var nombre = document.getElementById("wNombre");
    if (nombre) {
      nombre.addEventListener("input", function () {
        if (nombre.value.trim().length >= 3) {
          nombre.classList.remove("ios-field__input--error");
          var err = document.getElementById("wNombreErr");
          if (err) err.style.display = "none";
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. BUSCAR / UNIRSE
  // ---------------------------------------------------------------------------
  function renderBuscar() {
    setShell({
      title: "Buscar grupo",
      showTabBar: true,
      tabBarActive: "buscar",
    });

    var html = '<div class="page-container">' +
      '<div class="large-title" style="padding-left:0">Unirse a un grupo</div>' +
      '<p style="font-size:var(--fs-body);color:var(--color-label-secondary);margin-bottom:var(--space-6)">Ingresa el código de invitación para unirte a una polla.</p>' +

      '<div class="card" style="padding:var(--space-5)">' +
        '<div class="ios-field">' +
          '<label class="ios-field__label" for="codigoInput">Código del grupo</label>' +
          '<input class="ios-field__input" type="text" id="codigoInput" placeholder="Ej: PLLA26" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:0.15em;font-size:var(--fs-title3);font-weight:700;text-align:center" aria-required="true">' +
          '<div class="ios-field__error" id="codigoError" role="alert" style="display:none">Ingresa un código válido</div>' +
        '</div>' +
        '<button class="btn btn--filled btn--full" style="margin-top:var(--space-4)" onclick="buscarGrupo()" id="btnBuscar">Buscar</button>' +
      '</div>' +

      '<div id="previewGrupo" style="margin-top:var(--space-4)"></div>' +
    '</div>';

    setPage(html);
    setTimeout(function () {
      var inp = document.getElementById("codigoInput");
      if (inp) {
        inp.addEventListener("input", function () {
          this.value = this.value.toUpperCase();
          var err = document.getElementById("codigoError");
          if (err && this.value.length > 0) err.style.display = "none";
        });
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") buscarGrupo();
        });
      }
    }, 50);
  }

  window.buscarGrupo = function () {
    var inp = document.getElementById("codigoInput");
    var codigo = inp ? inp.value.trim().toUpperCase() : "";
    var err = document.getElementById("codigoError");
    if (!codigo) {
      if (err) err.style.display = "block";
      if (inp) inp.classList.add("ios-field__input--error");
      return;
    }
    if (err) err.style.display = "none";
    if (inp) inp.classList.remove("ios-field__input--error");

    // Para el demo, cualquier código no vacío muestra el grupo demo
    var g = P.GRUPO_DEMO;
    var pozo = g.reglas.valor_apuesta * g.participantes.filter(function (p) { return p.pago; }).length;

    var preview = document.getElementById("previewGrupo");
    if (!preview) return;
    preview.innerHTML = '<div class="card" style="padding:var(--space-5);margin-top:var(--space-4);">' +
      '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">' +
        '<div style="font-size:40px">⚽</div>' +
        '<div>' +
          '<div style="font-size:var(--fs-title3);font-weight:600;color:var(--color-label)">' + esc(g.nombre) + '</div>' +
          '<div style="font-size:var(--fs-subhead);color:var(--color-label-secondary)">' + esc(g.torneo) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="inset-list__group">' +
        '<div class="inset-list__row inset-list__row--no-action">' +
          '<div class="inset-list__row-content"><div class="inset-list__row-title">Descripción</div></div>' +
          '<div class="inset-list__row-value" style="max-width:60%;text-align:right;white-space:normal;font-size:var(--fs-footnote)">' + esc(g.descripcion) + '</div>' +
        '</div>' +
        '<div class="inset-list__row inset-list__row--no-action">' +
          '<div class="inset-list__row-content"><div class="inset-list__row-title">Participantes</div></div>' +
          '<div class="inset-list__row-value">' + g.participantes.length + ' jugadores</div>' +
        '</div>' +
        '<div class="inset-list__row inset-list__row--no-action">' +
          '<div class="inset-list__row-content"><div class="inset-list__row-title">Valor apuesta</div></div>' +
          '<div class="inset-list__row-value">' + formatCOP(g.reglas.valor_apuesta) + '</div>' +
        '</div>' +
        '<div class="inset-list__row inset-list__row--no-action">' +
          '<div class="inset-list__row-content"><div class="inset-list__row-title">Pozo estimado</div></div>' +
          '<div class="inset-list__row-value" style="color:var(--color-green);font-weight:600">' + formatCOP(pozo) + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="btn btn--filled btn--full" style="margin-top:var(--space-5)" onclick="unirseGrupo()">Unirme al grupo</button>' +
    '</div>';
  };

  window.unirseGrupo = function () {
    showToast("Te uniste a la polla exitosamente", "success");
    setTimeout(function () { navigate("/grupo/g-oficina"); }, 600);
  };

  // ---------------------------------------------------------------------------
  // 5. VISTA DE GRUPO
  // ---------------------------------------------------------------------------
  var GRUPO_TABS = [
    { id: "predicciones", label: "Mis Predicciones" },
    { id: "tabla", label: "Tabla" },
    { id: "partidos", label: "Partidos" },
    { id: "reglas", label: "Reglas" },
    { id: "participantes", label: "Participantes" },
    { id: "configuracion", label: "Configuración" },
  ];

  function renderGrupo() {
    var g = P.GRUPO_DEMO;

    var themeAction = '<button class="glass-navbar__action" onclick="toggleTheme()" aria-label="Cambiar tema">' +
      (STATE.theme === "dark" ? svgSun() : svgMoon()) + '</button>';

    setShell({
      title: g.nombre,
      backRoute: "/dashboard",
      backLabel: "Mis Grupos",
      showTabBar: true,
      tabBarActive: "grupo",
      actionHtml: themeAction,
    });

    var tab = STATE.grupoTab;

    // Header del grupo
    var participantesPagaron = g.participantes.filter(function (p) { return p.pago; }).length;
    var pozo = g.reglas.valor_apuesta * participantesPagaron;

    var headerHtml = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-3);">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-3);">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:var(--fs-title3);font-weight:700;color:var(--color-label);margin-bottom:2px">' + esc(g.nombre) + '</div>' +
          '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary)">' + esc(g.torneo) + ' · ' + g.participantes.length + ' participantes</div>' +
        '</div>' +
        '<span class="badge badge--green">Activo</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:var(--space-2);">' +
        '<div style="background:var(--color-fill-tertiary);border:0.5px solid var(--color-separator);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);flex:1;">' +
          '<span style="font-size:var(--fs-caption1);color:var(--color-label-secondary)">Código: </span>' +
          '<span style="font-size:var(--fs-callout);font-weight:700;letter-spacing:0.12em;color:var(--color-label)">' + esc(g.codigo) + '</span>' +
        '</div>' +
        '<button class="btn btn--tonal btn--sm" onclick="copyToClipboard(\'' + g.codigo + '\')" aria-label="Copiar código de invitación">' +
          svgCopy() + '<span>Copiar</span>' +
        '</button>' +
      '</div>' +
    '</div>';

    // Segmented control (scrollable)
    var tabsHtml = '<div style="padding:0 var(--space-4) var(--space-3);overflow-x:auto;white-space:nowrap;scrollbar-width:none;" role="tablist">' +
      '<div class="segmented-control" style="display:inline-flex;min-width:100%;gap:0">';
    GRUPO_TABS.forEach(function (t) {
      tabsHtml += '<button class="segmented-control__option' + (t.id === tab ? " active" : "") + '" ' +
        'onclick="setGrupoTab(\'' + t.id + '\')" ' +
        'role="tab" aria-selected="' + (t.id === tab) + '" ' +
        'id="gtab-' + t.id + '">' + esc(t.label) + '</button>';
    });
    tabsHtml += '</div></div>';

    var contentHtml = "";
    if (tab === "predicciones") contentHtml = renderTabPredicciones(g);
    else if (tab === "tabla") contentHtml = renderTabTabla(g);
    else if (tab === "partidos") contentHtml = renderTabPartidos(g);
    else if (tab === "reglas") contentHtml = renderTabReglas(g);
    else if (tab === "participantes") contentHtml = renderTabParticipantes(g);
    else if (tab === "configuracion") contentHtml = renderTabConfiguracion(g);

    setPage('<div style="max-width:680px;margin:0 auto;">' +
      '<div style="padding:var(--space-4) var(--space-4) 0">' + headerHtml + '</div>' +
      tabsHtml +
      '<div style="padding:0 var(--space-4) var(--space-4)">' + contentHtml + '</div>' +
    '</div>');
  }

  window.setGrupoTab = function (tab) {
    STATE.grupoTab = tab;
    renderGrupo();
  };

  // ---- Tab: Mis Predicciones ----
  function renderTabPredicciones(g) {
    var partidos = P.PARTIDOS.filter(function (m) {
      return m.fase === "fase_grupos" || (P.estadoPartido(m) !== "programado" || P.prediccionAbierta(m, g.reglas));
    });
    // Mostrar partidos del grupo (primeros 30 para demo)
    partidos = P.PARTIDOS.slice(0, 36);

    var html = '<div style="display:flex;flex-direction:column;gap:var(--space-3);">';

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
    var pred = getPrediccion(m);
    var real = P.resultadoReal(m);
    var puntos = P.misPuntos(m, g.reglas);

    var banLocal = P.banderaEquipo(m.local);
    var banVis = P.banderaEquipo(m.visitante);
    var nomLocal = P.etiquetaEquipo(m.local);
    var nomVis = P.etiquetaEquipo(m.visitante);

    var estadoBadge = badgePartidoEstado(m);
    var faseLabel = nombreFase(m.fase);

    var marcadorHtml;
    if (estado === "finalizado" && real) {
      marcadorHtml = '<div class="partido-card__marcador" style="color:var(--color-label)">' + real.gl + ' - ' + real.gv + '</div>';
    } else if (estado === "en_vivo" && real) {
      marcadorHtml = '<div class="partido-card__marcador" style="color:var(--color-red)">' + real.gl + ' - ' + real.gv + '</div>';
    } else {
      marcadorHtml = '<div class="partido-card__hora">' + P.horaCorta(m) + '</div>';
    }

    var prediccionHtml = "";
    if (!definidos) {
      prediccionHtml = '<div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--color-fill-tertiary);border-radius:var(--radius-md);font-size:var(--fs-footnote);color:var(--color-label-secondary);text-align:center;">' +
        'Los equipos se conocerán al finalizar la fase anterior.' +
      '</div>';
    } else if (estado === "finalizado") {
      var ptsHtml = puntos !== null ? '<span class="badge badge--points">' + puntos + ' pts</span>' : '';
      prediccionHtml = '<div style="margin-top:var(--space-3);display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);background:var(--color-fill-tertiary);border-radius:var(--radius-md);">' +
        '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary)">Tu predicción: <strong style="color:var(--color-label)">' + pred.gl + ' - ' + pred.gv + '</strong></div>' +
        ptsHtml +
      '</div>';
    } else if (abierta && definidos) {
      prediccionHtml = '<div id="predForm_' + m.n + '">' + renderPrediccionForm(m, pred) + '</div>';
    } else if (!abierta && estado !== "finalizado") {
      prediccionHtml = '<div style="margin-top:var(--space-3);display:flex;align-items:center;justify-content:space-between;padding:var(--space-3);background:var(--color-fill-tertiary);border-radius:var(--radius-md);">' +
        '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary)">Tu predicción: <strong style="color:var(--color-label)">' + pred.gl + ' - ' + pred.gv + '</strong></div>' +
        '<span style="font-size:var(--fs-caption1);color:var(--color-label-tertiary)">Cerrada</span>' +
      '</div>';
    }

    var clickAttr = clickable ? 'onclick="navigate(\'/grupo/g-oficina/prediccion/' + m.n + '\')" style="cursor:pointer"' : '';
    var clickableStyle = clickable ? "card card--pressable" : "card";

    return '<div class="' + clickableStyle + '">' +
      '<div style="padding:var(--space-4)" ' + clickAttr + '>' +
        '<div class="partido-card__header">' +
          '<span class="partido-card__fase">' + esc(faseLabel) + (m.grupo ? ' · Gr. ' + m.grupo : '') + '</span>' +
          estadoBadge +
        '</div>' +
        '<div class="partido-card__match">' +
          '<div class="partido-card__equipo">' +
            '<span class="partido-card__bandera">' + banLocal + '</span>' +
            '<span class="partido-card__nombre">' + esc(nomLocal) + '</span>' +
          '</div>' +
          '<div class="partido-card__vs">' +
            marcadorHtml +
            '<div style="font-size:var(--fs-caption2);color:var(--color-label-tertiary);">' + esc(P.fechaCorta(m)) + '</div>' +
          '</div>' +
          '<div class="partido-card__equipo">' +
            '<span class="partido-card__bandera">' + banVis + '</span>' +
            '<span class="partido-card__nombre">' + esc(nomVis) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (prediccionHtml ? '<div style="padding:0 var(--space-4) var(--space-4)">' + prediccionHtml + '</div>' : '') +
    '</div>';
  }

  function renderPrediccionForm(m, pred) {
    return '<div class="prediccion-form">' +
      '<div style="font-size:var(--fs-caption1);color:var(--color-label-secondary);text-align:center;margin-bottom:var(--space-3);text-transform:uppercase;letter-spacing:0.04em;font-weight:500;">Tu predicción</div>' +
      '<div class="prediccion-form__row">' +
        '<span class="prediccion-form__equipo-label">' + esc(P.etiquetaEquipo(m.local)) + '</span>' +
        '<div class="ios-stepper">' +
          '<button class="ios-stepper__btn" onclick="adjustGol(' + m.n + ',\'gl\',-1)" aria-label="Restar gol local">−</button>' +
          '<div class="ios-stepper__value" id="val_gl_' + m.n + '">' + pred.gl + '</div>' +
          '<button class="ios-stepper__btn" onclick="adjustGol(' + m.n + ',\'gl\',1)" aria-label="Sumar gol local">+</button>' +
        '</div>' +
        '<span class="prediccion-form__separator">:</span>' +
        '<div class="ios-stepper">' +
          '<button class="ios-stepper__btn" onclick="adjustGol(' + m.n + ',\'gv\',-1)" aria-label="Restar gol visitante">−</button>' +
          '<div class="ios-stepper__value" id="val_gv_' + m.n + '">' + pred.gv + '</div>' +
          '<button class="ios-stepper__btn" onclick="adjustGol(' + m.n + ',\'gv\',1)" aria-label="Sumar gol visitante">+</button>' +
        '</div>' +
        '<span class="prediccion-form__equipo-label">' + esc(P.etiquetaEquipo(m.visitante)) + '</span>' +
      '</div>' +
      '<div class="prediccion-form__actions">' +
        '<button class="btn btn--filled btn--sm" onclick="guardarPrediccion(' + m.n + ')" aria-label="Guardar predicción">Guardar</button>' +
      '</div>' +
    '</div>';
  }

  function getPrediccion(m) {
    var key = "pred_" + m.n;
    if (STATE.predicciones[key]) return STATE.predicciones[key];
    return P.miPrediccion(m);
  }

  window.adjustGol = function (n, campo, delta) {
    var key = "pred_" + n;
    if (!STATE.predicciones[key]) {
      var m = P.partidoPorN(n);
      STATE.predicciones[key] = Object.assign({}, P.miPrediccion(m));
    }
    var val = (STATE.predicciones[key][campo] || 0) + delta;
    if (val < 0) val = 0;
    if (val > 9) val = 9;
    STATE.predicciones[key][campo] = val;
    var el = document.getElementById("val_" + campo + "_" + n);
    if (el) el.textContent = val;
  };

  window.guardarPrediccion = function (n) {
    var key = "pred_" + n;
    if (!STATE.predicciones[key]) {
      var m = P.partidoPorN(n);
      STATE.predicciones[key] = Object.assign({}, P.miPrediccion(m));
    }
    localStorage.setItem("polla_predicciones", JSON.stringify(STATE.predicciones));
    showToast("Predicción guardada", "success");
  };

  // ---- Tab: Tabla de Posiciones ----
  function renderTabTabla(g) {
    var tabla = P.tablaPosiciones(g);
    var top3 = tabla.slice(0, 3);
    var resto = tabla.slice(3);

    var podiumHtml = '<div class="podium">';
    var orden = [1, 0, 2]; // 2do, 1ro, 3ro
    orden.forEach(function (i) {
      if (!top3[i]) return;
      var p = top3[i];
      var isFirst = i === 0;
      podiumHtml += '<div class="podium__item podium__item--' + (i+1) + '">' +
        '<div class="podium__avatar-wrap">' +
          (isFirst ? '<div class="podium__crown">👑</div>' : '') +
          '<div class="avatar ' + (p.id === P.USUARIO.id ? "avatar--lg" : "") + '" style="background:' + p.color + '">' + esc(p.avatar) + '</div>' +
          '<div class="podium__rank">' + p.posicion + '</div>' +
        '</div>' +
        '<div class="podium__name">' + esc(p.nombre.split(" ")[0]) + '</div>' +
        '<div class="podium__pts">' + p.puntos + ' pts</div>' +
        '<div class="podium__bar"></div>' +
      '</div>';
    });
    podiumHtml += '</div>';

    var listaHtml = '<div class="inset-list__group" style="margin-top:var(--space-3);">';
    tabla.forEach(function (p) {
      var esYo = p.id === P.USUARIO.id;
      listaHtml += '<div class="inset-list__row inset-list__row--no-action" style="' + (esYo ? "background:var(--color-accent-muted);" : "") + '">' +
        '<div style="font-size:var(--fs-subhead);font-weight:700;color:var(--color-label-secondary);min-width:24px;text-align:center">' + p.posicion + '</div>' +
        '<div class="avatar avatar--sm" style="background:' + p.color + '">' + esc(p.avatar) + '</div>' +
        '<div class="inset-list__row-content">' +
          '<div class="inset-list__row-title">' + esc(p.nombre) + (esYo ? ' <span class="badge badge--blue" style="font-size:10px">Tú</span>' : '') + '</div>' +
          '<div class="inset-list__row-subtitle">' + p.aciertos + ' aciertos</div>' +
        '</div>' +
        '<div style="font-size:var(--fs-headline);font-weight:700;color:var(--color-accent)">' + p.puntos + '</div>' +
      '</div>';
    });
    listaHtml += '</div>';

    return podiumHtml + listaHtml;
  }

  // ---- Tab: Partidos ----
  function renderTabPartidos(g) {
    var filtroFase = STATE.grupoTabPartidos_fase || "todas";
    var fases = [{ id: "todas", label: "Todos" }].concat(P.FASES);

    var chipsHtml = '<div class="chips-scroll" style="padding-left:0;margin-bottom:var(--space-3);">';
    fases.forEach(function (f) {
      chipsHtml += '<button class="chip' + (filtroFase === f.id ? " active" : "") + '" onclick="setFiltroFase(\'' + f.id + '\')">' + esc(f.label || f.nombre) + '</button>';
    });
    chipsHtml += '</div>';

    var partidos = filtroFase === "todas" ? P.PARTIDOS : P.partidosPorFase(filtroFase);

    var html = chipsHtml + '<div style="display:flex;flex-direction:column;gap:var(--space-3);">';
    partidos.slice(0, 40).forEach(function (m) {
      var estado = P.estadoPartido(m);
      var real = P.resultadoReal(m);
      var pred = getPrediccion(m);
      var puntos = P.misPuntos(m, g.reglas);

      var banLocal = P.banderaEquipo(m.local);
      var banVis = P.banderaEquipo(m.visitante);
      var nomLocal = P.etiquetaEquipo(m.local);
      var nomVis = P.etiquetaEquipo(m.visitante);

      html += '<button class="card card--pressable" style="padding:var(--space-4);text-align:left;width:100%;" onclick="navigate(\'/grupo/g-oficina/prediccion/' + m.n + '\')">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">' +
          '<span style="font-size:var(--fs-caption1);color:var(--color-label-tertiary);text-transform:uppercase;font-weight:500">' + esc(nombreFase(m.fase)) + (m.grupo ? ' G' + m.grupo : '') + '</span>' +
          badgePartidoEstado(m) +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:var(--space-3);">' +
          '<div style="flex:1;display:flex;align-items:center;gap:var(--space-2)">' +
            '<span style="font-size:24px">' + banLocal + '</span>' +
            '<span style="font-size:var(--fs-footnote);font-weight:500;color:var(--color-label)">' + esc(nomLocal) + '</span>' +
          '</div>' +
          '<div style="text-align:center;min-width:60px">' +
            (real ? '<span style="font-size:var(--fs-title2);font-weight:700;color:var(--color-label)">' + real.gl + ' - ' + real.gv + '</span>' :
              '<span style="font-size:var(--fs-subhead);color:var(--color-label-tertiary)">' + P.horaCorta(m) + '</span>') +
          '</div>' +
          '<div style="flex:1;display:flex;align-items:center;gap:var(--space-2);justify-content:flex-end">' +
            '<span style="font-size:var(--fs-footnote);font-weight:500;color:var(--color-label)">' + esc(nomVis) + '</span>' +
            '<span style="font-size:24px">' + banVis + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-2);">' +
          '<span style="font-size:var(--fs-caption1);color:var(--color-label-secondary)">Tu apuesta: <strong style="color:var(--color-label)">' + pred.gl + ' - ' + pred.gv + '</strong></span>' +
          (puntos !== null ? '<span class="badge badge--points">' + puntos + ' pts</span>' : '') +
        '</div>' +
      '</button>';
    });
    html += '</div>';
    return html;
  }

  window.setFiltroFase = function (faseId) {
    STATE.grupoTabPartidos_fase = faseId;
    renderGrupo();
  };

  // ---- Tab: Reglas ----
  function renderTabReglas(g) {
    var r = g.reglas;
    var participantesPagaron = g.participantes.filter(function (p) { return p.pago; }).length;
    var pozo = r.valor_apuesta * participantesPagaron;

    var fila = function (label, valor, color) {
      return '<div class="inset-list__row inset-list__row--no-action">' +
        '<div class="inset-list__row-content"><div class="inset-list__row-title">' + esc(label) + '</div></div>' +
        '<div class="inset-list__row-value" style="' + (color ? "color:" + color + ";font-weight:700" : "") + '">' + esc(String(valor)) + '</div>' +
      '</div>';
    };

    return '<div class="inset-list">' +
      '<div class="inset-list__section">' +
        '<div class="inset-list__header">Puntos base</div>' +
        '<div class="inset-list__group">' +
          fila("Marcador exacto", r.pts_marcador_exacto + " pts", "var(--color-accent)") +
          fila("Ganador correcto", r.pts_ganador + " pts") +
          fila("Gol acertado", r.pts_gol_acertado + " pt") +
          fila("Predicción única", "+" + r.pts_prediccion_unica + " pts") +
        '</div>' +
      '</div>' +

      '<div class="inset-list__section">' +
        '<div class="inset-list__header">Bonos eliminatorias</div>' +
        '<div class="inset-list__group">' +
          fila("Dieciseisavos", "+" + r.bono_dieciseisavos + " pts") +
          fila("Octavos de final", "+" + r.bono_octavos + " pts") +
          fila("Cuartos de final", "+" + r.bono_cuartos + " pts") +
          fila("Semifinales", "+" + r.bono_semifinales + " pts") +
          fila("Final", "+" + r.bono_final + " pts") +
        '</div>' +
      '</div>' +

      '<div class="inset-list__section">' +
        '<div class="inset-list__header">Pozo y premios</div>' +
        '<div class="inset-list__group">' +
          fila("Valor apuesta", formatCOP(r.valor_apuesta)) +
          fila("Pozo estimado", formatCOP(pozo), "var(--color-green)") +
          fila("1.er lugar (" + r.premio_primer_lugar + "%)", formatCOP(pozo * r.premio_primer_lugar / 100), "var(--color-yellow)") +
          fila("2.º lugar (" + r.premio_segundo_lugar + "%)", formatCOP(pozo * r.premio_segundo_lugar / 100)) +
          fila("3.er lugar (" + r.premio_tercer_lugar + "%)", formatCOP(pozo * r.premio_tercer_lugar / 100)) +
        '</div>' +
      '</div>' +

      '<div class="inset-list__section">' +
        '<div class="inset-list__header">Otros</div>' +
        '<div class="inset-list__group">' +
          fila("Cierre predicciones", r.minutos_cierre_prediccion + " min antes del partido") +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ---- Tab: Participantes ----
  function renderTabParticipantes(g) {
    var tabla = P.tablaPosiciones(g);
    var ptsMap = {};
    tabla.forEach(function (p) { ptsMap[p.id] = { puntos: p.puntos, posicion: p.posicion }; });

    var html = '<div class="inset-list__group">';
    g.participantes.forEach(function (p) {
      var info = ptsMap[p.id] || { puntos: 0, posicion: "-" };
      var rolBadge = p.rol === "admin" ?
        '<span class="badge badge--blue">Admin</span>' :
        '<span class="badge badge--gray">Jugador</span>';
      var pagoBadge = p.pago ?
        '<span class="badge badge--green">Pagó</span>' :
        '<span class="badge badge--red">Pendiente</span>';

      html += '<div class="inset-list__row inset-list__row--no-action">' +
        '<div class="avatar" style="background:' + p.color + '">' + esc(p.avatar) + '</div>' +
        '<div class="inset-list__row-content">' +
          '<div class="inset-list__row-title">' + esc(p.nombre) + (p.id === P.USUARIO.id ? ' <span class="badge badge--blue" style="font-size:10px">Tú</span>' : '') + '</div>' +
          '<div style="display:flex;gap:4px;margin-top:2px;">' + rolBadge + pagoBadge + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:var(--fs-callout);font-weight:700;color:var(--color-accent)">' + info.puntos + ' pts</div>' +
          '<div style="font-size:var(--fs-caption1);color:var(--color-label-secondary)">' + (info.posicion !== undefined ? '#' + info.posicion : '') + '</div>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  // ---- Tab: Configuración (solo admin) ----
  function renderTabConfiguracion(g) {
    return '<div style="display:flex;flex-direction:column;gap:var(--space-4);">' +
      '<div class="inset-list">' +
        '<div class="inset-list__section">' +
          '<div class="inset-list__header">Editar grupo</div>' +
          '<div class="card" style="padding:var(--space-5);">' +
            '<div class="ios-field" style="margin-bottom:var(--space-4)">' +
              '<label class="ios-field__label" for="cfgNombre">Nombre del grupo</label>' +
              '<input class="ios-field__input" type="text" id="cfgNombre" value="' + esc(g.nombre) + '">' +
            '</div>' +
            '<div class="ios-field" style="margin-bottom:var(--space-4)">' +
              '<label class="ios-field__label" for="cfgDesc">Descripción</label>' +
              '<textarea class="ios-field__input" id="cfgDesc" rows="3">' + esc(g.descripcion) + '</textarea>' +
            '</div>' +
            '<button class="btn btn--filled btn--full" onclick="guardarConfiguracion()">Guardar cambios</button>' +
          '</div>' +
        '</div>' +

        '<div class="inset-list__section">' +
          '<div class="inset-list__header">Invitación</div>' +
          '<div class="inset-list__group">' +
            '<div class="inset-list__row inset-list__row--no-action">' +
              '<div class="inset-list__row-content">' +
                '<div class="inset-list__row-title">Código de invitación</div>' +
                '<div class="inset-list__row-subtitle" style="letter-spacing:0.12em;font-weight:700;font-size:var(--fs-callout)">' + esc(g.codigo) + '</div>' +
              '</div>' +
              '<button class="btn btn--tonal btn--sm" onclick="copyToClipboard(\'' + g.codigo + '\')" aria-label="Copiar código">' + svgCopy() + '<span>Copiar</span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="inset-list__section">' +
          '<div class="inset-list__header">Tema de la app</div>' +
          '<div class="inset-list__group">' +
            '<div class="inset-list__row inset-list__row--no-action">' +
              '<div class="inset-list__row-content"><div class="inset-list__row-title">Modo oscuro</div></div>' +
              '<label class="ios-switch" aria-label="Activar modo oscuro">' +
                '<input type="checkbox" ' + (STATE.theme === "dark" ? "checked" : "") + ' onchange="toggleTheme()">' +
                '<div class="ios-switch__track"><div class="ios-switch__thumb"></div></div>' +
              '</label>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="inset-list__section">' +
          '<div class="inset-list__header">Zona de peligro</div>' +
          '<div class="inset-list__group">' +
            '<button class="inset-list__row" onclick="salirGrupo()" style="color:var(--color-red);width:100%;text-align:left;">' +
              '<div class="inset-list__row-content"><div class="inset-list__row-title" style="color:var(--color-red)">Salir del grupo</div></div>' +
              svgChevron() +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  window.guardarConfiguracion = function () {
    showToast("Cambios guardados exitosamente", "success");
  };

  window.salirGrupo = function () {
    if (confirm("¿Estás seguro de que quieres salir del grupo?")) {
      showToast("Saliste del grupo", "info");
      navigate("/dashboard");
    }
  };

  // ---------------------------------------------------------------------------
  // 6. DETALLE DE PREDICCIÓN
  // ---------------------------------------------------------------------------
  function renderPrediccion(n) {
    var m = P.partidoPorN(n);
    if (!m) {
      setShell({ title: "Partido no encontrado", backRoute: "/grupo/g-oficina", backLabel: "Grupo" });
      setPage('<div class="empty-state"><div class="empty-state__title">Partido no encontrado</div></div>');
      return;
    }

    var g = P.GRUPO_DEMO;
    var estado = P.estadoPartido(m);
    var abierta = P.prediccionAbierta(m, g.reglas);
    var definidos = P.equiposDefinidos(m);
    var real = P.resultadoReal(m);
    var pred = getPrediccion(m);
    var puntos = P.misPuntos(m, g.reglas);
    var statGlobal = P.estadisticasGlobales(m);
    var statGrupo = P.estadisticasGrupo(g, m);
    var nominales = P.prediccionesNominales(g, m);

    var banLocal = P.banderaEquipo(m.local);
    var banVis = P.banderaEquipo(m.visitante);
    var nomLocal = P.etiquetaEquipo(m.local);
    var nomVis = P.etiquetaEquipo(m.visitante);

    setShell({
      title: nomLocal + " vs " + nomVis,
      backRoute: "/grupo/g-oficina",
      backLabel: "Grupo",
      showTabBar: false,
    });

    // Cabecera del partido
    var marcadorHtml = "";
    if (real) {
      marcadorHtml = '<div style="font-size:3rem;font-weight:800;color:var(--color-label);letter-spacing:-2px;line-height:1">' + real.gl + ' — ' + real.gv + '</div>';
    } else {
      marcadorHtml = '<div style="font-size:var(--fs-title2);color:var(--color-label-secondary)">' + P.horaCorta(m) + '</div>';
    }

    var cabeceraHtml = '<div class="card" style="padding:var(--space-5);margin-bottom:var(--space-4);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">' +
        '<span style="font-size:var(--fs-caption1);color:var(--color-label-tertiary);text-transform:uppercase">' + esc(nombreFase(m.fase)) + (m.grupo ? ' · Gr. ' + m.grupo : '') + '</span>' +
        badgePartidoEstado(m) +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:var(--space-4);margin:var(--space-4) 0">' +
        '<div style="flex:1;text-align:center">' +
          '<div style="font-size:48px">' + banLocal + '</div>' +
          '<div style="font-size:var(--fs-subhead);font-weight:600;color:var(--color-label);margin-top:var(--space-2)">' + esc(nomLocal) + '</div>' +
        '</div>' +
        '<div style="text-align:center">' +
          marcadorHtml +
          (puntos !== null ? '<div style="margin-top:var(--space-2)"><span class="badge badge--points">' + puntos + ' pts</span></div>' : '') +
        '</div>' +
        '<div style="flex:1;text-align:center">' +
          '<div style="font-size:48px">' + banVis + '</div>' +
          '<div style="font-size:var(--fs-subhead);font-weight:600;color:var(--color-label);margin-top:var(--space-2)">' + esc(nomVis) + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;font-size:var(--fs-footnote);color:var(--color-label-secondary)">' +
        esc(P.fechaCorta(m)) + ' · ' + esc(P.horaCorta(m)) + ' · ' + esc(m.estadio) +
      '</div>' +
    '</div>';

    // Formulario de predicción
    var predHtml = "";
    if (!definidos) {
      predHtml = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);text-align:center;color:var(--color-label-secondary)">' +
        'Los equipos de este partido se conocerán al finalizar la fase anterior.' +
      '</div>';
    } else if (estado === "finalizado") {
      predHtml = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary);margin-bottom:4px">Tu predicción</div>' +
            '<div style="font-size:var(--fs-title2);font-weight:700;color:var(--color-label)">' + pred.gl + ' — ' + pred.gv + '</div>' +
          '</div>' +
          (puntos !== null ? '<span class="badge badge--points" style="font-size:var(--fs-body);padding:6px 12px">' + puntos + ' pts</span>' : '') +
        '</div>' +
      '</div>';
    } else if (abierta && definidos) {
      predHtml = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);">' +
        '<div style="font-size:var(--fs-subhead);font-weight:600;color:var(--color-label);margin-bottom:var(--space-3)">Tu predicción</div>' +
        '<div id="predFormDetail">' + renderPrediccionForm(m, pred) + '</div>' +
      '</div>';
    } else {
      predHtml = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary);margin-bottom:4px">Tu predicción (cerrada)</div>' +
            '<div style="font-size:var(--fs-title2);font-weight:700;color:var(--color-label)">' + pred.gl + ' — ' + pred.gv + '</div>' +
          '</div>' +
          '<span style="font-size:var(--fs-caption1);color:var(--color-label-tertiary)">Cerrada</span>' +
        '</div>' +
      '</div>';
    }

    // Panel global
    var panelGlobal = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);">' +
      '<div style="font-size:var(--fs-headline);font-weight:600;margin-bottom:var(--space-4)">' +
        svgGlobe() + '<span style="margin-left:8px;vertical-align:middle">Todos los usuarios</span>' +
        '<span style="font-size:var(--fs-caption1);color:var(--color-label-secondary);font-weight:400;margin-left:8px">' + statGlobal.total.toLocaleString("es-CO") + ' predicciones</span>' +
      '</div>' +

      '<div style="margin-bottom:var(--space-4);">' +
        '<div style="font-size:var(--fs-subhead);font-weight:600;color:var(--color-label-secondary);margin-bottom:var(--space-3);text-transform:uppercase;letter-spacing:0.04em;">Ganador</div>' +
        '<div class="dist-bar">' +
          renderDistBar(banLocal + ' ' + nomLocal, statGlobal.ganador.local, "green") +
          renderDistBar("Empate", statGlobal.ganador.empate, "blue") +
          renderDistBar(banVis + ' ' + nomVis, statGlobal.ganador.visitante, "red") +
        '</div>' +
      '</div>' +

      '<div>' +
        '<div style="font-size:var(--fs-subhead);font-weight:600;color:var(--color-label-secondary);margin-bottom:var(--space-3);text-transform:uppercase;letter-spacing:0.04em;">Resultados más comunes</div>' +
        '<div class="dist-bar">' +
          statGlobal.topMarcadores.slice(0, 6).map(function (item) {
            return renderDistBar(item.m, item.pct, "");
          }).join("") +
        '</div>' +
      '</div>' +
    '</div>';

    // Panel del grupo
    var panelGrupoHtml = "";
    if (abierta) {
      // Mostrar mensaje de privacidad o agregados si ≥5 predicciones
      var totalPreds = g.participantes.length;
      if (totalPreds >= 5) {
        panelGrupoHtml = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);">' +
          '<div style="font-size:var(--fs-headline);font-weight:600;margin-bottom:var(--space-4)">' +
            svgPeople() + '<span style="margin-left:8px;vertical-align:middle">Predicciones de mi grupo</span>' +
          '</div>' +
          '<div style="margin-bottom:var(--space-4);">' +
            '<div style="font-size:var(--fs-subhead);font-weight:600;color:var(--color-label-secondary);margin-bottom:var(--space-3);text-transform:uppercase;letter-spacing:0.04em;">Ganador (anónimo)</div>' +
            '<div class="dist-bar">' +
              renderDistBar(banLocal + ' ' + nomLocal, statGrupo.ganador.local, "green") +
              renderDistBar("Empate", statGrupo.ganador.empate, "blue") +
              renderDistBar(banVis + ' ' + nomVis, statGrupo.ganador.visitante, "red") +
            '</div>' +
          '</div>' +
          '<div style="background:var(--color-fill-tertiary);border-radius:var(--radius-lg);padding:var(--space-3);margin-top:var(--space-3);">' +
            '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary);text-align:center;">' +
              svgInfo() + ' Las predicciones de tus amigos son secretas. Estarán disponibles luego de que se cierre la apuesta.' +
            '</div>' +
          '</div>' +
        '</div>';
      } else {
        panelGrupoHtml = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);">' +
          '<div style="font-size:var(--fs-headline);font-weight:600;margin-bottom:var(--space-4)">' +
            svgPeople() + '<span style="margin-left:8px;vertical-align:middle">Predicciones de mi grupo</span>' +
          '</div>' +
          '<div style="background:var(--color-fill-tertiary);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center;">' +
            '<div style="font-size:20px;margin-bottom:var(--space-2)">🔒</div>' +
            '<div style="font-size:var(--fs-subhead);font-weight:600;color:var(--color-label);margin-bottom:var(--space-1)">Predicciones secretas</div>' +
            '<div style="font-size:var(--fs-footnote);color:var(--color-label-secondary)">Las predicciones de tus amigos estarán disponibles luego de que se cierre la apuesta.</div>' +
          '</div>' +
        '</div>';
      }
    } else if (nominales) {
      // Apuesta cerrada: mostrar lista nominal
      panelGrupoHtml = '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);">' +
        '<div style="font-size:var(--fs-headline);font-weight:600;margin-bottom:var(--space-4)">' +
          svgPeople() + '<span style="margin-left:8px;vertical-align:middle">Predicciones de mi grupo</span>' +
        '</div>' +
        '<div class="inset-list__group">';

      nominales.forEach(function (p) {
        var esYo = p.id === P.USUARIO.id;
        panelGrupoHtml += '<div class="inset-list__row inset-list__row--no-action" style="' + (esYo ? "background:var(--color-accent-muted);" : "") + '">' +
          '<div class="avatar avatar--sm" style="background:' + p.color + '">' + esc(p.avatar) + '</div>' +
          '<div class="inset-list__row-content">' +
            '<div class="inset-list__row-title">' + esc(p.nombre) + (esYo ? ' <span class="badge badge--blue" style="font-size:10px">Tú</span>' : '') + '</div>' +
            '<div style="font-size:var(--fs-callout);font-weight:700;color:var(--color-label);margin-top:2px">' + p.pred.gl + ' — ' + p.pred.gv + '</div>' +
          '</div>' +
          (p.puntos !== null ? '<span class="badge badge--points">' + p.puntos + ' pts</span>' : '') +
        '</div>';
      });

      panelGrupoHtml += '</div></div>';

      // También mostrar agregados del grupo
      panelGrupoHtml += '<div class="card" style="padding:var(--space-4);margin-bottom:var(--space-4);">' +
        '<div style="font-size:var(--fs-subhead);font-weight:600;color:var(--color-label-secondary);margin-bottom:var(--space-3);text-transform:uppercase;letter-spacing:0.04em;">Distribución del grupo</div>' +
        '<div class="dist-bar">' +
          renderDistBar(banLocal + ' ' + nomLocal, statGrupo.ganador.local, "green") +
          renderDistBar("Empate", statGrupo.ganador.empate, "blue") +
          renderDistBar(banVis + ' ' + nomVis, statGrupo.ganador.visitante, "red") +
        '</div>' +
      '</div>';
    }

    var html = '<div style="max-width:680px;margin:0 auto;padding:var(--space-4);">' +
      cabeceraHtml + predHtml + panelGlobal + panelGrupoHtml +
    '</div>';

    setPage(html);
  }

  function renderDistBar(label, pct, color) {
    var fillClass = color ? "dist-bar__fill--" + color : "";
    var pctNum = parseFloat(pct) || 0;
    return '<div class="dist-bar__row">' +
      '<div class="dist-bar__label">' + esc(label) + '</div>' +
      '<div class="dist-bar__track">' +
        '<div class="dist-bar__fill ' + fillClass + '" style="width:' + Math.min(100, pctNum) + '%"></div>' +
      '</div>' +
      '<div class="dist-bar__pct">' + pctNum.toFixed(1) + '%</div>' +
    '</div>';
  }

  // Exponer copyToClipboard globalmente
  window.copyToClipboard = copyToClipboard;

  // ---------------------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------------------
  // El DOMContentLoaded ya llama render(), pero por si el script se carga tarde:
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(render, 10);
  }

})();
