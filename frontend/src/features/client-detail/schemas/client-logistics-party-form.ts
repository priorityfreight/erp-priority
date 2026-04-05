import { z } from "zod"
import { isValidEmail } from "@/components/forms/contact-form-utils"

export const clientLogisticsPartyFormSchema = z.object({
  partyType: z.enum(["shipper", "consignee", "aa"]),
  name: z.string().trim().min(1, "El nombre operativo es obligatorio."),
  fullAddress: z.string().trim(),
  postalCode: z.string().trim(),
  city: z.string().trim(),
  country: z.string().trim(),
  cityUnlocode: z.string().trim(),
  contactName: z.string().trim(),
  contactEmail: z
    .string()
    .trim()
    .refine((value) => isValidEmail(value), "El correo no tiene un formato valido."),
  contactPhone: z.string().trim(),
})

export type ClientLogisticsPartyFormSchemaValues = z.infer<typeof clientLogisticsPartyFormSchema>
