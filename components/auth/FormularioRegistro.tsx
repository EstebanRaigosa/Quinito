"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { registroSchema, type RegistroInput } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { mensajeErrorAuth } from "@/lib/supabase/auth-errores";
import { SITE_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/** `destino`: a dónde redirigir tras crear la cuenta (default `/dashboard`). */
export function FormularioRegistro({ destino = "/dashboard" }: { destino?: string }) {
  const router = useRouter();
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [emailConfirmacion, setEmailConfirmacion] = useState<string | null>(null);

  const form = useForm<RegistroInput>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      nombre_completo: "",
      email: "",
      password: "",
      confirmar: "",
      terminos: false,
    },
  });

  async function onSubmit(values: RegistroInput) {
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.nombre_completo },
        emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(destino)}`,
      },
    });
    if (error) {
      toast.error(mensajeErrorAuth(error));
      setEnviando(false);
      return;
    }
    // Con "Confirm email" activado, si el correo YA existe, Supabase no devuelve
    // error (evita enumeración de emails): retorna un user con `identities: []`
    // y sin sesión. Lo tratamos como "ya tienes cuenta" en vez de mostrar
    // "revisa tu correo", que sería engañoso.
    if (data.user && data.user.identities?.length === 0) {
      toast.error(
        "Ya tienes una cuenta con este correo. Inicia sesión con tu contraseña o con Google.",
      );
      setEnviando(false);
      return;
    }
    // Si la confirmación de email está desactivada, ya hay sesión → al dashboard.
    if (data.session) {
      toast.success("Cuenta creada");
      router.push(destino);
      router.refresh();
      return;
    }
    // Si está activada, mostrar pantalla "revisa tu correo".
    setEmailConfirmacion(values.email);
  }

  if (emailConfirmacion) {
    return (
      <div className="flex animate-fade-in flex-col items-center gap-3 rounded-xl bg-primary-soft/60 p-6 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
          <MailCheck className="size-7" />
        </span>
        <div className="space-y-1.5">
          <h2 className="t-h4 text-fg-strong">Revisa tu correo</h2>
          <p className="t-body-sm text-fg-muted">
            Te enviamos un enlace de confirmación a{" "}
            <span className="font-semibold text-fg-strong">
              {emailConfirmacion}
            </span>
            . Ábrelo para activar tu cuenta.
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
          name="nombre_completo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Tu nombre"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={verPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
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
              <FormDescription>Al menos 8 caracteres y 1 número.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar contraseña</FormLabel>
              <FormControl>
                <Input
                  type={verPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="terminos"
          render={({ field }) => (
            <FormItem>
              <label className="flex items-start gap-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                </FormControl>
                <span className="t-body-sm text-fg-muted">
                  Acepto los términos y condiciones de uso.
                </span>
              </label>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando && <Loader2 className="size-4 animate-spin" />}
          Crear cuenta
        </Button>
      </form>
    </Form>
  );
}
