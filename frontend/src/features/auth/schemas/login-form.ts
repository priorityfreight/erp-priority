import { z } from "zod"

export const loginFormSchema = z.object({
  login: z.string().trim().min(1, "Ingresa tu usuario o correo."),
  password: z.string().trim().min(1, "Ingresa tu contraseña."),
})

export type LoginFormSchemaValues = z.infer<typeof loginFormSchema>
