import type { Metadata } from "next";
import { FormularioResetPassword } from "@/components/auth/FormularioResetPassword";
import { LogoMark } from "@/components/shared/Logo";

export const metadata: Metadata = {
  title: "Nueva contraseña",
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center space-y-6 px-5 py-10 animate-fade-up">
      <div className="flex flex-col items-center text-center">
        <span className="rounded-2xl shadow-glow">
          <LogoMark size={48} className="shadow-md" />
        </span>
        <h1 className="t-h2 mt-4 text-fg-strong">Crea una nueva contraseña</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Elige una contraseña segura para tu cuenta.
        </p>
      </div>

      <div className="surface-card rounded-2xl p-5 shadow-md">
        <FormularioResetPassword />
      </div>
    </div>
  );
}
