"use client";

import Image from "next/image";
import { Trash2, Car, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { strapiMediaUrl } from "@/lib/utils";
import { vehicleTypeLabel } from "@/lib/pricing";
import { deleteVehicleAction } from "@/actions/vehicles";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditVehicleDialog } from "./edit-vehicle-dialog";
import type { Vehicle } from "@/types/models";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function onDelete() {
    if (!confirm(`¿Eliminar ${vehicle.brand} ${vehicle.model}?`)) return;
    setLoading(true);
    const result = await deleteVehicleAction(vehicle.id);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Auto eliminado");
    router.refresh();
  }

  return (
    <>
      <Card className="overflow-hidden">
        {vehicle.photo && (
          <div className="relative h-40 w-full bg-muted">
            <Image
              src={strapiMediaUrl(vehicle.photo, "small") ?? ""}
              alt={`${vehicle.brand} ${vehicle.model}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
        )}
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">
                {vehicle.brand} {vehicle.model}
              </h3>
              <p className="text-xs text-muted-foreground">
                {vehicle.year} · {vehicle.color}
              </p>
            </div>
            {vehicle.plate && (
              <Badge variant="outline" className="font-mono text-xs">
                {vehicle.plate}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vehicle.vehicleType && (
              <Badge variant="secondary" className="gap-1">
                <Car className="h-3 w-3" /> {vehicleTypeLabel(vehicle.vehicleType)}
              </Badge>
            )}
            {vehicle.isUberTaxi && <Badge variant="info">Uber / Taxi</Badge>}
          </div>
          {vehicle.notes && <p className="text-xs text-muted-foreground">{vehicle.notes}</p>}
          <div className="flex justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              disabled={loading}
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={loading}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditVehicleDialog vehicle={vehicle} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
