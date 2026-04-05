import { z } from "zod"

export const clientFormSchema = z.object({
  companyName: z.string().trim().min(1, "El nombre de la empresa es obligatorio."),
  taxId: z.string().trim(),
  status: z.string().trim().min(1, "El estatus comercial es obligatorio."),
  accountOwnerId: z.string().trim(),
  industry: z.string().trim(),
  country: z.string().trim(),
  website: z.string().trim(),
  corporatePhone: z.string().trim(),
  fullAddress: z.string().trim(),
  postalCode: z.string().trim(),
  city: z.string().trim(),
  cityUnlocode: z.string().trim(),
})

export type ClientFormSchemaValues = z.infer<typeof clientFormSchema>

