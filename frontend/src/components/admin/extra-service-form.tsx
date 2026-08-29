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
import { createExtraServiceAction } from "@/actions/catalog";

/**
 * Alta de servicios sueltos (encerado, lavado de asientos…). Gemelo de
 * `PackageForm`: cambian los campos propios, el resto del patrón es el mismo.
 */
export function ExtraServiceForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  // Las dos formas de poner precio son excluyentes: o tabla por tipo de auto,
  // o "se cotiza en sucursal". Cada una deshabilita a la otra.
  const [quoteOnRequest, setQuoteOnRequest] = React.useState(false);
  const [hasPrices, setHasPrices] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createExtraServiceAction(null, fd);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Servicio creado");
    formRef.current?.reset();
    setQuoteOnRequest(false);
    setHasPrices(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nuevo servicio
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
              <Input id="name" name="name" placeholder="Encerado" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Duración estimada (minutos)</Label>
              <Input
                id="estimatedDuration"
                name="estimatedDuration"
                type="number"
                min="0"
                step="5"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Para que el cliente sepa qué incluye"
            />
          </div>

          <div className="space-y-3">
            <PricingFields disabled={quoteOnRequest} onHasPricesChange={setHasPrices} />

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                quoteOnRequest ? "border-amber-500/60 bg-amber-500/5" : "border-border"
              } ${hasPrices ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                name="quoteOnRequest"
                className="mt-0.5"
                checked={quoteOnRequest}
                disabled={hasPrices}
                onChange={(e) => setQuoteOnRequest(e.target.checked)}
              />
              <span>
                El precio depende del tamaño del carro, favor de cotizar el costo
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {hasPrices
                    ? "Disponible solo si no capturas precios por tipo de auto."
                    : "El servicio se muestra sin precio y la caja captura el monto al cobrar."}
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="w-28 space-y-2">
              <Label htmlFor="order">Orden</Label>
              <Input id="order" name="order" type="number" min="0" defaultValue="0" />
            </div>
            <CheckPill name="active" label="Activo" defaultChecked />
            <CheckPill name="featured" label="Destacado" />
          </div>

          <p className="text-xs text-muted-foreground">
            La foto del servicio se agrega después desde el panel de contenido.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear servicio
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
