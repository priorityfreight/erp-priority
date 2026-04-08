import { MailboxesManager } from "@/components/master-data/MailboxesManager"
import { ensureRouteAccessOrRedirect } from "@/lib/permissions/server"

export default async function MailboxesMasterDataPage() {
  await ensureRouteAccessOrRedirect("/master-data/mail")

  return <MailboxesManager />
}
