import { z } from "zod";

export const vehicleSchema = z.object({
  brand: z.string().min(2, "Marca requerida"),
  model: z.string().min(1, "Modelo requerido"),
  year: z
    .number({ invalid_type_error: "Año inválido" })
    .int()
    .min(1950, "Año inválido")
    .max(new Date().getFullYear() + 1, "Año inválido"),
  color: z.string().min(2, "Color requerido"),
  plate: z
    .string()
    .max(15, "Placa demasiado larga")
    .optional()
    .transform((v) => (v ? v.toUpperCase().trim() : "")),
  notes: z.string().max(500).optional().or(z.literal("")),
  // Slug de un Tipo de auto (api::vehicle-type): la lista la administra el
  // dueño en Strapi, así que aquí solo se exige que venga algo.
  vehicleType: z.string().min(1, "Selecciona el tipo de auto"),
  isUberTaxi: z.boolean().default(false),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
