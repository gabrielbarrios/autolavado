import { z } from "zod";

export const appointmentSchema = z
  .object({
    packageId: z.number().int().positive().optional(),
    vehicleId: z.number({ invalid_type_error: "Selecciona un vehículo" }).int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    timeSlot: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
    customerNotes: z.string().max(500).optional().or(z.literal("")),
    extraServiceIds: z.array(z.number().int().positive()).default([]),
  })
  .refine((d) => d.packageId != null || d.extraServiceIds.length > 0, {
    message: "Selecciona un paquete o al menos un servicio extra",
    path: ["packageId"],
  });

export type AppointmentInput = z.infer<typeof appointmentSchema>;
