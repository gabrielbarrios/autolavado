"use client";

import { Input } from "@/components/ui/input";
import { VEHICLE_TYPES } from "@/lib/pricing";

/**
 * Rejilla de precios por tipo de auto, compartida por el alta de paquetes y la
 * de otros servicios: los dos guardan el mismo componente de Strapi
 * (`shared.vehicle-type-price`). Un tipo sin "Precio" no genera fila, así que
 * se pueden dar de alta servicios que solo apliquen a algunos autos.
 *
 * Los nombres de los campos (`price_sedan`, `uber_sedan`, `vip_sedan`) son el
 * contrato con `parsePricing` en src/actions/catalog.ts.
 */
export function PricingFields() {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Precios por tipo de auto</legend>
      <p className="text-xs text-muted-foreground">
        Deja en blanco los tipos que no apliquen. Uber/Taxi y VIP son opcionales: si los dejas
        vacíos se cobra el precio normal.
      </p>

      <div className="overflow-x-auto">
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
            {VEHICLE_TYPES.map((t) => (
              <tr key={t.value}>
                <td className="py-1.5 pr-3 whitespace-nowrap">{t.label}</td>
                <td className="py-1.5 pr-3">
                  <PriceInput name={`price_${t.value}`} label={`Precio ${t.label}`} />
                </td>
                <td className="py-1.5 pr-3">
                  <PriceInput name={`uber_${t.value}`} label={`Precio Uber/Taxi ${t.label}`} />
                </td>
                <td className="py-1.5">
                  <PriceInput name={`vip_${t.value}`} label={`Precio VIP ${t.label}`} />
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
