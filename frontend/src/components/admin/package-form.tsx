"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PricingFields } from "@/components/admin/pricing-fields";
import { CheckPill } from "@/components/admin/pills";
import { createPackageAction } from "@/actions/catalog";

/**
 * Alta de paquetes de lavado. Mismo patrón que `PromotionForm`: un `<form>`
 * normal contra una server action, con la validación de verdad en el backend.
 * La imagen y el resto de campos finos se siguen editando en Strapi.
 */
export function PackageForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createPackageAction(null, fd);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Paquete creado");
    formRef.current?.reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo paquete
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" placeholder="Lavado premium" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duración (minutos)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min="5"
                step="5"
                defaultValue="30"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Qué incluye, en una línea"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Incluye (uno por línea)</Label>
            <Textarea
              id="benefits"
              name="benefits"
              rows={4}
              placeholder={"Carrocería y vidrios\nAspirado\nAroma cabina"}
            />
          </div>

          <PricingFields />

          <div className="flex flex-wrap items-end gap-4">
            <div className="w-28 space-y-2">
              <Label htmlFor="order">Orden</Label>
              <Input id="order" name="order" type="number" min="0" defaultValue="0" />
            </div>
            <CheckPill name="featured" label="Destacado" />
          </div>

          <p className="text-xs text-muted-foreground">
            La foto del paquete se agrega después desde el panel de contenido.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear paquete
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
