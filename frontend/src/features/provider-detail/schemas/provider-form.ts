import { z } from "zod"
import { isValidEmail, isValidLinkedInUrl } from "@/components/forms/contact-form-utils"

export const providerFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre comercial es obligatorio."),
  taxId: z.string().trim(),
  status: z.string().trim(),
  providerType: z.string().trim().min(1, "El tipo de proveedor es obligatorio."),
  corporatePhone: z.string().trim(),
  companyEmail: z
    .string()
    .trim()
    .refine((value) => isValidEmail(value), "El correo no tiene un formato valido."),
  website: z.string().trim(),
  fullAddress: z.string().trim(),
  postalCode: z.string().trim(),
  city: z.string().trim(),
  cityUnlocode: z.string().trim(),
  country: z.string().trim(),
  creditActive: z.enum(["si", "no"]),
  creditAmount: z.string().trim(),
  creditDays: z.string().trim(),
})

export const providerContactFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre del contacto es obligatorio."),
  email: z
    .string()
    .trim()
    .refine((value) => isValidEmail(value), "El correo no tiene un formato valido."),
  phone: z.string().trim(),
  linkedinUrl: z
    .string()
    .trim()
    .refine((value) => isValidLinkedInUrl(value), "La URL debe pertenecer a linkedin.com."),
  position: z.string().trim(),
  status: z.enum(["activo", "ya_no_trabaja"]),
})

export const providerServiceOfferingFormSchema = z.object({
  serviceType: z.string().trim().min(1, "El tipo de servicio es obligatorio."),
  serviceTransportTypeId: z.string().trim().min(1, "Selecciona un tipo de transporte."),
  termsAndConditions: z.string().trim(),
})

export type ProviderFormSchemaValues = z.infer<typeof providerFormSchema>
export type ProviderContactFormSchemaValues = z.infer<typeof providerContactFormSchema>
export type ProviderServiceOfferingFormSchemaValues = z.infer<typeof providerServiceOfferingFormSchema>
