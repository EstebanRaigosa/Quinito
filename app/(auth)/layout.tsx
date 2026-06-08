/** Shell público para el flujo de autenticación. Cada página controla su propio
 * layout: mobile a sangre (hero + hoja) y desktop centrado. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-app">
      {/* Fondo de marca: halos esmeralda/teal (visibles sobre todo en desktop). */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 animate-float rounded-full bg-mustard-200/40 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full bg-sage-200/40 blur-3xl"
      />
      {children}
    </div>
  );
}
