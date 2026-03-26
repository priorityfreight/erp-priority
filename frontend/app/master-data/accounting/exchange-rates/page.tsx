import { ExchangeRateManager } from "@/components/master-data/ExchangeRateManager"
import { ensureRouteAccessOrRedirect } from "@/lib/permissions/server"

export default async function ExchangeRatesPage() {
  await ensureRouteAccessOrRedirect("/master-data/accounting/exchange-rates")

  return <ExchangeRateManager />
}
