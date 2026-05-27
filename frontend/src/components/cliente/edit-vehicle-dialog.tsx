"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VehicleForm } from "./vehicle-form";
import type { Vehicle } from "@/types/models";

export function EditVehicleDialog({
  vehicle,
  open,
  onOpenChange,
}: {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar vehículo</DialogTitle>
          <DialogDescription>
            Actualiza los datos de tu {vehicle.brand} {vehicle.model}.
          </DialogDescription>
        </DialogHeader>
        <VehicleForm
          vehicle={vehicle}
          embedded
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
