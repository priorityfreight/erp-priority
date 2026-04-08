import { z } from "zod"

export const userFormSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre es obligatorio."),
  roleName: z.string().trim().min(1, "Selecciona un rol."),
  email: z.string().trim().email("El correo no tiene un formato valido."),
  phone: z.string().trim(),
  username: z.string().trim().min(1, "El username es obligatorio."),
  password: z.string().trim(),
  status: z.enum(["activo", "inactivo"]),
})

export type UserFormSchemaValues = z.infer<typeof userFormSchema>

