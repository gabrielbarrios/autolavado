"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { useVehicleTypes } from "@/components/shared/vehicle-types-provider";

/**
 * Rejilla de precios por tipo de auto, compartida por el alta de paquetes y la
 * de otros servicios: los dos guardan el mismo componente de Strapi
 * (`shared.vehicle-type-price`). Un tipo sin "Precio" no genera fila, así que
 * se pueden dar de alta servicios que solo apliquen a algunos autos.
 *
 * Los nombres de los campos (`price_sedan`, `uber_sedan`, `vip_sedan`) son el
 * contrato con `parsePricing` en src/actions/catalog.ts.
 */
export function PricingFields({
  disabled = false,
  onHasPricesChange,
}: {
  /** Apagado cuando el servicio se cotiza en sucursal. */
  disabled?: boolean;
  /** Avisa si hay al menos un "Precio" capturado, para bloquear la cotización. */
  onHasPricesChange?: (hasPrices: boolean) => void;
} = {}) {
  const vehicleTypes = useVehicleTypes();

  // Se mira el DOM del propio fieldset en vez de llevar estado por input: los
  // campos son no controlados y así el aviso vale para cualquier tipo de auto.
  function handleChange(e: React.ChangeEvent<HTMLFieldSetElement>) {
    if (!onHasPricesChange) return;
    const inputs = e.currentTarget.querySelectorAll<HTMLInputElement>('input[name^="price_"]');
    onHasPricesChange(Array.from(inputs).some((i) => i.value.trim() !== ""));
  }

  return (
    <fieldset className="space-y-3" disabled={disabled} onChange={handleChange}>
      <legend className="text-sm font-medium">Precios por tipo de auto</legend>
      <p className="text-xs text-muted-foreground">
        Deja en blanco los tipos que no apliquen. Uber/Taxi y VIP son opcionales: si los dejas
        vacíos se cobra el precio normal.
      </p>

      <div className={`overflow-x-auto ${disabled ? "opacity-40" : ""}`}>
        <table className="w-full min-w-[30rem] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Tipo</th>
              <th className="py-2 pr-3 font-medium">Precio</th>
              <th className="py-2 pr-3 font-medium">Uber / Taxi</th>
              <th className="py-2 font-medium">VIP</th>
            </tr>
          </thead>
          <tbody>
            {vehicleTypes.map((t) => (
              <tr key={t.slug}>
                <td className="py-1.5 pr-3 whitespace-nowrap">{t.name}</td>
                <td className="py-1.5 pr-3">
                  <PriceInput name={`price_${t.slug}`} label={`Precio ${t.name}`} />
                </td>
                <td className="py-1.5 pr-3">
                  <PriceInput name={`uber_${t.slug}`} label={`Precio Uber/Taxi ${t.name}`} />
                </td>
                <td className="py-1.5">
                  <PriceInput name={`vip_${t.slug}`} label={`Precio VIP ${t.name}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}

function PriceInput({ name, label }: { name: string; label: string }) {
  return (
    <Input
      name={name}
      aria-label={label}
      type="number"
      min="0"
      step="0.01"
      inputMode="decimal"
      placeholder="—"
      className="max-w-[7.5rem]"
    />
  );
}
