import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  phone: z.string().min(8).max(20).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
