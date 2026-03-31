import { supabase } from "@/lib/supabaseClient"
import { getBackendMode } from "./backendMode"
import { mapContact } from "./mappers"
import { buildRpcPatch } from "./rpcPatch"
import type {
  Contact,
  ContactWithClient,
  NewContact,
  UpdateContact,
} from "./models"

const CONTACT_COLUMNS = "id,client_id,name,email,phone,linkedin_url,position,status,is_primary,created_at,updated_at"
const CONTACT_VIEW_COLUMNS =
  "id,client_id,name,email,phone,linkedin_url,position,status,is_primary,created_at,updated_at,client_name"

function applyContactFilters(
  contacts: ContactWithClient[],
  params?: { query?: string; status?: string }
): ContactWithClient[] {
  const normalizedQuery = params?.query?.trim().toLowerCase() ?? ""
  const normalizedStatus = params?.status?.trim() ?? "all"

  return contacts.filter((contact) => {
    const matchesSearch =
      !normalizedQuery ||
      [
        contact.name,
        contact.email,
        contact.phone,
        contact.position,
        contact.linkedin_url,
        contact.client_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))

    const matchesStatus =
      normalizedStatus === "all" || (contact.status ?? "activo") === normalizedStatus

    return matchesSearch && matchesStatus
  })
}

async function readContactById(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapContact(data as Record<string, unknown>) : null
}

export async function getContacts(params?: {
  query?: string
  status?: string
}): Promise<ContactWithClient[]> {
  await getBackendMode()

  let request = supabase
    .from("client_contacts_view")
    .select(CONTACT_VIEW_COLUMNS)
    .order("name", { ascending: true })

  const normalizedQuery = params?.query?.trim()
  if (normalizedQuery) {
    request = request.or(
      `name.ilike.%${normalizedQuery}%,email.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%,position.ilike.%${normalizedQuery}%,linkedin_url.ilike.%${normalizedQuery}%,client_name.ilike.%${normalizedQuery}%`
    )
  }

  const normalizedStatus = params?.status?.trim()
  if (normalizedStatus && normalizedStatus !== "all") {
    request = request.eq("status", normalizedStatus)
  }

  const { data, error } = await request

  if (error) {
    throw error
  }

  return applyContactFilters((data ?? []) as ContactWithClient[], params)
}

export async function getContactsByClientId(clientId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapContact(row as Record<string, unknown>))
}

export async function getContactById(id: string): Promise<ContactWithClient | null> {
  await getBackendMode()

  const { data, error } = await supabase
    .from("client_contacts_view")
    .select(CONTACT_VIEW_COLUMNS)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as ContactWithClient | null) ?? null
}

export async function createContact(payload: NewContact): Promise<Contact> {
  await getBackendMode()

  const { data, error } = await supabase.rpc("add_contact_to_client", {
    p_client_id: payload.client_id,
    p_name: payload.name,
    p_email: payload.email ?? null,
    p_phone: payload.phone ?? null,
    p_linkedin_url: payload.linkedin_url ?? null,
    p_position: payload.position ?? null,
    p_status: payload.status ?? "activo",
    p_is_primary: payload.is_primary ?? false,
  } as never)

  if (error || !data) {
    throw error ?? new Error("Failed to create contact")
  }

  const contact = await readContactById(String(data))
  if (!contact) {
    throw new Error("Created contact could not be loaded")
  }

  return contact
}

export async function updateContact(id: string, changes: UpdateContact): Promise<Contact> {
  const { data, error } = await supabase.rpc("update_contact_record" as never, {
    p_contact_id: id,
    p_changes: buildRpcPatch(changes),
  } as never)

  if (error || !data) {
    throw error ?? new Error("Contact update is not permitted by the current backend")
  }

  const contact = await readContactById(id)
  if (!contact) {
    throw new Error("Updated contact could not be loaded")
  }

  return contact
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_contact_record" as never, {
    p_contact_id: id,
  } as never)

  if (error) {
    throw error
  }
}
