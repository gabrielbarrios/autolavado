"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { vehicleSchema, type VehicleInput } from "@/lib/validations/vehicle";
import { createVehicleAction, updateVehicleAction } from "@/actions/vehicles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/types/models";

interface VehicleFormProps {
  /** Si pasas un vehicle, el form entra en modo edición */
  vehicle?: Vehicle;
  /** Si está dentro de un dialog, no usar Card wrapper */
  embedded?: boolean;
  /** Callback al guardar exitosamente (útil para cerrar diálogos) */
  onSuccess?: () => void;
  /** Callback al cancelar */
  onCancel?: () => void;
}

export function VehicleForm({ vehicle, embedded = false, onSuccess, onCancel }: VehicleFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const isEdit = Boolean(vehicle);
  const vehicleTypes = useVehicleTypes();

  const form = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      brand: vehicle?.brand ?? "",
      model: vehicle?.model ?? "",
      year: vehicle?.year ?? new Date().getFullYear(),
      color: vehicle?.color ?? "",
      plate: vehicle?.plate ?? "",
      notes: vehicle?.notes ?? "",
      // El auto que se edita manda; si es nuevo, el primer tipo del catálogo
      // (el dueño pudo renombrar o borrar "sedan").
      vehicleType: vehicle?.vehicleType ?? vehicleTypes[0]?.slug ?? "",
      isUberTaxi: vehicle?.isUberTaxi ?? false,
    },
  });

  async function onSubmit(values: VehicleInput) {
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.set(k, String(v ?? "")));
    const result = isEdit && vehicle
      ? await updateVehicleAction(vehicle.id, fd)
      : await createVehicleAction(fd);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Auto actualizado" : "Auto registrado");
    if (onSuccess) {
      onSuccess();
      router.refresh();
    } else {
      router.push("/autos");
      router.refresh();
    }
  }

  function handleCancel() {
    if (onCancel) onCancel();
    else router.back();
  }

  const body = (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className={cn("space-y-4", embedded ? "" : "p-0")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              aria-invalid={!!form.formState.errors.brand}
              {...form.register("brand")}
            />
            {form.formState.errors.brand && (
              <p className="text-xs text-destructive">{form.formState.errors.brand.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input
              id="model"
              aria-invalid={!!form.formState.errors.model}
              {...form.register("model")}
            />
            {form.formState.errors.model && (
              <p className="text-xs text-destructive">{form.formState.errors.model.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Año</Label>
            <Input
              id="year"
              type="number"
              aria-invalid={!!form.formState.errors.year}
              {...form.register("year", { valueAsNumber: true })}
            />
            {form.formState.errors.year && (
              <p className="text-xs text-destructive">{form.formState.errors.year.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              aria-invalid={!!form.formState.errors.color}
              {...form.register("color")}
            />
            {form.formState.errors.color && (
              <p className="text-xs text-destructive">{form.formState.errors.color.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tipo de auto</Label>
          <Controller
            control={form.control}
            name="vehicleType"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {vehicleTypes.map((t) => {
                  const selected = field.value === t.slug;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => field.onChange(t.slug)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm transition-all",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/60",
                      )}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {form.formState.errors.vehicleType && (
            <p className="text-xs text-destructive">{form.formState.errors.vehicleType.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            El tipo determina el precio del paquete. Elige el que más se acerque a tu vehículo.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-3">
          <div>
            <Label htmlFor="isUberTaxi" className="cursor-pointer">
              ¿Es Uber o Taxi?
            </Label>
            <p className="text-xs text-muted-foreground">
              Si lo activas obtendrás un precio especial cuando esté disponible.
            </p>
          </div>
          <Controller
            control={form.control}
            name="isUberTaxi"
            render={({ field }) => (
              <Switch
                id="isUberTaxi"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plate">Placa (opcional)</Label>
          <Input
            id="plate"
            className="uppercase"
            aria-invalid={!!form.formState.errors.plate}
            {...form.register("plate")}
          />
          {form.formState.errors.plate && (
            <p className="text-xs text-destructive">{form.formState.errors.plate.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            rows={3}
            aria-invalid={!!form.formState.errors.notes}
            {...form.register("notes")}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="premium" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Editar vehículo" : "Nuevo vehículo"}</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
