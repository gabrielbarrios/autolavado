"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { forgotSchema, type ForgotInput } from "@/lib/validations/auth";
import { forgotAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function ForgotForm() {
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const form = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  async function onSubmit(values: ForgotInput) {
    setSubmitting(true);
    const fd = new FormData();
    fd.set("email", values.email);
    const result = await forgotAction(null, fd);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Si el correo existe, recibirás instrucciones");
    setSent(true);
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>Te enviaremos un enlace a tu correo si la cuenta existe.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              disabled={sent}
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" variant="premium" size="lg" className="w-full" disabled={submitting || sent}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {sent ? "Enviado" : "Enviar enlace"}
          </Button>
          <Link href="/login" className="text-center text-xs text-muted-foreground hover:text-foreground">
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
