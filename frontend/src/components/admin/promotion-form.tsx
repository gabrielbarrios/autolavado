"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPromotionAction } from "@/actions/promotions";
import type { DiscountType, PromotionAppliesTo } from "@/types/models";

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

/**
 * Alta de campañas. Es un `<form>` normal con server action: los tres modos de
 * disponibilidad solo cambian qué campos se muestran, y la validación de verdad
 * (la que protege el dinero) vive en el backend.
 */
export function PromotionForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [availability, setAvailability] = React.useState<"always" | "weekdays" | "dateRange">(
    "always",
  );
  const [discountType, setDiscountType] = React.useState<DiscountType>("percent");
  // Controlado para poder pasarlo a "Solo lavado" al elegir precio fijo, que
  // es el caso típico ("lavado a $99"); el admin puede cambiarlo después.
  const [appliesTo, setAppliesTo] = React.useState<PromotionAppliesTo>("all");
  const [pending, setPending] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await createPromotionAction(null, fd);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Promoción creada");
    formRef.current?.reset();
    setAvailability("always");
    setDiscountType("percent");
    setAppliesTo("all");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nueva promoción
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" placeholder="Miércoles de chicas" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código (opcional)</Label>
              <Input id="code" name="code" placeholder="Se genera del título" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Para que el cliente sepa de qué va la promo"
            />
          </div>

          {/* Descuento */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Descuento</legend>
            <div className="flex flex-wrap gap-2">
              <RadioPill
                name="discountType"
                value="percent"
                checked={discountType === "percent"}
                onChange={() => setDiscountType("percent")}
                label="Porcentaje"
              />
              <RadioPill
                name="discountType"
                value="fixed"
                checked={discountType === "fixed"}
                onChange={() => setDiscountType("fixed")}
                label="Monto fijo"
              />
              <RadioPill
                name="discountType"
                value="fixedPrice"
                checked={discountType === "fixedPrice"}
                onChange={() => {
                  setDiscountType("fixedPrice");
                  setAppliesTo("package");
                }}
                label="Precio fijo"
              />
              <RadioPill
                name="discountType"
                value="free"
                checked={discountType === "free"}
                onChange={() => setDiscountType("free")}
                label="Gratis"
              />
            </div>
            {discountType !== "free" && (
              <div className="max-w-[220px] space-y-2">
                <Label htmlFor="discountValue">
                  {discountType === "percent"
                    ? "Porcentaje (%)"
                    : discountType === "fixedPrice"
                      ? "Precio final (pesos)"
                      : "Pesos a descontar"}
                </Label>
                <Input
                  id="discountValue"
                  name="discountValue"
                  type="number"
                  min="1"
                  max={discountType === "percent" ? "100" : undefined}
                  step={discountType === "percent" ? "1" : "0.01"}
                  defaultValue={discountType === "percent" ? "20" : discountType === "fixedPrice" ? "99" : "50"}
                  required
                />
              </div>
            )}
            {discountType === "fixedPrice" && (
              <p className="text-xs text-muted-foreground">
                Se cobra exactamente ese precio en lugar del de catálogo, sin importar el paquete ni
                el tipo de auto, aunque el catálogo sea más barato. Con «Solo lavado», los extras se
                suman aparte.
              </p>
            )}
          </fieldset>

          {/* Sobre qué aplica */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">¿Sobre qué aplica?</legend>
            <div className="flex flex-wrap gap-2">
              <RadioPill
                name="appliesTo"
                value="all"
                checked={appliesTo === "all"}
                onChange={() => setAppliesTo("all")}
                label="Lavado y extras"
              />
              <RadioPill
                name="appliesTo"
                value="package"
                checked={appliesTo === "package"}
                onChange={() => setAppliesTo("package")}
                label="Solo lavado"
              />
              <RadioPill
                name="appliesTo"
                value="extras"
                checked={appliesTo === "extras"}
                onChange={() => setAppliesTo("extras")}
                label="Solo servicios extra"
              />
            </div>
            {discountType === "fixedPrice" && appliesTo === "all" && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Con «Lavado y extras», el precio fijo es por todo el ticket, extras incluidos.
              </p>
            )}
          </fieldset>

          {/* Disponibilidad */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">¿Cuándo está disponible?</legend>
            <div className="flex flex-wrap gap-2">
              <RadioPill
                name="availability"
                value="always"
                checked={availability === "always"}
                onChange={() => setAvailability("always")}
                label="Siempre"
              />
              <RadioPill
                name="availability"
                value="weekdays"
                checked={availability === "weekdays"}
                onChange={() => setAvailability("weekdays")}
                label="Días de la semana"
              />
              <RadioPill
                name="availability"
                value="dateRange"
                checked={availability === "dateRange"}
                onChange={() => setAvailability("dateRange")}
                label="Rango de fechas"
              />
            </div>

            {availability === "always" && (
              <p className="text-xs text-muted-foreground">
                Sin caducidad: siempre aparece en la caja. Para cosas como cumpleañero, donde el
                empleado decide si aplica.
              </p>
            )}

            {availability === "weekdays" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <label
                      key={d.value}
                      className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/15 has-[:checked]:text-primary"
                    >
                      <input type="checkbox" name="weekdays" value={d.value} className="sr-only" />
                      {d.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Se repite todas las semanas. Puedes además acotarlo con un rango de fechas abajo.
                </p>
                <DateRange />
              </div>
            )}

            {availability === "dateRange" && <DateRange required />}
          </fieldset>

          {/* Visibilidad */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Visibilidad</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 p-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <input type="checkbox" name="isPrivate" className="mt-0.5 h-4 w-4 accent-primary" />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-medium">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Promoción privada
                </span>
                <span className="block text-xs text-muted-foreground">
                  Solo aparece en la caja al momento de cobrar. No se publica en el sitio ni en las
                  promociones del cliente.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear promoción
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

function DateRange({ required = false }: { required?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="validFrom">Desde</Label>
        <Input id="validFrom" name="validFrom" type="date" required={required} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="validUntil">Hasta</Label>
        <Input id="validUntil" name="validUntil" type="date" required={required} />
      </div>
    </div>
  );
}

function RadioPill({
  name,
  value,
  label,
  checked,
  defaultChecked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/15 has-[:checked]:text-primary">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}
