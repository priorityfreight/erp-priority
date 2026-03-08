import { supabase } from "@/lib/supabaseClient"
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase"
import type { Client } from "./clients"

export type Contact = Tables<"contacts">
export type NewContact = TablesInsert<"contacts">
export type UpdateContact = TablesUpdate<"contacts">

export type ContactWithClient = Contact & {
  clients: Pick<Client, "id" | "name"> | null
}

export async function getContacts(): Promise<ContactWithClient[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select(
      `
        id,
        client_id,
        name,
        email,
        phone,
        position,
        created_at,
        clients (
          id,
          name
        )
      `
    )
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ContactWithClient[]
}

export async function getContactsByClientId(
  clientId: string
): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as Contact[]
}

export async function getContactById(id: string): Promise<ContactWithClient | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select(
      `
        id,
        client_id,
        name,
        email,
        phone,
        position,
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

  return (data as ContactWithClient | null) ?? null
}

export async function createContact(
  payload: Omit<NewContact, "id" | "created_at">
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateContact(
  id: string,
  changes: UpdateContact
): Promise<Contact> {
  const { data, error } = await supabase
    .from("contacts")
    .update(changes)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from("contacts").delete().eq("id", id)

  if (error) {
    throw error
  }
}

