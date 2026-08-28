"use client";

import * as React from "react";
import { FALLBACK_VEHICLE_TYPES } from "@/lib/pricing";
import type { VehicleTypeDef } from "@/types/models";

/**
 * Reparte el catálogo de tipos de auto a los componentes cliente.
 *
 * La lista se lee en el layout (server) y se inyecta aquí una sola vez, en vez
 * de que cada selector la pida por su cuenta: así el precio por tipo, los
 * selectores y las etiquetas ven exactamente lo mismo dentro de una misma
 * página. Sin provider —o si el catálogo viene vacío— se usa el respaldo, para
 * que un Strapi caído no deje al cliente sin poder elegir su auto.
 */
const VehicleTypesContext = React.createContext<VehicleTypeDef[] | null>(null);

export function VehicleTypesProvider({
  types,
  children,
}: {
  types: VehicleTypeDef[];
  children: React.ReactNode;
}) {
  return <VehicleTypesContext.Provider value={types}>{children}</VehicleTypesContext.Provider>;
}

export function useVehicleTypes(): VehicleTypeDef[] {
  const types = React.useContext(VehicleTypesContext);
  return types && types.length > 0 ? types : FALLBACK_VEHICLE_TYPES;
}
