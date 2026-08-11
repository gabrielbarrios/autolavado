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
import { createPromotionAction } from "@/actions/promotions";

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
  const [discountType, setDiscountType] = React.useState<"percent" | "fixed" | "free">("percent");
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
                value="free"
                checked={discountType === "free"}
                onChange={() => setDiscountType("free")}
                label="Gratis"
              />
            </div>
            {discountType !== "free" && (
              <div className="max-w-[220px] space-y-2">
                <Label htmlFor="discountValue">
                  {discountType === "percent" ? "Porcentaje (%)" : "Pesos a descontar"}
                </Label>
                <Input
                  id="discountValue"
                  name="discountValue"
                  type="number"
                  min="1"
                  max={discountType === "percent" ? "100" : undefined}
                  step={discountType === "percent" ? "1" : "0.01"}
                  defaultValue={discountType === "percent" ? "20" : "50"}
                  required
                />
              </div>
            )}
          </fieldset>

          {/* Sobre qué aplica */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">¿Sobre qué aplica?</legend>
            <div className="flex flex-wrap gap-2">
              <RadioPill name="appliesTo" value="all" defaultChecked label="Lavado y extras" />
              <RadioPill name="appliesTo" value="package" label="Solo lavado" />
              <RadioPill name="appliesTo" value="extras" label="Solo servicios extra" />
            </div>
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
