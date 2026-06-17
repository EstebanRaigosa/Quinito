import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Configuración de Tailwind 3.4 para Polla.
 *
 * Tokens de marca derivados de `Desing System/tokens.json`. Los roles semánticos
 * (background, primary, etc.) se exponen como variables CSS en `app/globals.css`
 * para soportar tema claro/oscuro; las escalas de marca (clay, mustard, sage…) se
 * declaran aquí como colores directos para uso utilitario.
 *
 * NO migrar a Tailwind v4: rompe iOS 15 (COMPATIBILIDAD-STACK §3).
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // Roles semánticos (vía variables CSS, soportan dark mode)
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Superficies del DS (bg-app, bg-surface, bg-sunken, bg-elevated)
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        sunken: "var(--bg-sunken)",
        elevated: "var(--bg-elevated)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          soft: "var(--secondary-soft)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          soft: "var(--danger-soft)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
          foreground: "var(--warning-foreground)",
        },
        info: {
          DEFAULT: "var(--info)",
          soft: "var(--info-soft)",
          foreground: "var(--info-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        // Escalas de marca (uso directo: bg-clay-500, text-sage-600, etc.)
        // Spring Turf: clay→ink/navy · mustard→emerald · sage→teal · sand/stone→slate
        clay: {
          50: "#F1F5F9", 100: "#E2E8F0", 200: "#CBD5E1", 300: "#94A3B8",
          400: "#64748B", 500: "#475569", 600: "#334155", 700: "#1E293B",
          800: "#14253B", 900: "#0B1C30", 950: "#07111F",
        },
        mustard: {
          50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0", 300: "#6EE7B7",
          400: "#22C55E", 500: "#16A34A", 600: "#15803D", 700: "#166534",
          800: "#14532D", 900: "#052E16",
        },
        sage: {
          50: "#F0FDFA", 100: "#CCFBF1", 200: "#99F6E4", 300: "#5EEAD4",
          400: "#2DD4BF", 500: "#14B8A6", 600: "#0D9488", 700: "#0F766E",
          800: "#115E59", 900: "#134E4A",
        },
        sand: {
          50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1",
          400: "#94A3B8", 500: "#64748B", 600: "#475569", 700: "#334155",
          800: "#1E293B", 900: "#0F172A",
        },
        stone: {
          50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1",
          400: "#94A3B8", 500: "#64748B", 600: "#475569", 700: "#334155",
          800: "#1E293B", 900: "#0F172A",
        },
      },
      // Solo texto: text-fg / text-fg-strong / text-fg-muted / text-fg-subtle
      textColor: {
        fg: {
          DEFAULT: "var(--fg-default)",
          strong: "var(--fg-strong)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
          disabled: "var(--fg-disabled)",
        },
      },
      // Solo borde: border-subtle / border-strong (border-border sigue siendo subtle)
      borderColor: {
        subtle: "var(--border-subtle)",
        strong: "var(--border-strong)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": "0.6875rem",
      },
      // Lenguaje "bento": esquinas más redondeadas. Cards usan xl/2xl.
      borderRadius: {
        lg: "var(--radius)",            /* 16px — botones / inputs */
        md: "calc(var(--radius) - 3px)", /* 13px */
        sm: "calc(var(--radius) - 7px)", /* 9px */
        xl: "22px",                      /* tiles / superficies medianas */
        "2xl": "28px",                   /* cards bento principales */
        "3xl": "32px",                   /* modales / hero */
        pill: "999px",
      },
      boxShadow: {
        // Sombras suaves con tinte verde (Spring Turf §Elevación).
        xs: "0 1px 2px rgba(15, 40, 27, 0.06)",
        sm: "0 1px 3px rgba(15, 40, 27, 0.08), 0 1px 2px rgba(15, 40, 27, 0.04)",
        md: "0 8px 20px -4px rgba(16, 64, 38, 0.10), 0 3px 8px -2px rgba(16, 64, 38, 0.06)",
        lg: "0 16px 32px -6px rgba(16, 64, 38, 0.14), 0 6px 12px -4px rgba(16, 64, 38, 0.08)",
        xl: "0 28px 56px -8px rgba(16, 64, 38, 0.20), 0 10px 20px -6px rgba(16, 64, 38, 0.10)",
        // Halo verde para superficies destacadas (CTA, próximo partido).
        glow: "0 8px 24px -6px rgba(34, 197, 94, 0.45)",
        "glow-lg": "0 16px 40px -8px rgba(34, 197, 94, 0.55)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        "in-out": "cubic-bezier(0.65, 0.05, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Entradas (mount): sutiles, compositor-friendly. translate3d fuerza
        // capa GPU en iOS y evita jank (§10).
        "fade-up": {
          from: { opacity: "0", transform: "translate3d(0, 14px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale3d(0.96, 0.96, 1)" },
          to: { opacity: "1", transform: "scale3d(1, 1, 1)" },
        },
        // Énfasis: rebote corto para puntos, badges, medallas.
        pop: {
          "0%": { transform: "scale3d(0.82, 0.82, 1)", opacity: "0" },
          "60%": { transform: "scale3d(1.06, 1.06, 1)", opacity: "1" },
          "100%": { transform: "scale3d(1, 1, 1)", opacity: "1" },
        },
        // Barra que crece desde la izquierda (stats, tabla).
        "grow-x": {
          from: { transform: "scale3d(0, 1, 1)" },
          to: { transform: "scale3d(1, 1, 1)" },
        },
        // Brillo diagonal que recorre una superficie (CTA, podio oro).
        shine: {
          "0%": { transform: "translate3d(-150%, 0, 0) skewX(-16deg)" },
          "65%, 100%": { transform: "translate3d(260%, 0, 0) skewX(-16deg)" },
        },
        // Latido para indicadores "en vivo".
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale3d(1, 1, 1)" },
          "50%": { opacity: "0.4", transform: "scale3d(0.85, 0.85, 1)" },
        },
        // Destello al actualizarse una tarjeta en vivo (marcador/estado): anillo
        // esmeralda que aparece y se desvanece una sola vez. Llama la atención
        // sin desplazar layout (solo box-shadow).
        destello: {
          "0%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
          "12%": { boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.55)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
        },
        // Latido de atención (recorrido guiado): anillo ámbar que late de forma
        // continua para señalar el botón "Arranque". Solo box-shadow → no
        // desplaza layout y es compositor-friendly en iOS (§10).
        "latido-atencion": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 158, 11, 0)" },
          "50%": { boxShadow: "0 0 0 6px rgba(245, 158, 11, 0.35)" },
        },
        // Flotación lenta para blobs decorativos.
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
        // Barrido para skeletons.
        shimmer: {
          "100%": { transform: "translate3d(100%, 0, 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        pop: "pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "grow-x": "grow-x 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        shine: "shine 3.2s ease-in-out infinite",
        "live-pulse": "live-pulse 1.5s ease-in-out infinite",
        destello: "destello 1.6s ease-out 1",
        "latido-atencion": "latido-atencion 1.4s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
