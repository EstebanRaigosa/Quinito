/* =============================================================================
 * Polla — app.js (SPA router + todas las pantallas)
 * Material Design 3 · Vanilla JS · file:// compatible
 * ============================================================================= */
(function () {
  'use strict';

  var P = window.POLLA;
  var GRUPO = P.GRUPO_DEMO;
  var USUARIO = P.USUARIO;

  /* =========================================================================
   * ESTADO LOCAL
   * ======================================================================= */
  var APP_STATE = {
    wizardStep: 1,
    wizardData: {
      nombre: '',
      descripcion: '',
      premio1: 60,
      premio2: 30,
      premio3: 10,
      valor_apuesta: 50000,
      partidos_sel: {}
    },
    grupoTab: 'predicciones',
    buscarCodigo: '',
    buscarPreview: null
  };

  // Inicializar selección de partidos (todos seleccionados)
  P.PARTIDOS.forEach(function (m) { APP_STATE.wizardData.partidos_sel[m.n] = true; });

  // Predicciones persistidas en localStorage
  function loadPreds() {
    try { return JSON.parse(localStorage.getItem('polla_preds') || '{}'); }
    catch (e) { return {}; }
  }
  function savePreds(preds) {
    try { localStorage.setItem('polla_preds', JSON.stringify(preds)); } catch (e) {}
  }

  /* =========================================================================
   * TEMA
   * ======================================================================= */
  function initTheme() {
    var saved = localStorage.getItem('polla_theme') || 'light';
    setTheme(saved);
  }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('polla_theme', t);
    updateThemeIcons(t);
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'dark' ? 'light' : 'dark');
  }

  function updateThemeIcons(t) {
    var sun = '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41-.996.996 0 0 0-1.41 0zM7.05 18.36l-1.06 1.06a.996.996 0 0 0 0 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 0 0 0-1.41-.996.996 0 0 0-1.41 0z" fill="currentColor"/>';
    var moon = '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" fill="currentColor"/>';
    var svg = t === 'dark' ? sun : moon;
    var r = document.getElementById('themeIconRail');
    var b = document.getElementById('themeIconBar');
    if (r) r.innerHTML = svg;
    if (b) b.innerHTML = svg;
  }

  /* =========================================================================
   * SNACKBAR / TOAST
   * ======================================================================= */
  var snackTimer = null;
  function showToast(msg, duration) {
    duration = duration || 3000;
    var el = document.getElementById('snackbar');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (snackTimer) clearTimeout(snackTimer);
    snackTimer = setTimeout(function () {
      el.classList.remove('show');
    }, duration);
  }

  /* =========================================================================
   * NAV ACTIVE STATE
   * ======================================================================= */
  function updateNavActive(route) {
    var showNav = route !== '/login';
    var navBar = document.getElementById('navBar');
    var navRail = document.getElementById('navRail');
    if (navBar) navBar.style.display = showNav ? '' : 'none';
    if (navRail) navRail.style.display = showNav ? '' : 'none';

    var base = '/' + (route.split('/')[1] || '');
    document.querySelectorAll('[data-route]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-route') === base);
    });
  }

  /* =========================================================================
   * HELPERS RENDER
   * ======================================================================= */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function estadoBadge(estado) {
    var map = {
      programado: ['badge-proximo', 'Programado'],
      en_vivo:    ['badge-en-vivo', '● En Vivo'],
      finalizado: ['badge-finalizado', 'Finalizado']
    };
    var v = map[estado] || ['badge-proximo', estado];
    return '<span class="badge ' + v[0] + '">' + esc(v[1]) + '</span>';
  }

  function ptsClass(pts) {
    if (!pts && pts !== 0) return '';
    if (pts >= 5) return 'pts-badge-high';
    if (pts > 0)  return 'pts-badge-pos';
    return 'pts-badge-0';
  }

  function formatCOP(n) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  function faseNombre(id) {
    var f = P.FASES.find(function (x) { return x.id === id; });
    return f ? f.nombre : id;
  }

  function svgCheck() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>';
  }

  function svgBack() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>';
  }

  function svgCopy() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>';
  }

  function svgInfo() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>';
  }

  /* Barra de distribución reutilizable */
  function renderDistBar(label, pct, type) {
    var fillClass = type || '';
    return '<div class="dist-row">' +
      '<span class="dist-label">' + esc(label) + '</span>' +
      '<div class="dist-bar-track">' +
        '<div class="dist-bar-fill ' + fillClass + '" style="width:' + Math.round(pct) + '%" role="progressbar" aria-valuenow="' + Math.round(pct) + '" aria-valuemin="0" aria-valuemax="100"></div>' +
      '</div>' +
      '<span class="dist-pct">' + pct.toFixed(1) + '%</span>' +
    '</div>';
  }

  function renderWinnerBars(ganador, localName, visitName) {
    var bars = [
      { key: 'local', label: localName, pct: ganador.local, color: 'var(--md-primary)' },
      { key: 'empate', label: 'Empate', pct: ganador.empate, color: 'var(--md-secondary)' },
      { key: 'visitante', label: visitName, pct: ganador.visitante, color: 'var(--md-tertiary)' }
    ];
    return '<div class="winner-bars">' + bars.map(function (b) {
      return '<div class="winner-bar-col">' +
        '<span class="winner-bar-pct">' + b.pct.toFixed(1) + '%</span>' +
        '<div class="winner-bar-fill" style="background:' + b.color + ';height:' + Math.max(4, Math.round(b.pct * 0.7)) + 'px;"></div>' +
        '<span class="winner-bar-label" style="font-size:10px;color:var(--md-on-surface-variant);text-align:center;max-width:60px;overflow:hidden;text-overflow:ellipsis;">' + esc(b.label.length > 8 ? b.label.slice(0,8)+'…' : b.label) + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  /* =========================================================================
   * ROUTER
   * ======================================================================= */
  function getRoute() {
    var h = location.hash || '#/login';
    return h.replace('#', '') || '/login';
  }

  function navigate(path) {
    location.hash = '#' + path;
  }

  function render() {
    var route = getRoute();
    updateNavActive(route);

    // Scroll to top on route change
    window.scrollTo(0, 0);

    var view = document.getElementById('view');
    if (!view) return;

    if (route === '/login' || route === '/') {
      view.innerHTML = renderLogin();
      bindLogin();
    } else if (route === '/dashboard') {
      view.innerHTML = renderDashboard();
      bindDashboard();
    } else if (route === '/crear') {
      view.innerHTML = renderCrear();
      bindCrear();
    } else if (route === '/buscar') {
      view.innerHTML = renderBuscar();
      bindBuscar();
    } else if (route.startsWith('/grupo/') && route.includes('/prediccion/')) {
      var parts = route.split('/');
      var nPart = parseInt(parts[parts.length - 1], 10);
      var m = P.partidoPorN(nPart);
      if (!m) { view.innerHTML = renderNotFound(); return; }
      view.innerHTML = renderPrediccionDetalle(m);
      bindPrediccionDetalle(m);
    } else if (route.startsWith('/grupo/')) {
      view.innerHTML = renderGrupo();
      bindGrupo();
    } else {
      view.innerHTML = renderNotFound();
    }
  }

  /* =========================================================================
   * PANTALLA: LOGIN / REGISTRO
   * ======================================================================= */
  function renderLogin() {
    return '<div class="login-page">' +
      '<div class="login-header-logo">' +
        '<div class="brand-logo" style="justify-content:center;">' +
          '<div class="brand-icon">⚽</div>' +
          '<span class="brand-name">POLLA</span>' +
        '</div>' +
        '<p class="type-body-medium text-on-surface-var" style="text-align:center;margin-top:8px;">Quinielas del Mundial 2026</p>' +
      '</div>' +

      '<div class="login-card">' +
        '<!-- Tabs -->' +
        '<div class="segmented-btn" style="width:100%;margin-bottom:28px;" role="tablist">' +
          '<button class="segmented-btn-item active" id="tabLogin" role="tab" aria-selected="true" aria-controls="panelLogin">Iniciar sesión</button>' +
          '<button class="segmented-btn-item" id="tabRegister" role="tab" aria-selected="false" aria-controls="panelRegister">Crear cuenta</button>' +
        '</div>' +

        '<!-- Google button -->' +
        '<button class="btn-google" id="btnGoogle" aria-label="Continuar con Google">' +
          '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>' +
          'Continuar con Google' +
        '</button>' +

        '<div class="separator">o</div>' +

        '<!-- Panel login -->' +
        '<div id="panelLogin" role="tabpanel">' +
          '<div class="md-demo-hint" style="display:flex;gap:8px;align-items:flex-start;background:var(--md-secondary-container);color:var(--md-on-secondary-container);border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;line-height:1.5;">' +
            '<span aria-hidden="true">🔑</span><span><strong>Acceso demo</strong><br/>Usuario: <code>' + P.CREDENCIALES.usuario + '</code><br/>Clave: <code>' + P.CREDENCIALES.clave + '</code><br/><span style="opacity:.8;">(ya vienen precargados)</span></span>' +
          '</div>' +
          '<form id="formLogin" novalidate>' +
            '<div style="display:flex;flex-direction:column;gap:16px;">' +
              '<div class="text-field-outlined" style="position:relative;">' +
                '<input class="tf-input" type="email" id="loginEmail" value="' + P.CREDENCIALES.usuario + '" placeholder=" " autocomplete="email" required aria-label="Correo electrónico" style="font-size:16px;" />' +
                '<label for="loginEmail">Correo electrónico</label>' +
              '</div>' +
              '<div class="text-field-outlined" style="position:relative;">' +
                '<input class="tf-input" type="password" id="loginPass" value="' + P.CREDENCIALES.clave + '" placeholder=" " autocomplete="current-password" required aria-label="Contraseña" style="font-size:16px;" />' +
                '<label for="loginPass">Contraseña</label>' +
              '</div>' +
              '<div id="loginError" class="type-body-small text-error" style="display:none;padding:0 4px;"></div>' +
              '<button type="submit" class="btn btn-filled" style="width:100%;height:48px;" aria-label="Iniciar sesión">Iniciar sesión</button>' +
              '<button type="button" class="btn btn-text" style="font-size:14px;" id="btnForgot" aria-label="¿Olvidaste tu contraseña?">¿Olvidaste tu contraseña?</button>' +
            '</div>' +
          '</form>' +
        '</div>' +

        '<!-- Panel register -->' +
        '<div id="panelRegister" role="tabpanel" style="display:none;">' +
          '<form id="formRegister" novalidate>' +
            '<div style="display:flex;flex-direction:column;gap:16px;">' +
              '<div class="text-field-outlined" style="position:relative;">' +
                '<input class="tf-input" type="text" id="regNombre" placeholder=" " autocomplete="name" required aria-label="Nombre completo" style="font-size:16px;" />' +
                '<label for="regNombre">Nombre completo</label>' +
              '</div>' +
              '<div class="text-field-outlined" style="position:relative;">' +
                '<input class="tf-input" type="email" id="regEmail" placeholder=" " autocomplete="email" required aria-label="Correo electrónico" style="font-size:16px;" />' +
                '<label for="regEmail">Correo electrónico</label>' +
              '</div>' +
              '<div class="text-field-outlined" style="position:relative;">' +
                '<input class="tf-input" type="password" id="regPass" placeholder=" " autocomplete="new-password" required minlength="8" aria-label="Contraseña" style="font-size:16px;" />' +
                '<label for="regPass">Contraseña (mín. 8 caracteres)</label>' +
              '</div>' +
              '<div class="text-field-outlined" style="position:relative;">' +
                '<input class="tf-input" type="password" id="regPass2" placeholder=" " autocomplete="new-password" required aria-label="Confirmar contraseña" style="font-size:16px;" />' +
                '<label for="regPass2">Confirmar contraseña</label>' +
              '</div>' +
              '<label class="checkbox-wrap" style="align-items:flex-start;gap:12px;">' +
                '<input type="checkbox" id="regTerminos" aria-label="Aceptar términos y condiciones" />' +
                '<span class="type-body-small text-on-surface-var" style="padding-top:2px;">Acepto los <a href="#" style="color:var(--md-primary);">términos y condiciones</a></span>' +
              '</label>' +
              '<div id="regError" class="type-body-small text-error" style="display:none;padding:0 4px;"></div>' +
              '<button type="submit" class="btn btn-filled" style="width:100%;height:48px;" aria-label="Crear cuenta">Crear cuenta</button>' +
            '</div>' +
          '</form>' +
        '</div>' +

      '</div>' + // login-card
    '</div>';
  }

  function bindLogin() {
    var tabLogin    = document.getElementById('tabLogin');
    var tabReg      = document.getElementById('tabRegister');
    var panelLogin  = document.getElementById('panelLogin');
    var panelReg    = document.getElementById('panelRegister');

    tabLogin.addEventListener('click', function () {
      tabLogin.classList.add('active'); tabLogin.setAttribute('aria-selected', 'true');
      tabReg.classList.remove('active'); tabReg.setAttribute('aria-selected', 'false');
      panelLogin.style.display = ''; panelReg.style.display = 'none';
    });

    tabReg.addEventListener('click', function () {
      tabReg.classList.add('active'); tabReg.setAttribute('aria-selected', 'true');
      tabLogin.classList.remove('active'); tabLogin.setAttribute('aria-selected', 'false');
      panelReg.style.display = ''; panelLogin.style.display = 'none';
    });

    document.getElementById('btnGoogle').addEventListener('click', function () {
      showToast('Iniciando sesión con Google…');
      setTimeout(function () { navigate('/dashboard'); }, 900);
    });

    document.getElementById('btnForgot').addEventListener('click', function () {
      showToast('Se enviará un enlace a tu correo (demo).');
    });

    document.getElementById('formLogin').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('loginEmail').value.trim();
      var pass  = document.getElementById('loginPass').value;
      var errEl = document.getElementById('loginError');
      if (!email || !email.includes('@')) {
        errEl.textContent = 'Ingresa un correo válido.'; errEl.style.display = ''; return;
      }
      if (!pass) {
        errEl.textContent = 'Ingresa tu contraseña.'; errEl.style.display = ''; return;
      }
      if (email.toLowerCase() !== P.CREDENCIALES.usuario.toLowerCase() || pass !== P.CREDENCIALES.clave) {
        errEl.textContent = 'Credenciales incorrectas. Usa el acceso demo: ' + P.CREDENCIALES.usuario + ' / ' + P.CREDENCIALES.clave + '.';
        errEl.style.display = ''; return;
      }
      errEl.style.display = 'none';
      navigate('/dashboard');
    });

    document.getElementById('formRegister').addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = document.getElementById('regNombre').value.trim();
      var email  = document.getElementById('regEmail').value.trim();
      var pass   = document.getElementById('regPass').value;
      var pass2  = document.getElementById('regPass2').value;
      var terms  = document.getElementById('regTerminos').checked;
      var errEl  = document.getElementById('regError');

      if (!nombre) { errEl.textContent = 'Ingresa tu nombre.'; errEl.style.display = ''; return; }
      if (!email || !email.includes('@')) { errEl.textContent = 'Correo inválido.'; errEl.style.display = ''; return; }
      if (pass.length < 8) { errEl.textContent = 'La contraseña debe tener al menos 8 caracteres.'; errEl.style.display = ''; return; }
      if (pass !== pass2) { errEl.textContent = 'Las contraseñas no coinciden.'; errEl.style.display = ''; return; }
      if (!terms) { errEl.textContent = 'Debes aceptar los términos.'; errEl.style.display = ''; return; }
      errEl.style.display = 'none';
      navigate('/dashboard');
    });
  }

  /* =========================================================================
   * PANTALLA: DASHBOARD
   * ======================================================================= */
  function renderDashboard() {
    var grupoCards = P.MIS_GRUPOS.map(function (g) {
      var estadoClass = { Activo:'badge-activo', Próximo:'badge-proximo', Finalizado:'badge-finalizado' }[g.estado] || 'badge-secondary';
      var posStr = g.posicion === 1 ? '🥇 Vas 1º' : g.posicion === 2 ? '🥈 Vas ' + g.posicion + 'º' : '🥉 Vas ' + g.posicion + 'º';
      return '<div class="card card-elevated card-clickable" style="border-radius:var(--shape-lg);margin-bottom:12px;" onclick="navigate(\'/grupo/\'+\'' + g.id + '\')" tabindex="0" role="button" aria-label="Ver grupo ' + esc(g.nombre) + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){navigate(\'/grupo/\'+\'' + g.id + '\')}">' +
        '<div class="group-card-inner">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;">' +
            '<div style="flex:1;min-width:0;">' +
              '<p class="type-title-medium truncate" style="color:var(--md-on-surface);">' + esc(g.nombre) + '</p>' +
              '<p class="type-body-small text-on-surface-var" style="margin-top:2px;">⚽ ' + esc(g.torneo) + '</p>' +
            '</div>' +
            '<span class="badge ' + estadoClass + '">' + esc(g.estado) + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
              '<span class="type-body-small text-on-surface-var">👥 ' + g.participantes + ' participantes</span>' +
              '<span class="position-chip">' + posStr + '</span>' +
            '</div>' +
            '<button class="btn btn-tonal" style="height:36px;font-size:13px;" onclick="event.stopPropagation();navigate(\'/grupo/\'+\'' + g.id + '\')">Ver grupo</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="app-scroll" style="height:100%;overflow-y:auto;">' +
      '<div class="top-app-bar" id="dashAppBar">' +
        '<div class="top-app-bar-title">' +
          '<div class="brand-logo">' +
            '<div class="brand-icon" style="width:32px;height:32px;font-size:16px;">⚽</div>' +
            '<span class="brand-name" style="font-size:18px;">POLLA</span>' +
          '</div>' +
        '</div>' +
        '<div class="top-app-bar-trailing">' +
          '<div class="avatar" style="background-color:' + esc(USUARIO.inicialesColor) + ';width:36px;height:36px;font-size:13px;" title="' + esc(USUARIO.nombre) + '">' + esc(USUARIO.avatar) + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="page-content">' +
        '<div style="padding:24px 16px 8px;">' +
          '<p class="type-headline-small" style="color:var(--md-on-surface);">Hola, ' + esc(USUARIO.nombre.split(' ')[0]) + ' 👋</p>' +
          '<p class="type-body-medium text-on-surface-var">Aquí están tus pollas del Mundial 2026</p>' +
        '</div>' +

        '<!-- Acciones principales -->' +
        '<div style="display:flex;gap:12px;padding:12px 16px;">' +
          '<button class="btn btn-filled" style="flex:1;height:48px;gap:8px;" onclick="navigate(\'/crear\')" aria-label="Crear grupo">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>' +
            'Crear Grupo' +
          '</button>' +
          '<button class="btn btn-outlined" style="flex:1;height:48px;gap:8px;" onclick="navigate(\'/buscar\')" aria-label="Buscar grupo">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>' +
            'Buscar Grupo' +
          '</button>' +
        '</div>' +

        '<!-- Mis Grupos -->' +
        '<div class="section-heading">Mis Grupos</div>' +
        '<div style="padding:0 16px;">' +
          (grupoCards || '<div class="empty-state"><div class="empty-state-icon">🏟️</div><p class="type-body-large">No tienes grupos aún</p><button class="btn btn-filled" onclick="navigate(\'/crear\')">Crear mi primer grupo</button></div>') +
        '</div>' +

        '<!-- Próximo partido -->' +
        (function () {
          var prox = P.proximoPartido();
          if (!prox) return '';
          return '<div class="section-heading">Próximo Partido</div>' +
            '<div style="padding:0 16px;">' +
              '<div class="card card-elevated" style="border-radius:var(--shape-lg);overflow:hidden;">' +
                '<div class="match-header">' +
                  '<span>' + esc(faseNombre(prox.fase)) + (prox.grupo ? ' · Grupo ' + prox.grupo : '') + '</span>' +
                  '<span>' + esc(P.fechaCorta(prox)) + ' ' + esc(P.horaCorta(prox)) + '</span>' +
                '</div>' +
                '<div class="match-body">' +
                  '<div class="match-team">' +
                    '<span class="match-team-flag">' + esc(P.banderaEquipo(prox.local)) + '</span>' +
                    '<span class="match-team-name">' + esc(P.nombreCortoEquipo(prox.local)) + '</span>' +
                  '</div>' +
                  '<div class="match-center"><span class="match-vs">VS</span><span class="type-body-small text-on-surface-var">' + esc(P.horaCorta(prox)) + '</span></div>' +
                  '<div class="match-team">' +
                    '<span class="match-team-flag">' + esc(P.banderaEquipo(prox.visitante)) + '</span>' +
                    '<span class="match-team-name">' + esc(P.nombreCortoEquipo(prox.visitante)) + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
        })() +

      '</div>' + // page-content
    '</div>';
  }

  function bindDashboard() {
    var bar = document.getElementById('dashAppBar');
    var scrollEl = document.querySelector('.app-scroll');
    if (bar && scrollEl) {
      scrollEl.addEventListener('scroll', function () {
        bar.classList.toggle('scrolled', scrollEl.scrollTop > 10);
      });
    }
  }

  /* =========================================================================
   * PANTALLA: CREAR GRUPO (Wizard 3 fases)
   * ======================================================================= */
  function renderCrear() {
    return '<div style="display:flex;flex-direction:column;height:100%;min-height:100dvh;">' +
      '<div class="top-app-bar">' +
        '<div class="top-app-bar-leading">' +
          '<button class="icon-btn" onclick="navigate(\'/dashboard\')" aria-label="Volver">' + svgBack() + '</button>' +
        '</div>' +
        '<div class="top-app-bar-title">Crear Grupo</div>' +
      '</div>' +

      '<!-- Stepper -->' +
      '<div class="stepper" id="wizardStepper">' +
        renderStepperItem(1) + renderStepperItem(2) + renderStepperItem(3) +
      '</div>' +

      '<!-- Fases -->' +
      '<div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;" id="wizardScroll">' +
        renderWizardPhase1() +
        renderWizardPhase2() +
        renderWizardPhase3() +
      '</div>' +

      '<!-- Acciones -->' +
      '<div class="wizard-actions" id="wizardActions">' +
        '<button class="btn btn-outlined" id="btnWizardBack" style="flex:0 0 auto;" aria-label="Atrás">Atrás</button>' +
        '<button class="btn btn-filled" id="btnWizardNext" style="flex:1;" aria-label="Siguiente">Siguiente</button>' +
      '</div>' +
    '</div>';
  }

  function renderStepperItem(n) {
    var step = APP_STATE.wizardStep;
    var cls = n < step ? 'completed' : n === step ? 'active' : 'pending';
    var labelCls = n === step ? 'step-label active-label' : 'step-label';
    var labels = ['', 'Datos', 'Reglas', 'Partidos'];
    var icon = n < step ? svgCheck() : n;
    return '<div class="stepper-step">' +
      '<div class="step-indicator ' + cls + '" aria-label="Paso ' + n + '">' + icon + '</div>' +
      '<span class="' + labelCls + '">' + labels[n] + '</span>' +
    '</div>';
  }

  function renderWizardPhase1() {
    var d = APP_STATE.wizardData;
    var active = APP_STATE.wizardStep === 1;
    return '<div class="wizard-phase' + (active ? ' active' : '') + '" id="wizardPhase1" style="padding:24px 16px;gap:16px;">' +
      '<div class="type-title-medium" style="color:var(--md-on-surface);margin-bottom:4px;">Datos del grupo</div>' +
      '<div style="background:var(--md-primary-container);border-radius:var(--shape-sm);padding:10px 14px;display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:18px;">⚽</span>' +
        '<div><p class="type-label-medium" style="color:var(--md-on-primary-container);">Torneo</p><p class="type-body-medium" style="color:var(--md-on-primary-container);font-weight:600;">Mundial 2026</p></div>' +
      '</div>' +
      '<div class="text-field-outlined" style="position:relative;">' +
        '<input class="tf-input" type="text" id="wizNombre" placeholder=" " value="' + esc(d.nombre) + '" maxlength="50" aria-label="Nombre del grupo" required style="font-size:16px;" />' +
        '<label for="wizNombre">Nombre del grupo *</label>' +
        '<div id="wizNombreErr" class="tf-supporting" style="color:var(--md-error);display:none;"></div>' +
      '</div>' +
      '<div style="position:relative;">' +
        '<label for="wizDesc" style="font-size:13px;color:var(--md-on-surface-variant);display:block;margin-bottom:6px;">Descripción (opcional)</label>' +
        '<textarea id="wizDesc" placeholder="Cuéntale algo a los participantes…" maxlength="280" aria-label="Descripción del grupo" style="width:100%;min-height:80px;border:1px solid var(--md-outline);border-radius:var(--shape-xs);background:transparent;font-family:var(--font-family);font-size:16px;color:var(--md-on-surface);padding:14px;outline:none;resize:vertical;box-sizing:border-box;">' + esc(d.descripcion) + '</textarea>' +
        '<div id="wizDescCount" style="text-align:right;font-size:12px;color:var(--md-on-surface-variant);margin-top:4px;">' + d.descripcion.length + '/280</div>' +
      '</div>' +
    '</div>';
  }

  function renderWizardPhase2() {
    var d = APP_STATE.wizardData;
    var active = APP_STATE.wizardStep === 2;

    var tooltips = {
      pts_marcador_exacto: 'Puntos al acertar el marcador exacto (ej. 2-1).',
      pts_ganador: 'Puntos al acertar solo el ganador (local/empate/visitante).',
      pts_gol_acertado: 'Punto extra por cada gol acertado individualmente.',
      pts_prediccion_unica: 'Bonus si eres el único en acertar el marcador exacto.',
      bono_dieciseisavos: 'Bonus extra al acertar marcador en Dieciseisavos.',
      bono_octavos: 'Bonus extra al acertar marcador en Octavos de Final.',
      bono_cuartos: 'Bonus extra al acertar marcador en Cuartos de Final.',
      bono_semifinales: 'Bonus extra al acertar en Semifinales.',
      bono_final: 'Bonus extra al acertar en la Gran Final.',
      valor_apuesta: 'Cuota de inscripción por participante (COP).',
      premio_primer_lugar: '% del pozo para el 1er lugar.',
      premio_segundo_lugar: '% del pozo para el 2do lugar.',
      premio_tercer_lugar: '% del pozo para el 3er lugar.'
    };

    function fld(key, label, val) {
      return '<div class="regla-field">' +
        '<label for="wiz_' + key + '">' + esc(label) +
          '<span class="tooltip-wrap" style="display:inline;">' +
            '<button type="button" class="tooltip-icon" tabindex="0" aria-label="Ayuda: ' + esc(label) + '">?</button>' +
            '<span class="tooltip" role="tooltip">' + esc(tooltips[key] || '') + '</span>' +
          '</span>' +
        '</label>' +
        '<input type="number" id="wiz_' + key + '" value="' + esc(val) + '" min="0" max="9999" aria-label="' + esc(label) + '" data-key="' + esc(key) + '" class="regla-input" />' +
      '</div>';
    }

    var suma = (d.premio1 || 0) + (d.premio2 || 0) + (d.premio3 || 0);
    var sumaOk = suma === 100;

    return '<div class="wizard-phase' + (active ? ' active' : '') + '" id="wizardPhase2" style="padding:16px;gap:12px;">' +
      '<div class="type-title-medium" style="color:var(--md-on-surface);margin-bottom:4px;">Reglas de puntuación</div>' +

      '<!-- Puntos base -->' +
      '<div class="card card-outlined" style="padding:16px;">' +
        '<p class="rules-section-title" style="margin:-16px -16px 12px;padding:10px 16px;background:var(--md-surface-container);">Puntos base</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
          fld('pts_marcador_exacto', 'Marcador exacto', P.REGLAS.pts_marcador_exacto) +
          fld('pts_ganador', 'Ganador', P.REGLAS.pts_ganador) +
          fld('pts_gol_acertado', 'Gol acertado', P.REGLAS.pts_gol_acertado) +
          fld('pts_prediccion_unica', 'Predicción única', P.REGLAS.pts_prediccion_unica) +
        '</div>' +
      '</div>' +

      '<!-- Bonos eliminatorias -->' +
      '<div class="card card-outlined" style="padding:16px;">' +
        '<p class="rules-section-title" style="margin:-16px -16px 12px;padding:10px 16px;background:var(--md-surface-container);">Bonos eliminatorias</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
          fld('bono_dieciseisavos', '16avos', P.REGLAS.bono_dieciseisavos) +
          fld('bono_octavos', 'Octavos', P.REGLAS.bono_octavos) +
          fld('bono_cuartos', 'Cuartos', P.REGLAS.bono_cuartos) +
          fld('bono_semifinales', 'Semis', P.REGLAS.bono_semifinales) +
          fld('bono_final', 'Final', P.REGLAS.bono_final) +
        '</div>' +
      '</div>' +

      '<!-- Apuesta y premios -->' +
      '<div class="card card-outlined" style="padding:16px;">' +
        '<p class="rules-section-title" style="margin:-16px -16px 12px;padding:10px 16px;background:var(--md-surface-container);">Apuesta y premios</p>' +
        '<div style="margin-bottom:12px;">' + fld('valor_apuesta', 'Valor apuesta (COP)', d.valor_apuesta) + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
          fld('premio_primer_lugar', '🥇 1er lugar %', d.premio1) +
          fld('premio_segundo_lugar', '🥈 2do lugar %', d.premio2) +
          fld('premio_tercer_lugar', '🥉 3er lugar %', d.premio3) +
        '</div>' +
        '<div class="prizes-sum ' + (sumaOk ? 'ok' : 'error') + '" id="prizesSumBox">' +
          '<span>Total premios</span>' +
          '<span id="prizesSum"><strong>' + suma + '%</strong>' + (sumaOk ? ' ✓' : ' — debe ser 100%') + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderWizardPhase3() {
    var active = APP_STATE.wizardStep === 3;
    var sel = APP_STATE.wizardData.partidos_sel;

    var fasesHtml = P.FASES.map(function (fase) {
      var partidos = P.partidosPorFase(fase.id);
      if (!partidos.length) return '';

      var allSel = partidos.every(function (m) { return sel[m.n]; });
      var noneSel = partidos.every(function (m) { return !sel[m.n]; });
      var indet = !allSel && !noneSel;

      var partidosHtml = partidos.map(function (m) {
        var isChecked = !!sel[m.n];
        var localLabel = P.etiquetaEquipo(m.local);
        var visitLabel = P.etiquetaEquipo(m.visitante);
        var flag1 = P.banderaEquipo(m.local);
        var flag2 = P.banderaEquipo(m.visitante);
        return '<div class="partido-check-row">' +
          '<input type="checkbox" id="pm_' + m.n + '" ' + (isChecked ? 'checked' : '') + ' data-n="' + m.n + '" class="partido-cb" aria-label="' + esc(localLabel) + ' vs ' + esc(visitLabel) + '" style="width:18px;height:18px;accent-color:var(--md-primary);flex-shrink:0;" />' +
          '<div class="partido-check-teams">' +
            '<span style="font-size:16px;">' + esc(flag1) + '</span>' +
            '<span class="type-body-small" style="max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(localLabel) + '">' + esc(localLabel.length > 10 ? localLabel.slice(0,10)+'…' : localLabel) + '</span>' +
            '<span class="type-body-small text-on-surface-var">vs</span>' +
            '<span class="type-body-small" style="max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(visitLabel) + '">' + esc(visitLabel.length > 10 ? visitLabel.slice(0,10)+'…' : visitLabel) + '</span>' +
            '<span style="font-size:16px;">' + esc(flag2) + '</span>' +
          '</div>' +
          '<span class="partido-check-date">' + esc(P.fechaCorta(m)) + '</span>' +
        '</div>';
      }).join('');

      var selCount = partidos.filter(function (m) { return sel[m.n]; }).length;

      return '<div class="fase-group">' +
        '<div class="fase-group-header" onclick="toggleFaseGroup(this)" role="button" tabindex="0" aria-expanded="true" onkeydown="if(event.key===\'Enter\'){toggleFaseGroup(this)}">' +
          '<input type="checkbox" data-fase="' + esc(fase.id) + '" class="fase-cb" aria-label="Seleccionar toda la fase ' + esc(fase.nombre) + '" style="width:18px;height:18px;accent-color:var(--md-primary);" />' +
          '<span class="type-title-small" style="flex:1;">' + esc(fase.nombre) + '</span>' +
          '<span class="type-body-small text-on-surface-var">' + selCount + '/' + partidos.length + '</span>' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="fase-chevron" style="flex-shrink:0;transition:transform 200ms;"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>' +
        '</div>' +
        '<div class="fase-group-body">' + partidosHtml + '</div>' +
      '</div>';
    }).join('');

    return '<div class="wizard-phase' + (active ? ' active' : '') + '" id="wizardPhase3" style="padding:16px;">' +
      '<div class="type-title-medium" style="color:var(--md-on-surface);margin-bottom:4px;">Seleccionar Partidos</div>' +
      '<p class="type-body-small text-on-surface-var" style="margin-bottom:16px;">Todos los partidos están seleccionados por defecto. Puedes desmarcar fases o partidos individuales.</p>' +
      fasesHtml +
    '</div>';
  }

  window.toggleFaseGroup = function (headerEl) {
    var body = headerEl.nextElementSibling;
    var chevron = headerEl.querySelector('.fase-chevron');
    var isOpen = headerEl.getAttribute('aria-expanded') === 'true';
    headerEl.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.style.display = isOpen ? 'none' : '';
    if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : '';
  };

  function bindCrear() {
    updateWizardUI();

    var btnNext = document.getElementById('btnWizardNext');
    var btnBack = document.getElementById('btnWizardBack');

    btnNext.addEventListener('click', function () {
      var step = APP_STATE.wizardStep;
      if (step === 1) {
        var nombre = document.getElementById('wizNombre').value.trim();
        var errEl = document.getElementById('wizNombreErr');
        if (nombre.length < 3) {
          errEl.textContent = 'El nombre debe tener al menos 3 caracteres.';
          errEl.style.display = '';
          return;
        }
        APP_STATE.wizardData.nombre = nombre;
        APP_STATE.wizardData.descripcion = document.getElementById('wizDesc').value;
        errEl.style.display = 'none';
        APP_STATE.wizardStep = 2;
        reRenderWizard();
      } else if (step === 2) {
        var suma = (APP_STATE.wizardData.premio1 || 0) + (APP_STATE.wizardData.premio2 || 0) + (APP_STATE.wizardData.premio3 || 0);
        if (suma !== 100) {
          showToast('Los premios deben sumar 100%. Suma actual: ' + suma + '%');
          return;
        }
        APP_STATE.wizardStep = 3;
        reRenderWizard();
      } else if (step === 3) {
        var numSel = Object.values(APP_STATE.wizardData.partidos_sel).filter(Boolean).length;
        if (numSel === 0) {
          showToast('Selecciona al menos un partido.');
          return;
        }
        // Crear grupo
        showToast('¡Grupo "' + APP_STATE.wizardData.nombre + '" creado! Código: PLLA26');
        APP_STATE.wizardStep = 1;
        APP_STATE.wizardData = { nombre:'', descripcion:'', premio1:60, premio2:30, premio3:10, valor_apuesta:50000, partidos_sel:{} };
        P.PARTIDOS.forEach(function(m){ APP_STATE.wizardData.partidos_sel[m.n]=true; });
        setTimeout(function () { navigate('/grupo/g-oficina'); }, 500);
      }
    });

    btnBack.addEventListener('click', function () {
      if (APP_STATE.wizardStep === 1) {
        navigate('/dashboard');
      } else {
        APP_STATE.wizardStep--;
        reRenderWizard();
      }
    });

    bindWizardPhase1Live();
  }

  function reRenderWizard() {
    var view = document.getElementById('view');
    if (!view) return;
    view.innerHTML = renderCrear();
    bindCrear();
    var scroll = document.getElementById('wizardScroll');
    if (scroll) scroll.scrollTop = 0;
  }

  function updateWizardUI() {
    var step = APP_STATE.wizardStep;
    document.querySelectorAll('.wizard-phase').forEach(function (el, i) {
      el.classList.toggle('active', i + 1 === step);
    });
    var btnNext = document.getElementById('btnWizardNext');
    if (btnNext) {
      btnNext.textContent = step === 3 ? 'Crear Grupo' : 'Siguiente';
    }
    var btnBack = document.getElementById('btnWizardBack');
    if (btnBack) {
      btnBack.textContent = step === 1 ? 'Cancelar' : 'Atrás';
    }
    // Update stepper
    var stepper = document.getElementById('wizardStepper');
    if (stepper) {
      stepper.innerHTML = renderStepperItem(1) + renderStepperItem(2) + renderStepperItem(3);
    }
    // Fase checkboxes indeterminate
    if (step === 3) {
      bindWizardPhase3Live();
    }
    if (step === 2) {
      bindWizardPhase2Live();
    }
  }

  function bindWizardPhase1Live() {
    var nombreInput = document.getElementById('wizNombre');
    var descInput   = document.getElementById('wizDesc');
    var descCount   = document.getElementById('wizDescCount');
    if (nombreInput) {
      nombreInput.addEventListener('input', function () {
        APP_STATE.wizardData.nombre = this.value;
        var err = document.getElementById('wizNombreErr');
        if (this.value.trim().length >= 3 && err) err.style.display = 'none';
      });
    }
    if (descInput && descCount) {
      descInput.addEventListener('input', function () {
        APP_STATE.wizardData.descripcion = this.value;
        descCount.textContent = this.value.length + '/280';
      });
    }
  }

  function bindWizardPhase2Live() {
    document.querySelectorAll('.regla-input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var key = this.getAttribute('data-key');
        var val = parseInt(this.value, 10) || 0;
        if (key === 'premio_primer_lugar') APP_STATE.wizardData.premio1 = val;
        else if (key === 'premio_segundo_lugar') APP_STATE.wizardData.premio2 = val;
        else if (key === 'premio_tercer_lugar') APP_STATE.wizardData.premio3 = val;
        else if (key === 'valor_apuesta') APP_STATE.wizardData.valor_apuesta = val;
        else APP_STATE.wizardData[key] = val;
        // Update prizes sum display
        var suma = (APP_STATE.wizardData.premio1||0) + (APP_STATE.wizardData.premio2||0) + (APP_STATE.wizardData.premio3||0);
        var sumaOk = suma === 100;
        var box = document.getElementById('prizesSumBox');
        var sumEl = document.getElementById('prizesSum');
        if (box) { box.className = 'prizes-sum ' + (sumaOk ? 'ok' : 'error'); }
        if (sumEl) sumEl.innerHTML = '<strong>' + suma + '%</strong>' + (sumaOk ? ' ✓' : ' — debe ser 100%');
      });
    });
  }

  function bindWizardPhase3Live() {
    // Setup fase checkboxes indeterminate
    P.FASES.forEach(function (fase) {
      var partidos = P.partidosPorFase(fase.id);
      var faseCb = document.querySelector('[data-fase="' + fase.id + '"]');
      if (!faseCb) return;

      function updateFaseCb() {
        var all = partidos.every(function(m){ return APP_STATE.wizardData.partidos_sel[m.n]; });
        var none = partidos.every(function(m){ return !APP_STATE.wizardData.partidos_sel[m.n]; });
        faseCb.checked = all;
        faseCb.indeterminate = !all && !none;
        // Update count display
        var selCount = partidos.filter(function(m){ return APP_STATE.wizardData.partidos_sel[m.n]; }).length;
        var countEl = faseCb.closest('.fase-group-header').querySelector('.type-body-small');
        if (countEl) countEl.textContent = selCount + '/' + partidos.length;
      }

      updateFaseCb();

      faseCb.addEventListener('change', function () {
        var checked = this.checked;
        partidos.forEach(function(m){
          APP_STATE.wizardData.partidos_sel[m.n] = checked;
          var cb = document.getElementById('pm_' + m.n);
          if (cb) cb.checked = checked;
        });
        updateFaseCb();
      });

      partidos.forEach(function(m){
        var cb = document.getElementById('pm_' + m.n);
        if (!cb) return;
        cb.addEventListener('change', function(){
          APP_STATE.wizardData.partidos_sel[m.n] = this.checked;
          updateFaseCb();
        });
      });
    });
  }

  /* =========================================================================
   * PANTALLA: BUSCAR / UNIRSE
   * ======================================================================= */
  function renderBuscar() {
    var preview = APP_STATE.buscarPreview;
    var previewHtml = '';

    if (preview) {
      var pozo = GRUPO.reglas.valor_apuesta * GRUPO.participantes.filter(function(p){return p.pago;}).length;
      previewHtml = '<div class="preview-card" id="buscarPreview" style="animation:fadeIn 200ms ease;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
          '<div style="width:48px;height:48px;border-radius:var(--shape-md);background:linear-gradient(135deg,var(--md-primary-container),var(--md-secondary-container));display:flex;align-items:center;justify-content:center;font-size:24px;">⚽</div>' +
          '<div>' +
            '<p class="type-title-large" style="color:var(--md-on-surface);">' + esc(GRUPO.nombre) + '</p>' +
            '<p class="type-body-small text-on-surface-var">⚽ ' + esc(GRUPO.torneo) + '</p>' +
          '</div>' +
        '</div>' +
        '<p class="type-body-medium" style="color:var(--md-on-surface-variant);margin-bottom:16px;">' + esc(GRUPO.descripcion) + '</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">' +
          '<div class="card card-filled" style="padding:12px;text-align:center;">' +
            '<p class="type-headline-small" style="color:var(--md-primary);">' + GRUPO.participantes.length + '</p>' +
            '<p class="type-body-small text-on-surface-var">Participantes</p>' +
          '</div>' +
          '<div class="card card-filled" style="padding:12px;text-align:center;">' +
            '<p class="type-headline-small" style="color:var(--md-primary);">' + esc(formatCOP(GRUPO.reglas.valor_apuesta)) + '</p>' +
            '<p class="type-body-small text-on-surface-var">Valor apuesta</p>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-filled" style="width:100%;height:48px;" id="btnUnirme" aria-label="Unirme al grupo">Unirme al grupo</button>' +
      '</div>';
    }

    return '<div class="app-scroll" style="height:100%;overflow-y:auto;">' +
      '<div class="top-app-bar">' +
        '<div class="top-app-bar-leading">' +
          '<button class="icon-btn" onclick="navigate(\'/dashboard\')" aria-label="Volver">' + svgBack() + '</button>' +
        '</div>' +
        '<div class="top-app-bar-title">Buscar Grupo</div>' +
      '</div>' +

      '<div class="page-content" style="padding:24px 16px;">' +
        '<p class="type-body-medium text-on-surface-var" style="margin-bottom:20px;">Ingresa el código de invitación para unirte a una polla.</p>' +

        '<div style="display:flex;gap:12px;margin-bottom:8px;">' +
          '<div class="search-input-wrap" style="flex:1;">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;color:var(--md-on-surface-variant);"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>' +
            '<input type="text" id="codigoInput" placeholder="PLLA26" maxlength="10" aria-label="Código del grupo" autocomplete="off" autocapitalize="characters" style="font-size:18px;letter-spacing:4px;text-transform:uppercase;" value="' + esc(APP_STATE.buscarCodigo) + '" />' +
          '</div>' +
          '<button class="btn btn-filled" style="height:56px;padding:0 20px;" id="btnBuscar" aria-label="Buscar grupo">Buscar</button>' +
        '</div>' +

        '<div id="buscarError" class="type-body-small text-error" style="padding:0 4px;min-height:20px;"></div>' +

        '<div id="buscarResult" style="margin-top:16px;">' + previewHtml + '</div>' +
      '</div>' +
    '</div>';
  }

  function bindBuscar() {
    var input = document.getElementById('codigoInput');
    var btnBuscar = document.getElementById('btnBuscar');
    var errorEl = document.getElementById('buscarError');

    function doBuscar() {
      var codigo = input.value.trim().toUpperCase();
      APP_STATE.buscarCodigo = codigo;
      if (!codigo) {
        errorEl.textContent = 'Ingresa un código de grupo.';
        APP_STATE.buscarPreview = null;
        document.getElementById('buscarResult').innerHTML = '';
        return;
      }
      errorEl.textContent = '';
      APP_STATE.buscarPreview = true;
      var result = document.getElementById('buscarResult');
      var pozo = GRUPO.reglas.valor_apuesta * GRUPO.participantes.filter(function(p){return p.pago;}).length;
      result.innerHTML = '<div class="preview-card" style="animation:fadeIn 200ms ease;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
          '<div style="width:48px;height:48px;border-radius:var(--shape-md);background:linear-gradient(135deg,var(--md-primary-container),var(--md-secondary-container));display:flex;align-items:center;justify-content:center;font-size:24px;">⚽</div>' +
          '<div>' +
            '<p class="type-title-large">' + esc(GRUPO.nombre) + '</p>' +
            '<p class="type-body-small text-on-surface-var">⚽ ' + esc(GRUPO.torneo) + '</p>' +
          '</div>' +
        '</div>' +
        '<p class="type-body-medium text-on-surface-var" style="margin-bottom:16px;">' + esc(GRUPO.descripcion) + '</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">' +
          '<div class="card card-filled" style="padding:12px;text-align:center;">' +
            '<p class="type-headline-small" style="color:var(--md-primary);">' + GRUPO.participantes.length + '</p>' +
            '<p class="type-body-small text-on-surface-var">Participantes</p>' +
          '</div>' +
          '<div class="card card-filled" style="padding:12px;text-align:center;">' +
            '<p class="type-headline-small" style="color:var(--md-primary);">' + esc(formatCOP(GRUPO.reglas.valor_apuesta)) + '</p>' +
            '<p class="type-body-small text-on-surface-var">Valor apuesta</p>' +
          '</div>' +
        '</div>' +
        '<div style="padding:12px;border-radius:var(--shape-sm);background:var(--md-surface-container);margin-bottom:16px;">' +
          '<p class="type-label-small text-on-surface-var">Pozo estimado</p>' +
          '<p class="type-title-large" style="color:var(--md-tertiary);">' + esc(formatCOP(pozo)) + '</p>' +
        '</div>' +
        '<button class="btn btn-filled" style="width:100%;height:48px;" id="btnUnirme" aria-label="Unirme al grupo">Unirme al grupo</button>' +
      '</div>';

      document.getElementById('btnUnirme').addEventListener('click', function () {
        showToast('Te uniste a ' + GRUPO.nombre + '!');
        setTimeout(function () { navigate('/grupo/g-oficina'); }, 500);
      });
    }

    btnBuscar.addEventListener('click', doBuscar);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doBuscar(); });
    if (APP_STATE.buscarPreview) {
      var btnU = document.getElementById('btnUnirme');
      if (btnU) {
        btnU.addEventListener('click', function () {
          showToast('Te uniste a ' + GRUPO.nombre + '!');
          setTimeout(function () { navigate('/grupo/g-oficina'); }, 500);
        });
      }
    }
  }

  /* =========================================================================
   * PANTALLA: VISTA DE GRUPO
   * ======================================================================= */
  var TABS_GRUPO = [
    { id:'predicciones', label:'Predicciones' },
    { id:'tabla',        label:'Posiciones' },
    { id:'partidos',     label:'Partidos' },
    { id:'reglas',       label:'Reglas' },
    { id:'participantes',label:'Participantes' },
    { id:'config',       label:'Configuración' }
  ];

  function renderGrupo() {
    var tabsHtml = TABS_GRUPO.map(function (t) {
      return '<button class="tab' + (APP_STATE.grupoTab === t.id ? ' active' : '') + '" data-tab="' + t.id + '" role="tab" aria-selected="' + (APP_STATE.grupoTab === t.id ? 'true' : 'false') + '">' + esc(t.label) + '</button>';
    }).join('');

    return '<div style="display:flex;flex-direction:column;height:100%;min-height:100dvh;">' +
      '<div class="top-app-bar">' +
        '<div class="top-app-bar-leading">' +
          '<button class="icon-btn" onclick="navigate(\'/dashboard\')" aria-label="Volver">' + svgBack() + '</button>' +
        '</div>' +
        '<div class="top-app-bar-title" style="font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(GRUPO.nombre) + '</div>' +
        '<div class="top-app-bar-trailing">' +
          '<button class="icon-btn" id="btnCopyHeader" aria-label="Copiar código de invitación" title="Copiar código">' + svgCopy() + '</button>' +
        '</div>' +
      '</div>' +

      '<!-- Group header banner -->' +
      '<div class="group-info-banner">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
          '<div>' +
            '<p class="type-body-small text-on-surface-var">⚽ ' + esc(GRUPO.torneo) + ' · 👥 ' + GRUPO.participantes.length + ' participantes</p>' +
          '</div>' +
          '<div class="invite-code-box" style="padding:6px 12px;">' +
            '<span class="invite-code-text" style="font-size:16px;letter-spacing:4px;">' + esc(GRUPO.codigo) + '</span>' +
            '<button class="icon-btn" style="width:36px;height:36px;" id="btnCopyCode" aria-label="Copiar código">' + svgCopy() + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- Tabs -->' +
      '<div class="tabs" role="tablist" id="grupoTabs">' + tabsHtml + '</div>' +

      '<!-- Tab content -->' +
      '<div class="app-scroll" style="flex:1;overflow-y:auto;" id="grupoScroll">' +
        '<div class="page-content" style="padding-left:0;padding-right:0;max-width:none;">' +
          '<div id="tabContent"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function bindGrupo() {
    // Copy code buttons
    [document.getElementById('btnCopyCode'), document.getElementById('btnCopyHeader')].forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(GRUPO.codigo).then(function () {
            showToast('Código copiado: ' + GRUPO.codigo);
          }).catch(function() {
            fallbackCopy(GRUPO.codigo);
          });
        } else {
          fallbackCopy(GRUPO.codigo);
        }
      });
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var tabId = this.getAttribute('data-tab');
        APP_STATE.grupoTab = tabId;
        document.querySelectorAll('.tab').forEach(function(t){
          t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
          t.setAttribute('aria-selected', t.getAttribute('data-tab') === tabId ? 'true' : 'false');
        });
        var scroll = document.getElementById('grupoScroll');
        if (scroll) scroll.scrollTop = 0;
        renderTabContent();
        // Scroll active tab into view
        this.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
      });
    });

    renderTabContent();
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); showToast('Código copiado: ' + text); } catch(e) {}
    document.body.removeChild(ta);
  }

  function renderTabContent() {
    var el = document.getElementById('tabContent');
    if (!el) return;
    var tab = APP_STATE.grupoTab;
    if (tab === 'predicciones')   el.innerHTML = renderTabPredicciones();
    else if (tab === 'tabla')     el.innerHTML = renderTabTabla();
    else if (tab === 'partidos')  el.innerHTML = renderTabPartidos();
    else if (tab === 'reglas')    el.innerHTML = renderTabReglas();
    else if (tab === 'participantes') el.innerHTML = renderTabParticipantes();
    else if (tab === 'config')    el.innerHTML = renderTabConfig();
    bindTabContent(tab);
  }

  /* ------------ TAB: MIS PREDICCIONES ------------ */
  function renderTabPredicciones() {
    var preds = loadPreds();
    var partidos = GRUPO.participantes[0] ? P.PARTIDOS.slice(0, 40) : P.PARTIDOS;
    // Show first 30 partidos grouped by fase
    var fasesToShow = P.FASES.slice(0, 3); // grupos, 16avos, octavos
    var html = '';

    fasesToShow.forEach(function (fase) {
      var msFase = P.partidosPorFase(fase.id).slice(0, fase.id === 'fase_grupos' ? 20 : 8);
      if (!msFase.length) return;
      html += '<div class="section-heading" style="padding-top:20px;">' + esc(fase.nombre) + '</div>';
      msFase.forEach(function (m) {
        html += renderMatchCard(m, preds);
      });
    });

    return '<div style="padding-bottom:16px;">' + html + '</div>';
  }

  function renderMatchCard(m, preds) {
    var estado = P.estadoPartido(m);
    var abierta = P.prediccionAbierta(m, GRUPO.reglas);
    var definidos = P.equiposDefinidos(m);
    var realRes = P.resultadoReal(m);
    var miPred = preds[m.n] || P.miPrediccion(m);
    var puntos = P.misPuntos(m, GRUPO.reglas);

    var badgeEstado = estadoBadge(estado);
    var flag1 = P.banderaEquipo(m.local);
    var flag2 = P.banderaEquipo(m.visitante);
    var name1 = P.etiquetaEquipo(m.local);
    var name2 = P.etiquetaEquipo(m.visitante);

    var predArea = '';
    if (!definidos) {
      predArea = '<div style="padding:10px 16px;background:var(--md-surface-container);border-top:1px solid var(--md-outline-variant);font-size:13px;color:var(--md-on-surface-variant);font-style:italic;">Los equipos de este partido se conocerán al finalizar la fase anterior.</div>';
    } else if (abierta && estado === 'programado') {
      var gl = miPred.gl;
      var gv = miPred.gv;
      predArea = '<div class="pred-inputs">' +
        '<span class="type-label-medium text-on-surface-var" style="flex:1;text-align:right;">' + esc(name1.length>10?name1.slice(0,10)+'…':name1) + '</span>' +
        '<div class="number-stepper" data-n="' + m.n + '" data-side="local">' +
          '<button type="button" onclick="stepperChange(this,-1)" aria-label="Restar gol local">−</button>' +
          '<input type="number" value="' + gl + '" min="0" max="20" data-n="' + m.n + '" data-side="local" class="stepper-val" aria-label="Goles local" style="font-size:16px;" />' +
          '<button type="button" onclick="stepperChange(this,1)" aria-label="Sumar gol local">+</button>' +
        '</div>' +
        '<span class="type-body-small text-on-surface-var">–</span>' +
        '<div class="number-stepper" data-n="' + m.n + '" data-side="visitante">' +
          '<button type="button" onclick="stepperChange(this,-1)" aria-label="Restar gol visitante">−</button>' +
          '<input type="number" value="' + gv + '" min="0" max="20" data-n="' + m.n + '" data-side="visitante" class="stepper-val" aria-label="Goles visitante" style="font-size:16px;" />' +
          '<button type="button" onclick="stepperChange(this,1)" aria-label="Sumar gol visitante">+</button>' +
        '</div>' +
        '<span class="type-label-medium text-on-surface-var" style="flex:1;">' + esc(name2.length>10?name2.slice(0,10)+'…':name2) + '</span>' +
        '<button class="btn btn-tonal" style="height:36px;font-size:13px;padding:0 12px;" onclick="savePred(' + m.n + ')" aria-label="Guardar predicción">Guardar</button>' +
      '</div>';
    } else {
      var predScore = miPred.gl + ' – ' + miPred.gv;
      var realScore = realRes ? (realRes.gl + ' – ' + realRes.gv) : '';
      var ptsBadge = puntos !== null ? '<span class="pts-badge ' + ptsClass(puntos) + '">' + puntos + ' pts</span>' : '';
      predArea = '<div class="pred-locked">' +
        '<span class="type-label-small text-on-surface-var">Tu pred:</span>' +
        '<span class="pred-score-display">' + esc(predScore) + '</span>' +
        (realScore ? '<span class="type-label-small text-on-surface-var" style="margin-left:auto;">Real: <strong>' + esc(realScore) + '</strong></span>' : '') +
        (ptsBadge ? ptsBadge : '') +
      '</div>';
    }

    var grupoLabel = m.grupo ? 'Grupo ' + m.grupo + ' · ' : '';
    return '<div class="match-card" style="margin:0 16px 10px;" onclick="goToPrediccion(' + m.n + ')" tabindex="0" role="button" aria-label="Ver detalle partido ' + esc(name1) + ' vs ' + esc(name2) + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){goToPrediccion(' + m.n + ')}">' +
      '<div class="match-header">' +
        '<span>' + esc(grupoLabel + faseNombre(m.fase)) + '</span>' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          badgeEstado +
          '<span>' + esc(P.fechaCorta(m)) + ' · ' + esc(P.horaCorta(m)) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="match-body">' +
        '<div class="match-team">' +
          '<span class="match-team-flag">' + esc(flag1) + '</span>' +
          '<span class="match-team-name">' + esc(name1) + '</span>' +
        '</div>' +
        '<div class="match-center">' +
          (realRes ? '<span class="match-score">' + realRes.gl + ' – ' + realRes.gv + '</span>' : '<span class="match-vs">VS</span>') +
          '<span class="type-label-small text-on-surface-var">' + esc(P.horaCorta(m)) + '</span>' +
        '</div>' +
        '<div class="match-team">' +
          '<span class="match-team-flag">' + esc(flag2) + '</span>' +
          '<span class="match-team-name">' + esc(name2) + '</span>' +
        '</div>' +
      '</div>' +
      predArea +
    '</div>';
  }

  window.goToPrediccion = function (n) {
    navigate('/grupo/g-oficina/prediccion/' + n);
  };

  window.stepperChange = function (btn, delta) {
    var stepper = btn.closest('.number-stepper');
    var input = stepper.querySelector('.stepper-val');
    var val = parseInt(input.value, 10) || 0;
    val = Math.max(0, Math.min(20, val + delta));
    input.value = val;
    // Save to preds automatically
    var n = parseInt(stepper.getAttribute('data-n'), 10);
    var side = stepper.getAttribute('data-side');
    var preds = loadPreds();
    if (!preds[n]) preds[n] = Object.assign({}, P.miPrediccion(P.partidoPorN(n)));
    if (side === 'local') preds[n].gl = val;
    else preds[n].gv = val;
    savePreds(preds);
  };

  window.savePred = function (n) {
    var preds = loadPreds();
    var m = P.partidoPorN(n);
    if (!m) return;
    var localInput = document.querySelector('[data-n="' + n + '"][data-side="local"].stepper-val');
    var visitInput = document.querySelector('[data-n="' + n + '"][data-side="visitante"].stepper-val');
    var gl = localInput ? (parseInt(localInput.value, 10) || 0) : 0;
    var gv = visitInput ? (parseInt(visitInput.value, 10) || 0) : 0;
    preds[n] = { gl: gl, gv: gv };
    savePreds(preds);
    showToast('Predicción guardada: ' + gl + ' – ' + gv);
  };

  /* ------------ TAB: TABLA DE POSICIONES ------------ */
  function renderTabTabla() {
    var tabla = P.tablaPosiciones(GRUPO);
    var top3 = tabla.slice(0, 3);

    var podiumHtml = '<div class="podium">' +
      // 2nd place
      (top3[1] ? '<div class="podium-item">' +
        '<div class="avatar" style="background-color:' + esc(top3[1].color) + ';">' + esc(top3[1].avatar) + '</div>' +
        '<div class="podium-block podium-block-2">2°</div>' +
        '<span class="type-label-small text-on-surface-var">' + esc(top3[1].nombre.split(' ')[0]) + '</span>' +
      '</div>' : '') +
      // 1st place
      (top3[0] ? '<div class="podium-item">' +
        '<div style="font-size:24px;text-align:center;">👑</div>' +
        '<div class="avatar avatar-lg" style="background-color:' + esc(top3[0].color) + ';">' + esc(top3[0].avatar) + '</div>' +
        '<div class="podium-block podium-block-1">1°</div>' +
        '<span class="type-label-small text-on-surface-var">' + esc(top3[0].nombre.split(' ')[0]) + '</span>' +
      '</div>' : '') +
      // 3rd place
      (top3[2] ? '<div class="podium-item">' +
        '<div class="avatar" style="background-color:' + esc(top3[2].color) + ';">' + esc(top3[2].avatar) + '</div>' +
        '<div class="podium-block podium-block-3">3°</div>' +
        '<span class="type-label-small text-on-surface-var">' + esc(top3[2].nombre.split(' ')[0]) + '</span>' +
      '</div>' : '') +
    '</div>';

    var rowsHtml = tabla.map(function (fila) {
      var esYo = fila.id === USUARIO.id;
      var pos = fila.posicion;
      var medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;
      return '<div class="lb-row' + (esYo ? ' me' : '') + '">' +
        '<span class="lb-pos">' + medal + '</span>' +
        '<div class="avatar avatar-sm" style="background-color:' + esc(fila.color) + ';">' + esc(fila.avatar) + '</div>' +
        '<span class="type-body-medium" style="flex:1;color:var(--md-on-surface);" aria-label="' + esc(fila.nombre) + '">' + esc(fila.nombre) + (esYo ? ' <span style="font-size:11px;color:var(--md-primary);">(tú)</span>' : '') + '</span>' +
        '<div style="text-align:right;">' +
          '<p class="type-title-small" style="color:var(--md-primary);">' + fila.puntos + ' pts</p>' +
          '<p class="type-label-small text-on-surface-var">' + fila.aciertos + ' aciertos</p>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div style="padding-bottom:16px;">' +
      podiumHtml +
      '<div class="section-heading">Clasificación completa</div>' +
      '<div style="padding:0 16px;display:flex;flex-direction:column;gap:4px;">' + rowsHtml + '</div>' +
    '</div>';
  }

  /* ------------ TAB: PARTIDOS ------------ */
  function renderTabPartidos() {
    var preds = loadPreds();
    // Filter chip
    var filterFaseId = APP_STATE._filterFase || 'todos';

    var chipsHtml = '<div class="chip-row">' +
      '<button class="chip chip-filter' + (filterFaseId === 'todos' ? ' chip-selected' : '') + '" data-filter="todos">Todos</button>' +
      P.FASES.map(function(f){
        return '<button class="chip chip-filter' + (filterFaseId === f.id ? ' chip-selected' : '') + '" data-filter="' + esc(f.id) + '">' + esc(f.nombre.replace('de Final','').trim()) + '</button>';
      }).join('') +
    '</div>';

    var partidos = filterFaseId === 'todos' ? P.PARTIDOS : P.partidosPorFase(filterFaseId);
    partidos = partidos.slice(0, 60); // performance cap

    var rowsHtml = partidos.map(function (m) {
      var estado = P.estadoPartido(m);
      var real = P.resultadoReal(m);
      var miPred = preds[m.n] || P.miPrediccion(m);
      var puntos = P.misPuntos(m, GRUPO.reglas);
      var flag1 = P.banderaEquipo(m.local);
      var flag2 = P.banderaEquipo(m.visitante);
      var n1 = P.etiquetaEquipo(m.local);
      var n2 = P.etiquetaEquipo(m.visitante);
      var ptsBadge = puntos !== null ? '<span class="pts-badge ' + ptsClass(puntos) + '">' + puntos + 'pts</span>' : '';

      return '<div class="match-card" style="margin:0 16px 8px;cursor:pointer;" onclick="goToPrediccion(' + m.n + ')" tabindex="0" role="button" aria-label="' + esc(n1) + ' vs ' + esc(n2) + '">' +
        '<div class="match-header">' +
          '<span>' + esc((m.grupo ? 'Grupo ' + m.grupo + ' · ' : '') + faseNombre(m.fase)) + '</span>' +
          '<div style="display:flex;gap:6px;align-items:center;">' + estadoBadge(estado) + '<span>' + esc(P.fechaCorta(m)) + '</span></div>' +
        '</div>' +
        '<div class="match-body" style="padding:10px 16px;">' +
          '<div class="match-team" style="flex-direction:row;gap:8px;flex:1;justify-content:flex-end;">' +
            '<span class="type-body-small truncate" style="max-width:70px;">' + esc(n1) + '</span>' +
            '<span style="font-size:24px;">' + esc(flag1) + '</span>' +
          '</div>' +
          '<div class="match-center" style="min-width:70px;">' +
            (real ? '<span class="match-score" style="font-size:22px;">' + real.gl + '–' + real.gv + '</span>' : '<span class="match-vs">VS</span>') +
          '</div>' +
          '<div class="match-team" style="flex-direction:row-reverse;gap:8px;flex:1;justify-content:flex-end;">' +
            '<span class="type-body-small truncate" style="max-width:70px;">' + esc(n2) + '</span>' +
            '<span style="font-size:24px;">' + esc(flag2) + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
            '<span class="type-label-small text-on-surface-var">' + miPred.gl + '–' + miPred.gv + '</span>' +
            ptsBadge +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div>' + chipsHtml + rowsHtml + '</div>';
  }

  /* ------------ TAB: REGLAS ------------ */
  function renderTabReglas() {
    var r = GRUPO.reglas;
    var pagaron = GRUPO.participantes.filter(function(p){return p.pago;}).length;
    var pozo = r.valor_apuesta * pagaron;

    function reglaRow(label, val, sufijo) {
      return '<div class="regla-item"><span class="type-body-medium">' + esc(label) + '</span><span class="regla-valor">' + esc(val) + (sufijo||'') + '</span></div>';
    }

    return '<div style="padding-bottom:24px;">' +
      '<div style="margin:16px;background:var(--md-surface-container-low);border-radius:var(--shape-md);border:1px solid var(--md-outline-variant);overflow:hidden;">' +
        '<div class="rules-section-title">Puntos Base</div>' +
        reglaRow('Marcador exacto', r.pts_marcador_exacto, ' pts') +
        reglaRow('Ganador correcto', r.pts_ganador, ' pts') +
        reglaRow('Gol acertado', r.pts_gol_acertado, ' pt por gol') +
        reglaRow('Predicción única', r.pts_prediccion_unica, ' pts bonus') +
      '</div>' +
      '<div style="margin:16px;background:var(--md-surface-container-low);border-radius:var(--shape-md);border:1px solid var(--md-outline-variant);overflow:hidden;">' +
        '<div class="rules-section-title">Bonos Eliminatorias</div>' +
        reglaRow('Dieciseisavos', r.bono_dieciseisavos, ' pts extra') +
        reglaRow('Octavos de Final', r.bono_octavos, ' pts extra') +
        reglaRow('Cuartos de Final', r.bono_cuartos, ' pts extra') +
        reglaRow('Semifinales', r.bono_semifinales, ' pts extra') +
        reglaRow('Gran Final', r.bono_final, ' pts extra') +
      '</div>' +
      '<div style="margin:16px;background:var(--md-surface-container-low);border-radius:var(--shape-md);border:1px solid var(--md-outline-variant);overflow:hidden;">' +
        '<div class="rules-section-title">Apuesta y Premios</div>' +
        reglaRow('Valor inscripción', formatCOP(r.valor_apuesta), '') +
        reglaRow('Participantes que pagaron', pagaron + ' de ' + GRUPO.participantes.length, '') +
        reglaRow('Pozo total', formatCOP(pozo), '') +
      '</div>' +
      '<div style="margin:16px;">' +
        '<div class="section-heading" style="padding:0 0 12px;">Distribución del Pozo</div>' +
        '<div class="card card-elevated" style="padding:0;overflow:hidden;">' +
          '<div class="prize-row" style="padding:14px 16px;">' +
            '<span class="prize-medal">🥇</span>' +
            '<div style="flex:1;"><p class="type-body-medium">1er Lugar</p><div style="height:6px;border-radius:999px;background:var(--md-primary);width:' + r.premio_primer_lugar + '%;margin-top:4px;"></div></div>' +
            '<div style="text-align:right;"><p class="type-title-small" style="color:var(--md-primary);">' + r.premio_primer_lugar + '%</p><p class="type-body-small text-on-surface-var">' + esc(formatCOP(pozo * r.premio_primer_lugar / 100)) + '</p></div>' +
          '</div>' +
          '<div class="prize-row" style="padding:14px 16px;">' +
            '<span class="prize-medal">🥈</span>' +
            '<div style="flex:1;"><p class="type-body-medium">2do Lugar</p><div style="height:6px;border-radius:999px;background:var(--md-secondary);width:' + r.premio_segundo_lugar + '%;margin-top:4px;"></div></div>' +
            '<div style="text-align:right;"><p class="type-title-small" style="color:var(--md-secondary);">' + r.premio_segundo_lugar + '%</p><p class="type-body-small text-on-surface-var">' + esc(formatCOP(pozo * r.premio_segundo_lugar / 100)) + '</p></div>' +
          '</div>' +
          '<div class="prize-row" style="padding:14px 16px;">' +
            '<span class="prize-medal">🥉</span>' +
            '<div style="flex:1;"><p class="type-body-medium">3er Lugar</p><div style="height:6px;border-radius:999px;background:var(--md-tertiary);width:' + r.premio_tercer_lugar + '%;margin-top:4px;"></div></div>' +
            '<div style="text-align:right;"><p class="type-title-small" style="color:var(--md-tertiary);">' + r.premio_tercer_lugar + '%</p><p class="type-body-small text-on-surface-var">' + esc(formatCOP(pozo * r.premio_tercer_lugar / 100)) + '</p></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="margin:0 16px;background:var(--md-surface-container-low);border-radius:var(--shape-md);padding:14px 16px;">' +
        '<p class="type-label-small text-on-surface-var">Cierre de predicciones</p>' +
        '<p class="type-body-medium">' + r.minutos_cierre_prediccion + ' minutos antes del inicio de cada partido</p>' +
      '</div>' +
    '</div>';
  }

  /* ------------ TAB: PARTICIPANTES ------------ */
  function renderTabParticipantes() {
    var tabla = P.tablaPosiciones(GRUPO);
    var tablaMap = {};
    tabla.forEach(function(f){ tablaMap[f.id] = f; });

    var html = GRUPO.participantes.map(function (p) {
      var pts = tablaMap[p.id] ? tablaMap[p.id].puntos : 0;
      var pos = tablaMap[p.id] ? tablaMap[p.id].posicion : '-';
      return '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--md-outline-variant);">' +
        '<div class="avatar" style="background-color:' + esc(p.color) + ';">' + esc(p.avatar) + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<p class="type-body-medium truncate" style="color:var(--md-on-surface);">' + esc(p.nombre) + (p.id === USUARIO.id ? ' <span style="font-size:11px;color:var(--md-primary);">(tú)</span>' : '') + '</p>' +
          '<div style="display:flex;gap:6px;align-items:center;margin-top:2px;">' +
            '<span class="badge ' + (p.rol === 'admin' ? 'badge-primary' : 'badge-secondary') + '">' + (p.rol === 'admin' ? 'Admin' : 'Jugador') + '</span>' +
            '<span class="payment-pill ' + (p.pago ? 'paid' : 'unpaid') + '">' + (p.pago ? '✓ Pagó' : '✗ Pendiente') + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<p class="type-title-small" style="color:var(--md-primary);">' + pts + ' pts</p>' +
          '<p class="type-label-small text-on-surface-var">Posición ' + pos + '</p>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div style="margin:16px 0;background:var(--md-surface-container-low);border-radius:var(--shape-md);border:1px solid var(--md-outline-variant);overflow:hidden;">' +
      '<div style="padding:12px 16px;background:var(--md-surface-container);border-bottom:1px solid var(--md-outline-variant);">' +
        '<p class="type-label-medium text-on-surface-var">👥 ' + GRUPO.participantes.length + ' participantes · ' +
        GRUPO.participantes.filter(function(p){return p.pago;}).length + ' pagaron</p>' +
      '</div>' +
      html +
    '</div>';
  }

  /* ------------ TAB: CONFIGURACIÓN ------------ */
  function renderTabConfig() {
    return '<div style="padding-bottom:24px;">' +
      '<div class="config-section">' +
        '<div class="config-section-header">Información del grupo</div>' +
        '<div class="config-section-body" style="display:flex;flex-direction:column;gap:16px;">' +
          '<div style="position:relative;">' +
            '<label for="cfgNombre" style="font-size:13px;color:var(--md-on-surface-variant);display:block;margin-bottom:6px;">Nombre del grupo</label>' +
            '<input type="text" id="cfgNombre" value="' + esc(GRUPO.nombre) + '" style="width:100%;height:48px;border:1px solid var(--md-outline);border-radius:var(--shape-xs);background:transparent;font-family:var(--font-family);font-size:16px;color:var(--md-on-surface);padding:0 14px;outline:none;box-sizing:border-box;" aria-label="Nombre del grupo" />' +
          '</div>' +
          '<div>' +
            '<label for="cfgDesc" style="font-size:13px;color:var(--md-on-surface-variant);display:block;margin-bottom:6px;">Descripción</label>' +
            '<textarea id="cfgDesc" style="width:100%;min-height:80px;border:1px solid var(--md-outline);border-radius:var(--shape-xs);background:transparent;font-family:var(--font-family);font-size:16px;color:var(--md-on-surface);padding:12px 14px;outline:none;resize:vertical;box-sizing:border-box;" aria-label="Descripción del grupo">' + esc(GRUPO.descripcion) + '</textarea>' +
          '</div>' +
          '<button class="btn btn-filled" style="height:44px;" id="btnSaveConfig" aria-label="Guardar cambios">Guardar cambios</button>' +
        '</div>' +
      '</div>' +
      '<div class="config-section">' +
        '<div class="config-section-header">Código de invitación</div>' +
        '<div class="config-section-body">' +
          '<div class="invite-code-box">' +
            '<span class="invite-code-text">' + esc(GRUPO.codigo) + '</span>' +
            '<button class="icon-btn" id="btnCopyConfig" aria-label="Copiar código">' + svgCopy() + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="config-section" style="margin-top:8px;">' +
        '<div class="config-section-header" style="color:var(--md-error);">Zona de peligro</div>' +
        '<div class="config-section-body">' +
          '<div class="danger-zone">' +
            '<p class="type-body-medium" style="margin-bottom:12px;">Salir del grupo eliminará tu historial de predicciones en este grupo.</p>' +
            '<button class="btn btn-error" style="height:44px;" id="btnLeaveGroup" aria-label="Salir del grupo">Salir del grupo</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function bindTabContent(tab) {
    if (tab === 'partidos') {
      document.querySelectorAll('[data-filter]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          APP_STATE._filterFase = this.getAttribute('data-filter');
          document.querySelectorAll('[data-filter]').forEach(function(c){ c.classList.remove('chip-selected'); });
          this.classList.add('chip-selected');
          var el = document.getElementById('tabContent');
          if (el) el.innerHTML = renderTabPartidos();
          bindTabContent('partidos');
        });
      });
    }
    if (tab === 'config') {
      var btnSave = document.getElementById('btnSaveConfig');
      if (btnSave) {
        btnSave.addEventListener('click', function () {
          showToast('Cambios guardados (demo).');
        });
      }
      var btnCopyConfig = document.getElementById('btnCopyConfig');
      if (btnCopyConfig) {
        btnCopyConfig.addEventListener('click', function () {
          fallbackCopy(GRUPO.codigo);
          showToast('Código copiado: ' + GRUPO.codigo);
        });
      }
      var btnLeave = document.getElementById('btnLeaveGroup');
      if (btnLeave) {
        btnLeave.addEventListener('click', function () {
          showToast('Saliste del grupo (demo). Redirigiendo…');
          setTimeout(function () { navigate('/dashboard'); }, 1200);
        });
      }
    }
  }

  /* =========================================================================
   * PANTALLA: DETALLE DE PREDICCIÓN
   * ======================================================================= */
  function renderPrediccionDetalle(m) {
    var preds = loadPreds();
    var estado = P.estadoPartido(m);
    var abierta = P.prediccionAbierta(m, GRUPO.reglas);
    var definidos = P.equiposDefinidos(m);
    var real = P.resultadoReal(m);
    var miPred = preds[m.n] || P.miPrediccion(m);
    var puntos = P.misPuntos(m, GRUPO.reglas);
    var flag1 = P.banderaEquipo(m.local);
    var flag2 = P.banderaEquipo(m.visitante);
    var name1 = P.etiquetaEquipo(m.local);
    var name2 = P.etiquetaEquipo(m.visitante);

    // Stats
    var statsGlobal = P.estadisticasGlobales(m);
    var statsGrupo  = P.estadisticasGrupo(GRUPO, m);
    var nominal     = P.prediccionesNominales(GRUPO, m);

    // Prediction form or locked display
    var predFormHtml = '';
    if (!definidos) {
      predFormHtml = '<div style="margin:16px;padding:14px;border-radius:var(--shape-md);background:var(--md-surface-container);border:1px solid var(--md-outline-variant);font-style:italic;color:var(--md-on-surface-variant);">Los equipos de este partido se conocerán al finalizar la fase anterior.</div>';
    } else if (abierta && estado === 'programado') {
      predFormHtml = '<div style="margin:16px;">' +
        '<div class="panel">' +
          '<div class="panel-header">' + svgInfo() + ' Tu predicción</div>' +
          '<div class="panel-body">' +
            '<div style="display:flex;align-items:center;gap:16px;justify-content:center;">' +
              '<div style="text-align:center;">' +
                '<p class="type-label-small text-on-surface-var">' + esc(name1.length>10?name1.slice(0,10)+'…':name1) + '</p>' +
                '<div class="number-stepper" style="margin-top:8px;" data-n="' + m.n + '" data-side="local">' +
                  '<button type="button" onclick="stepperChange(this,-1)" aria-label="Restar">−</button>' +
                  '<input type="number" value="' + miPred.gl + '" min="0" max="20" class="stepper-val" data-n="' + m.n + '" data-side="local" aria-label="Goles local" style="font-size:18px;" />' +
                  '<button type="button" onclick="stepperChange(this,1)" aria-label="Sumar">+</button>' +
                '</div>' +
              '</div>' +
              '<span class="type-headline-medium" style="color:var(--md-on-surface-variant);">–</span>' +
              '<div style="text-align:center;">' +
                '<p class="type-label-small text-on-surface-var">' + esc(name2.length>10?name2.slice(0,10)+'…':name2) + '</p>' +
                '<div class="number-stepper" style="margin-top:8px;" data-n="' + m.n + '" data-side="visitante">' +
                  '<button type="button" onclick="stepperChange(this,-1)" aria-label="Restar">−</button>' +
                  '<input type="number" value="' + miPred.gv + '" min="0" max="20" class="stepper-val" data-n="' + m.n + '" data-side="visitante" aria-label="Goles visitante" style="font-size:18px;" />' +
                  '<button type="button" onclick="stepperChange(this,1)" aria-label="Sumar">+</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<button class="btn btn-filled" style="width:100%;height:44px;margin-top:16px;" onclick="savePred(' + m.n + ')" aria-label="Guardar predicción">Guardar predicción</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    } else {
      var closedInfo = '<div style="margin:16px;">' +
        '<div class="panel">' +
          '<div class="panel-body" style="display:flex;align-items:center;justify-content:center;gap:24px;">' +
            '<div style="text-align:center;">' +
              '<p class="type-label-small text-on-surface-var">Tu predicción</p>' +
              '<p class="pred-score-display" style="font-size:32px;margin-top:4px;">' + miPred.gl + ' – ' + miPred.gv + '</p>' +
            '</div>' +
            (real ? '<div style="text-align:center;">' +
              '<p class="type-label-small text-on-surface-var">Resultado real</p>' +
              '<p class="pred-score-display" style="font-size:32px;margin-top:4px;color:var(--md-secondary);">' + real.gl + ' – ' + real.gv + '</p>' +
            '</div>' : '') +
            (puntos !== null ? '<div style="text-align:center;">' +
              '<p class="type-label-small text-on-surface-var">Puntos</p>' +
              '<span class="pts-badge ' + ptsClass(puntos) + '" style="font-size:20px;padding:6px 12px;margin-top:4px;">' + puntos + '</span>' +
            '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
      predFormHtml = closedInfo;
    }

    // Global stats panel
    var globalHtml = '<div style="margin:0 16px 16px;">' +
      '<div class="panel">' +
        '<div class="panel-header">🌍 Todos los usuarios <span class="type-label-small text-on-surface-var" style="margin-left:auto;">' + statsGlobal.total.toLocaleString('es-CO') + ' predicciones</span></div>' +
        '<div class="panel-body">' +
          '<p class="type-label-medium text-on-surface-var" style="margin-bottom:10px;">¿Quién gana?</p>' +
          renderWinnerBars(statsGlobal.ganador, name1, name2) +
          '<div class="divider" style="margin:16px 0;"></div>' +
          '<p class="type-label-medium text-on-surface-var" style="margin-bottom:10px;">Resultados más comunes</p>' +
          '<div class="distribution-bar">' +
            statsGlobal.topMarcadores.slice(0, 6).map(function(item){
              return renderDistBar(item.m, item.pct, '');
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    // Group stats panel
    var grupoHtml = '<div style="margin:0 16px 16px;">';
    if (!abierta) {
      if (nominal) {
        // Nominal list (bet closed)
        var nomHtml = nominal.map(function(p) {
          var esYo = p.id === USUARIO.id;
          return '<div class="nominal-row" style="' + (esYo ? 'background:color-mix(in srgb,var(--md-primary) 6%,transparent);' : '') + '">' +
            '<div class="avatar avatar-sm" style="background-color:' + esc(p.color) + ';">' + esc(p.avatar) + '</div>' +
            '<span class="type-body-medium" style="flex:1;">' + esc(p.nombre) + (esYo ? ' <span style="font-size:11px;color:var(--md-primary);">(tú)</span>' : '') + '</span>' +
            '<span class="nominal-pred">' + p.pred.gl + '–' + p.pred.gv + '</span>' +
            (p.puntos !== null ? '<span class="pts-badge ' + ptsClass(p.puntos) + '">' + p.puntos + '</span>' : '') +
          '</div>';
        }).join('');

        grupoHtml += '<div class="panel">' +
          '<div class="panel-header">👥 Predicciones del grupo</div>' +
          '<div>' + nomHtml + '</div>' +
        '</div>';

        // Also show group aggregates
        grupoHtml += '<div class="panel" style="margin-top:12px;">' +
          '<div class="panel-header">📊 Agregados del grupo</div>' +
          '<div class="panel-body">' +
            '<p class="type-label-medium text-on-surface-var" style="margin-bottom:10px;">¿Quién gana? (grupo)</p>' +
            renderWinnerBars(statsGrupo.ganador, name1, name2) +
            '<div class="divider" style="margin:16px 0;"></div>' +
            '<div class="distribution-bar">' +
              statsGrupo.topMarcadores.slice(0,5).map(function(item){ return renderDistBar(item.m, item.pct); }).join('') +
            '</div>' +
          '</div>' +
        '</div>';
      }
    } else {
      // Bet still open — secret
      grupoHtml += '<div class="panel">' +
        '<div class="panel-header">👥 Predicciones del grupo</div>' +
        '<div class="secret-panel">' +
          '<div class="secret-icon">🔒</div>' +
          '<p class="type-title-small" style="color:var(--md-on-surface);">Las predicciones de tus amigos son secretas</p>' +
          '<p class="type-body-medium text-on-surface-var">Estarán disponibles luego de que se cierre la apuesta (' + GRUPO.reglas.minutos_cierre_prediccion + ' min antes del partido).</p>' +
        '</div>' +
      '</div>';
    }
    grupoHtml += '</div>';

    return '<div style="display:flex;flex-direction:column;min-height:100dvh;">' +
      '<div class="top-app-bar">' +
        '<div class="top-app-bar-leading">' +
          '<button class="icon-btn" onclick="history.back()" aria-label="Volver">' + svgBack() + '</button>' +
        '</div>' +
        '<div class="top-app-bar-title" style="font-size:15px;">' + esc(name1) + ' vs ' + esc(name2) + '</div>' +
        '<div class="top-app-bar-trailing">' +
          estadoBadge(estado) +
        '</div>' +
      '</div>' +

      '<div class="app-scroll" style="flex:1;overflow-y:auto;">' +
        '<!-- Hero -->' +
        '<div class="detail-hero">' +
          '<div class="detail-teams">' +
            '<div class="detail-team">' +
              '<span class="detail-flag">' + esc(flag1) + '</span>' +
              '<span class="detail-name">' + esc(name1) + '</span>' +
            '</div>' +
            '<div class="detail-center">' +
              (real ? '<span class="detail-score">' + real.gl + ' – ' + real.gv + '</span>' : '<span class="detail-score" style="font-size:24px;color:var(--md-on-surface-variant);">VS</span>') +
              estadoBadge(estado) +
            '</div>' +
            '<div class="detail-team">' +
              '<span class="detail-flag">' + esc(flag2) + '</span>' +
              '<span class="detail-name">' + esc(name2) + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;">' +
            '<span class="type-body-small text-on-surface-var">📅 ' + esc(P.fechaCorta(m)) + '</span>' +
            '<span class="type-body-small text-on-surface-var">🕐 ' + esc(P.horaCorta(m)) + '</span>' +
            '<span class="type-body-small text-on-surface-var">🏟️ ' + esc(m.estadio) + '</span>' +
            (m.grupo ? '<span class="phase-label">Grupo ' + esc(m.grupo) + '</span>' : '<span class="phase-label">' + esc(faseNombre(m.fase)) + '</span>') +
          '</div>' +
        '</div>' +

        predFormHtml +
        globalHtml +
        grupoHtml +

        '<div style="padding-bottom:calc(env(safe-area-inset-bottom,0px) + 16px);"></div>' +
      '</div>' +
    '</div>';
  }

  function bindPrediccionDetalle(m) {
    // Steppers already bound via window.stepperChange
    // Nothing extra needed; savePred is also global
  }

  /* =========================================================================
   * NOT FOUND
   * ======================================================================= */
  function renderNotFound() {
    return '<div class="empty-state" style="min-height:100dvh;">' +
      '<div class="empty-state-icon">🔍</div>' +
      '<p class="type-headline-small">Página no encontrada</p>' +
      '<button class="btn btn-filled" onclick="navigate(\'/dashboard\')">Ir al inicio</button>' +
    '</div>';
  }

  /* =========================================================================
   * INIT
   * ======================================================================= */
  window.navigate = navigate;

  document.getElementById('themeToggleRail').addEventListener('click', toggleTheme);
  document.getElementById('themeToggleBar').addEventListener('click', toggleTheme);

  initTheme();

  window.addEventListener('hashchange', render);

  // Redirect root to login
  if (!location.hash || location.hash === '#' || location.hash === '#/') {
    location.hash = '#/login';
  } else {
    render();
  }

})();
