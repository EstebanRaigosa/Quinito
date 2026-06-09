"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { mensajeErrorAuth } from "@/lib/supabase/auth-errores";
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

/** `destino`: a dónde redirigir tras autenticar (default `/dashboard`). */
export function FormularioLogin({ destino = "/dashboard" }: { destino?: string }) {
  const router = useRouter();
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

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
    router.push(destino);
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
      </form>
    </Form>
  );
}
