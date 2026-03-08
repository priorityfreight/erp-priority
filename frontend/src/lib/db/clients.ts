import { supabase } from "@/lib/supabaseClient"
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase"

export type Client = Tables<"clients">
export type NewClient = TablesInsert<"clients">
export type UpdateClient = TablesUpdate<"clients">

export async function searchClients(query: string): Promise<Client[]> {
  const normalized = query.trim()

  if (!normalized) {
    return getClients()
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, industry, country, created_at")
    .ilike("name", `%${normalized}%`)
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, industry, country, created_at")
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? null
}

export async function createClient(
  payload: Omit<NewClient, "id" | "created_at">
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateClient(
  id: string,
  changes: UpdateClient
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .update(changes)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id)

  if (error) {
    throw error
  }
}

