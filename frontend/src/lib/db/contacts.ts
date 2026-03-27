import { supabase } from "@/lib/supabaseClient"
import { getBackendMode } from "./backendMode"
import { mapContact } from "./mappers"
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

export async function getContacts(params?: {
  query?: string
  status?: string
}): Promise<ContactWithClient[]> {
  const mode = await getBackendMode()

  if (mode === "canonical") {
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

    return (data ?? []) as ContactWithClient[]
  }

  const [contactsResult, clientsResult] = await Promise.all([
    supabase.from("contacts").select("*").order("name", { ascending: true }),
    supabase.from("clients").select("id,company_name"),
  ])

  if (contactsResult.error) {
    throw contactsResult.error
  }

  if (clientsResult.error) {
    throw clientsResult.error
  }

  const clientRows = ((clientsResult.data ?? []) as unknown) as Array<{
    id: string
    company_name: string | null
  }>
  const contactRows = ((contactsResult.data ?? []) as unknown) as Record<string, unknown>[]

  const clientNames = new Map(
    clientRows.map((client) => [String(client.id), String(client.company_name ?? "")])
  )

  return applyContactFilters(contactRows.map((row) => ({
    ...mapContact(row),
    client_name: clientNames.get(String(row.client_id)) ?? null,
  })), params)
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
  const mode = await getBackendMode()

  if (mode === "canonical") {
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

  const { data, error } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const contactRow = (data as unknown) as Record<string, unknown>

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id,company_name")
    .eq("id", String(contactRow.client_id))
    .maybeSingle()

  if (clientError) {
    throw clientError
  }

  const clientRow = client
    ? ((client as unknown) as { id: string; company_name: string | null })
    : null

  return {
    ...mapContact(contactRow),
    client_name: clientRow?.company_name ?? null,
  }
}

export async function createContact(payload: NewContact): Promise<Contact> {
  const mode = await getBackendMode()

  if (mode === "canonical") {
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

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select(CONTACT_COLUMNS)
      .eq("id", data)
      .single()

    if (contactError) {
      throw contactError
    }

    return mapContact(contact as Record<string, unknown>)
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      client_id: payload.client_id,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      linkedin_url: payload.linkedin_url ?? null,
      position: payload.position ?? null,
      status: payload.status ?? "activo",
    } as never)
    .select(CONTACT_COLUMNS)
    .single()

  if (error) {
    throw error
  }

  return mapContact(data as Record<string, unknown>)
}

export async function updateContact(id: string, changes: UpdateContact): Promise<Contact> {
  const { data: updatedRow, error } = await supabase
    .from("contacts")
    .update(changes as never)
    .eq("id", id)
    .select("id")
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!updatedRow) {
    throw new Error("Contact update is not permitted by the current backend")
  }

  const { data, error: readError } = await supabase
    .from("contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", id)
    .maybeSingle()

  if (readError) {
    throw readError
  }

  if (!data) {
    throw new Error("Updated contact could not be loaded")
  }

  return mapContact((data as unknown) as Record<string, unknown>)
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from("contacts").delete().eq("id", id)

  if (error) {
    throw error
  }
}
