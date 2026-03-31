"use client"

import { useParams } from "next/navigation"
import { ProviderDetailView } from "@/features/provider-detail/ProviderDetailView"
import { useProviderDetailController } from "@/features/provider-detail/useProviderDetailController"

export default function ProviderDetailPage() {
  const params = useParams()
  const providerId = typeof params?.id === "string" ? params.id : undefined
  const controller = useProviderDetailController(providerId)

  return <ProviderDetailView controller={controller} />
}
