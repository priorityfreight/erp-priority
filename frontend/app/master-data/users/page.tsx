import { UsersManager } from "@/components/master-data/UsersManager"
import { ensureRouteAccessOrRedirect, getCurrentErpUserServer } from "@/lib/permissions/server"

export default async function UsersPage() {
  await ensureRouteAccessOrRedirect("/master-data/users")
  const currentUser = await getCurrentErpUserServer()

  return <UsersManager currentUserEmail={currentUser?.email ?? ""} />
}
