"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [submitting, setSubmitting] = React.useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const fd = new FormData();
    fd.set("identifier", values.identifier);
    fd.set("password", values.password);
    const result = await loginAction(null, fd);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("¡Bienvenido!");
    const redirectParam = params.get("redirect");
    if (redirectParam) {
      router.push(redirectParam);
    } else {
      router.push(result.data?.role === "admin" ? "/dashboard" : "/perfil");
    }
    router.refresh();
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accede a tu cuenta para reservar y gestionar tus autos.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Correo electrónico</Label>
            <Input
              id="identifier"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.identifier}
              {...form.register("identifier")}
            />
            {form.formState.errors.identifier && (
              <p className="text-xs text-destructive">{form.formState.errors.identifier.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link href="/recuperar" className="text-xs text-muted-foreground hover:text-foreground">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" variant="premium" size="lg" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-medium text-foreground hover:underline">
              Crear una
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
