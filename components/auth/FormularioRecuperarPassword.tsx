"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/schemas/auth";
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

export function FormularioRecuperarPassword() {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
    });
    if (error) {
      toast.error(mensajeErrorAuth(error));
      setEnviando(false);
      return;
    }
    // Siempre mostrar éxito (no revelar si el email existe — privacidad).
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex animate-fade-in flex-col items-center gap-3 rounded-xl bg-primary-soft/60 p-6 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
          <MailCheck className="size-7" />
        </span>
        <div className="space-y-1.5">
          <h2 className="t-h4 text-fg-strong">Revisa tu correo</h2>
          <p className="t-body-sm text-fg-muted">
            Si el email existe, te enviamos un enlace para restablecer tu
            contraseña.
          </p>
        </div>
      </div>
    );
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
                  placeholder="tucorreo@ejemplo.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando && <Loader2 className="size-4 animate-spin" />}
          Enviar enlace
        </Button>
      </form>
    </Form>
  );
}
