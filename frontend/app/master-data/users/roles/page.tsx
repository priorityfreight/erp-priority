import { RolesPermissionsManager } from "@/components/master-data/RolesPermissionsManager"
import { ensureRouteAccessOrRedirect, getCurrentErpUserServer } from "@/lib/permissions/server"

export default async function RolesPermissionsPage() {
  await ensureRouteAccessOrRedirect("/master-data/users/roles")
  const currentUser = await getCurrentErpUserServer()

  return <RolesPermissionsManager currentUserEmail={currentUser?.email ?? ""} />
}
