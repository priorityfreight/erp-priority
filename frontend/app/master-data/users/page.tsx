import { redirect } from "next/navigation"
import { UsersManager } from "@/components/master-data/UsersManager"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function UsersPage() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_current_erp_user")
  const currentUser = Array.isArray(data) ? data[0] : data

  if (error || !currentUser || currentUser.role_name !== "Admin") {
    redirect("/")
  }

  return <UsersManager currentUserEmail={currentUser.email} />
}
