# Guía de integración · Polla Design System

## Opción A · CSS plano (más rápido)

Copia `tokens.css` y `components.css` a tu proyecto e impórtalos en el entry global:

```html
<link rel="stylesheet" href="/assets/polla/tokens.css" />
<link rel="stylesheet" href="/assets/polla/components.css" />
```

O en un bundle:

```js
import './styles/polla/tokens.css';
import './styles/polla/components.css';
```

Toggle de tema:

```js
// modo oscuro
document.documentElement.dataset.theme = 'dark';
// volver a claro
document.documentElement.dataset.theme = 'light';
// detectar preferencia del sistema
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
```

Uso en markup:

```html
<button class="btn btn-primary">Crear quiniela</button>
<input class="input" placeholder="Email" />
<span class="badge badge-success"><span class="dot"></span>Activa</span>
```

## Opción B · Tailwind CSS

En `tailwind.config.js` extiende el theme con los tokens semánticos:

```js
import tokens from './design_handoff_polla/tokens.json';

export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        bg: {
          app: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          sunken: 'var(--bg-sunken)',
          muted: 'var(--bg-muted)',
        },
        fg: {
          DEFAULT: 'var(--fg-default)',
          strong: 'var(--fg-strong)',
          muted: 'var(--fg-muted)',
          subtle: 'var(--fg-subtle)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        clay: tokens.color.clay,
        mustard: tokens.color.mustard,
        sage: tokens.color.sage,
        sand: tokens.color.sand,
        stone: tokens.color.stone,
      },
      fontFamily: {
        sans: ['Mulish', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '20px', '2xl': '28px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
    },
  },
  darkMode: ['class', '[data-theme="dark"]'],
};
```

Carga sólo `tokens.css` para tener las variables disponibles; las clases de componentes las construyes con utilities de Tailwind.

## Opción C · React + CSS Modules / styled-components

```jsx
// theme.js
export const tokens = {
  colors: {
    primary: 'var(--primary)',
    bg: 'var(--bg-app)',
    fg: 'var(--fg-default)',
  },
  radii: {
    md: 'var(--radius-md)',
  },
  shadows: {
    sm: 'var(--shadow-sm)',
  },
};

// Button.jsx
export function Button({ variant = 'primary', size = 'md', children, ...rest }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      {...rest}
    >
      {children}
    </button>
  );
}
```

## Opción D · React Native / Expo (NativeWind o StyleSheet)

Para mobile, traduce los tokens semánticos a un objeto JS:

```js
// theme.js
export const lightTheme = {
  bg: { app: '#FBF8F2', surface: '#FFFDF8', elevated: '#FFFFFF', sunken: '#F4EEE2' },
  fg: { default: '#251B0F', muted: '#554D3D', subtle: '#6E6552' },
  primary: '#D1A82A',
  primaryFg: '#251B0F',
  border: { subtle: '#D7D0C3', default: '#B5AB99' },
  // …
};

export const darkTheme = {
  bg: { app: '#14100A', surface: '#1A140C', elevated: '#251B0F', sunken: '#0F0B07' },
  // …
};
```

Usa `useColorScheme()` de RN o un context para alternar.

## Opción E · SwiftUI

```swift
extension Color {
    static let pollaBgApp = Color(red: 0.984, green: 0.973, blue: 0.949)      // #FBF8F2
    static let pollaPrimary = Color(red: 0.820, green: 0.659, blue: 0.165)    // #D1A82A
    static let pollaPrimaryFg = Color(red: 0.145, green: 0.106, blue: 0.059)  // #251B0F
    // …
}

extension Font {
    static func mulish(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Mulish", size: size).weight(weight)
    }
}
```

Carga la fuente Mulish vía Info.plist (UIAppFonts).

---

## Validación post-integración

Lista de verificación al portar:

- [ ] Variables CSS o tokens equivalentes definidos en light + dark
- [ ] Mulish cargada con todos los pesos (300–900)
- [ ] Focus ring visible en todos los componentes interactivos
- [ ] Toggle de tema funciona y persiste preferencia
- [ ] Contraste validado en al menos 3 pantallas reales
- [ ] Botón primary aparece **una sola vez** por pantalla
- [ ] Touch targets ≥ 32px (size sm) en mobile
- [ ] Transitions suaves (120–280ms) en hover/focus
- [ ] `prefers-reduced-motion` respeta animaciones (deshabilitar `transform` en ese caso)

## Soporte

Cualquier duda sobre tokens, decisiones del sistema o cómo extender un componente específico, regresa al HTML de documentación (`Polla Design System.html`) — cada componente está mostrado con sus estados, tamaños y ejemplos en contexto.
