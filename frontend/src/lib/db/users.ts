import { supabase } from "@/lib/supabaseClient"
import type { User } from "./models"

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    first_name: String(row.first_name ?? ""),
    last_name: String(row.last_name ?? ""),
    email: String(row.email ?? ""),
    active: Boolean(row.active ?? false),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

export async function getUsers(params?: { activeOnly?: boolean }): Promise<User[]> {
  let request = supabase
    .from("users")
    .select("id, first_name, last_name, email, active, created_at, updated_at")
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true })

  if (params?.activeOnly !== false) {
    request = request.eq("active", true)
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => mapUser(row))
}
