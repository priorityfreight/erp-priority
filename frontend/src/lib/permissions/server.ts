import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getCurrentErpUserServer() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_current_erp_user")

  if (error) {
    return null
  }

  return Array.isArray(data) ? data[0] ?? null : data
}

export async function ensureRouteAccessOrRedirect(routePath: string, fallbackPath = "/") {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("erp_can_access_route", {
    p_route_path: routePath,
    p_action_code: "view",
  })

  if (error || !data) {
    redirect(fallbackPath)
  }
}
