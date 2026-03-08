import { supabase } from "@/lib/supabaseClient"
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase"
import type { Client } from "./clients"

export type Opportunity = Tables<"opportunities">
export type NewOpportunity = TablesInsert<"opportunities">
export type UpdateOpportunity = TablesUpdate<"opportunities">

export type OpportunityWithClient = Opportunity & {
  clients: Pick<Client, "id" | "name"> | null
}

export async function getOpportunities(): Promise<OpportunityWithClient[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      `
        id,
        client_id,
        title,
        status,
        estimated_value,
        origin,
        destination,
        stage,
        created_at,
        clients (
          id,
          name
        )
      `
    )
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as OpportunityWithClient[]
}

export async function getOpportunitiesByClientId(
  clientId: string
): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as Opportunity[]
}

export async function getOpportunityById(
  id: string
): Promise<OpportunityWithClient | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      `
        id,
        client_id,
        title,
        status,
        estimated_value,
        origin,
        destination,
        stage,
        created_at,
        clients (
          id,
          name
        )
      `
    )
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as OpportunityWithClient | null) ?? null
}

export async function createOpportunity(
  payload: Omit<NewOpportunity, "id" | "created_at">
): Promise<Opportunity> {
  const { data, error } = await supabase
    .from("opportunities")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateOpportunity(
  id: string,
  changes: UpdateOpportunity
): Promise<Opportunity> {
  const { data, error } = await supabase
    .from("opportunities")
    .update(changes)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await supabase.from("opportunities").delete().eq("id", id)

  if (error) {
    throw error
  }
}

