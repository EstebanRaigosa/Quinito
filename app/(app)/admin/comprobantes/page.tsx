import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { PageContainer } from "@/components/shared/PageContainer";
import { BuscadorComprobante } from "@/components/grupos/BuscadorComprobante";

export const metadata: Metadata = {
  title: "Admin · Comprobantes",
};

export default async function AdminComprobantesPage() {
  // Reusa la sesión ya validada por el layout (acierto de caché, sin round-trip).
  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  // Solo super-admin de plataforma (busca en TODAS las pollas vía RLS).
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  return (
    <PageContainer ancho="estrecho" className="space-y-7">
      <header className="animate-fade-up">
        <p className="overline flex items-center gap-2 text-primary">
          <Receipt className="size-4" /> Admin de plataforma
        </p>
        <h1 className="t-display mt-1.5">Comprobantes</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Verifica cualquier comprobante de pago de la plataforma por su código:
          confirma cuándo se realizó el pago y por qué valor.
        </p>
      </header>

      <div className="animate-fade-up">
        <BuscadorComprobante />
      </div>
    </PageContainer>
  );
}
