import { z } from "zod"

export const quotationFormSchema = z.object({
  pickupAddress: z.string().trim(),
  deliveryAddress: z.string().trim(),
  requiredQuoteDate: z.string().trim(),
})

export type QuotationFormSchemaValues = z.infer<typeof quotationFormSchema>
