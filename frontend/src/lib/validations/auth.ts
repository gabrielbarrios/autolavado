import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nombre demasiado corto"),
    email: z.string().email("Correo inválido"),
    phone: z
      .string()
      .min(8, "Teléfono demasiado corto")
      .max(20, "Teléfono demasiado largo")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const forgotSchema = z.object({
  email: z.string().email("Correo inválido"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
