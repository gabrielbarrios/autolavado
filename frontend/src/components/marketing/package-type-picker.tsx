"use client";

import * as React from "react";
import { Car } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";
import type { VehicleType } from "@/types/models";

export interface VehicleSelection {
  vehicleType: VehicleType | null;
  isUberTaxi: boolean;
}

export function PackageTypePicker({
  value,
  onChange,
  className,
}: {
  value: VehicleSelection;
  onChange: (next: VehicleSelection) => void;
  className?: string;
}) {
  const vehicleTypes = useVehicleTypes();

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/30 p-4 sm:flex-row sm:justify-between ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Car className="h-4 w-4 text-primary" />
        <span>Ver precios para mi auto:</span>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Select
          value={value.vehicleType ?? ""}
          onValueChange={(v) => onChange({ ...value, vehicleType: v as VehicleType })}
        >
          <SelectTrigger className="min-w-[220px]">
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            {vehicleTypes.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="uber-taxi-toggle"
            checked={value.isUberTaxi}
            onCheckedChange={(checked) => onChange({ ...value, isUberTaxi: checked })}
          />
          <Label htmlFor="uber-taxi-toggle" className="cursor-pointer whitespace-nowrap text-sm">
            Es Uber / Taxi
          </Label>
        </div>
      </div>
    </div>
  );
}
