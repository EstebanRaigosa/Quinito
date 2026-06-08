"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, Mail, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { mensajeErrorAuth } from "@/lib/supabase/auth-errores";
import { SITE_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function FormularioLogin() {
  const router = useRouter();
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviandoEnlace, setEnviandoEnlace] = useState(false);
  const [enlaceEnviado, setEnlaceEnviado] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /**
   * Acceso sin contraseña (magic link / OTP). Fallback recomendado para PWA
   * standalone en iOS, donde el OAuth puede romper (COMPATIBILIDAD-MOVIL.md §14).
   * Reusa el callback PKCE existente. `shouldCreateUser: false` → solo entra
   * a cuentas ya registradas (esto es la pantalla de inicio de sesión).
   */
  async function enviarEnlace() {
    const ok = await form.trigger("email");
    if (!ok) return;
    const email = form.getValues("email");
    setEnviandoEnlace(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${SITE_URL}/auth/callback?next=/dashboard`,
      },
    });
    setEnviandoEnlace(false);
    if (error) {
      toast.error(mensajeErrorAuth(error));
      return;
    }
    setEnlaceEnviado(email);
  }

  async function onSubmit(values: LoginInput) {
    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      toast.error(mensajeErrorAuth(error));
      setEnviando(false);
      return;
    }
    toast.success("Sesión iniciada");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  enterKeyHint="next"
                  placeholder="tucorreo@ejemplo.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Contraseña</FormLabel>
                <Link
                  href="/forgot-password"
                  className="t-body-sm font-semibold text-primary underline-offset-2 hover:underline"
                >
                  ¿Olvidaste?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={verPassword ? "text" : "password"}
                    autoComplete="current-password"
                    enterKeyHint="go"
                    placeholder="Tu contraseña"
                    className="pr-11"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={
                      verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute right-0.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-md text-fg-subtle transition-colors hover:text-fg-muted"
                  >
                    {verPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Iniciar sesión
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>

        {enlaceEnviado ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl bg-primary-soft/60 p-3"
          >
            <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="t-body-sm text-fg">
              Te enviamos un enlace de acceso a{" "}
              <strong className="font-bold text-fg-strong">{enlaceEnviado}</strong>.
              Ábrelo en este dispositivo para entrar.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              <span className="text-2xs font-bold uppercase tracking-widest text-fg-subtle">
                o
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            {/* Acceso sin contraseña: fallback robusto para iOS standalone (§14). */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={enviarEnlace}
              disabled={enviandoEnlace}
            >
              {enviandoEnlace ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Mail className="size-4" />
                  Enviarme un enlace de acceso
                </>
              )}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}
