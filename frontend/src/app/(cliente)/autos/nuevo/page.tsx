import { VehicleForm } from "@/components/cliente/vehicle-form";

export const metadata = { title: "Nuevo auto" };

export default function NuevoAutoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo auto</h1>
        <p className="text-muted-foreground">Llena los datos del vehículo que quieres registrar.</p>
      </div>
      <VehicleForm />
    </div>
  );
}
