import { supabase } from "@/lib/supabaseClient"

export type CurrentErpUser = {
  id: string
  auth_user_id: string | null
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
  username: string | null
  active: boolean
  role_id: string | null
  role_name: string | null
  branch_id: string | null
}

function mapCurrentErpUser(row: Record<string, unknown>): CurrentErpUser {
  return {
    id: String(row.id),
    auth_user_id: (row.auth_user_id as string | null | undefined) ?? null,
    first_name: (row.first_name as string | null | undefined) ?? null,
    last_name: (row.last_name as string | null | undefined) ?? null,
    email: String(row.email ?? ""),
    phone: (row.phone as string | null | undefined) ?? null,
    username: (row.username as string | null | undefined) ?? null,
    active: Boolean(row.active ?? false),
    role_id: (row.role_id as string | null | undefined) ?? null,
    role_name: (row.role_name as string | null | undefined) ?? null,
    branch_id: (row.branch_id as string | null | undefined) ?? null,
  }
}

export async function resolveLoginIdentity(login: string): Promise<string | null> {
  const normalizedLogin = login.trim()

  if (!normalizedLogin) {
    return null
  }

  const { data, error } = await supabase.rpc("resolve_login_identity", {
    p_login: normalizedLogin,
  })

  if (error) {
    throw error
  }

  return typeof data === "string" && data ? data : null
}

export async function linkCurrentAuthUser(): Promise<string | null> {
  const { data, error } = await supabase.rpc("link_current_auth_user")

  if (error) {
    throw error
  }

  return typeof data === "string" && data ? data : null
}

export async function getCurrentErpUser(): Promise<CurrentErpUser | null> {
  const { data, error } = await supabase.rpc("get_current_erp_user")

  if (error) {
    throw error
  }

  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== "object") {
    return null
  }

  return mapCurrentErpUser(row as Record<string, unknown>)
}

export async function signOutCurrentUser() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
