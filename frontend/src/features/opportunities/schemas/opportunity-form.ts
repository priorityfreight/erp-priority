import { z } from "zod"

export const opportunityFormSchema = z.object({
  clientId: z.string().trim().min(1, "El cliente es obligatorio."),
  salespersonId: z.string().trim().min(1, "El responsable es obligatorio."),
  serviceType: z.string().trim().min(1, "El tipo de servicio es obligatorio."),
  transportType: z.string().trim(),
  operationType: z
    .string()
    .trim()
    .refine((value) => value === "Import" || value === "Export", "El tipo de operacion es obligatorio."),
  incotermId: z.string().trim(),
  origin: z.string().trim(),
  originUnlocode: z.string().trim(),
  destination: z.string().trim(),
  destinationUnlocode: z.string().trim(),
  expectedProfitUsd: z.string().trim(),
  serviceQuantity: z.string().trim(),
  description: z.string().trim(),
})

export type OpportunityFormSchemaValues = z.infer<typeof opportunityFormSchema>
