import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormularioRecuperarPassword } from "@/components/auth/FormularioRecuperarPassword";
import { LogoMark } from "@/components/shared/Logo";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center space-y-6 px-5 py-10 animate-fade-up">
      <Link
        href="/login"
        className="t-body-sm inline-flex min-h-11 items-center gap-1.5 font-semibold text-fg-muted transition-colors hover:text-fg-strong"
      >
        <ArrowLeft className="size-4" /> Volver a iniciar sesión
      </Link>

      <div className="flex flex-col items-center text-center">
        <span className="rounded-2xl shadow-glow">
          <LogoMark size={48} className="shadow-md" />
        </span>
        <h1 className="t-h2 mt-4 text-fg-strong">Recupera tu contraseña</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Te enviaremos un enlace a tu correo para crear una nueva.
        </p>
      </div>

      <div className="surface-card rounded-2xl p-5 shadow-md">
        <FormularioRecuperarPassword />
      </div>
    </div>
  );
}
