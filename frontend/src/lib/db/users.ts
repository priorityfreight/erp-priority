import { supabase } from "@/lib/supabaseClient"
import type { User, UserRole } from "./models"

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    auth_user_id: (row.auth_user_id as string | null | undefined) ?? null,
    first_name: String(row.first_name ?? ""),
    last_name: String(row.last_name ?? ""),
    email: String(row.email ?? ""),
    phone: (row.phone as string | null | undefined) ?? null,
    username: (row.username as string | null | undefined) ?? null,
    role_id: (row.role_id as string | null | undefined) ?? null,
    role_name: (row.role_name as string | null | undefined) ?? null,
    active: Boolean(row.active ?? false),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function mapRole(row: Record<string, unknown>): UserRole {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: (row.description as string | null | undefined) ?? null,
  }
}

export async function getUsers(params?: {
  activeOnly?: boolean
  roleName?: string
  query?: string
}): Promise<User[]> {
  let request = supabase
    .from("users")
    .select("id, auth_user_id, first_name, last_name, email, phone, username, role_id, active, created_at, updated_at, roles(name)")
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true })

  if (params?.activeOnly === true) {
    request = request.eq("active", true)
  }

  if (params?.roleName) {
    const { data: role } = await supabase
      .from("roles")
      .select("id")
      .eq("name", params.roleName)
      .maybeSingle()

    if (role?.id) {
      request = request.eq("role_id", String(role.id))
    }
  }

  if (params?.query?.trim()) {
    const normalizedQuery = params.query.trim()
    request = request.or(
      [
        `first_name.ilike.%${normalizedQuery}%`,
        `last_name.ilike.%${normalizedQuery}%`,
        `email.ilike.%${normalizedQuery}%`,
        `username.ilike.%${normalizedQuery}%`,
      ].join(",")
    )
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) =>
    mapUser({
      ...row,
      role_name:
        row.roles && typeof row.roles === "object" && row.roles !== null
          ? (row.roles as { name?: string | null }).name ?? null
          : null,
    })
  )
}

export async function getUserRoles(): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, description")
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapRole(row))
}
