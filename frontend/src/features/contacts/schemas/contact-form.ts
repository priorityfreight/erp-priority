import { z } from "zod"
import { isValidEmail, isValidLinkedInUrl } from "@/components/forms/contact-form-utils"

export const contactFormSchema = z.object({
  clientId: z.string().trim().min(1, "El cliente es obligatorio."),
  name: z.string().trim().min(1, "El nombre del contacto es obligatorio."),
  position: z.string().trim(),
  phone: z.string().trim(),
  linkedinUrl: z
    .string()
    .trim()
    .refine((value) => isValidLinkedInUrl(value), "La URL debe pertenecer a linkedin.com."),
  email: z
    .string()
    .trim()
    .refine((value) => isValidEmail(value), "El correo no tiene un formato valido."),
  status: z.enum(["activo", "ya_no_trabaja"]),
})

export type ContactFormSchemaValues = z.infer<typeof contactFormSchema>
