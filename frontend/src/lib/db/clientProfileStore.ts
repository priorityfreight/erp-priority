import type { Client } from "./models"

type ClientProfileOverlay = {
  website?: string | null
  corporate_phone?: string | null
  status?: string | null
  full_address?: string | null
  postal_code?: string | null
  city?: string | null
  city_unlocode?: string | null
}

const STORAGE_KEY = "priority_erp_client_profiles"

// Temporary rollback safety only for non-canonical environments.
// Canonical client fields must persist in Supabase, not in browser storage.

function readStore(): Record<string, ClientProfileOverlay> {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, ClientProfileOverlay>) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function normalize(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getClientProfileOverlay(clientId: string): ClientProfileOverlay {
  const store = readStore()
  return store[clientId] ?? {}
}

export function saveClientProfileOverlay(clientId: string, changes: ClientProfileOverlay) {
  const store = readStore()
  const current = store[clientId] ?? {}

  store[clientId] = {
    ...current,
    ...(changes.website !== undefined ? { website: normalize(changes.website) } : {}),
    ...(changes.corporate_phone !== undefined
      ? { corporate_phone: normalize(changes.corporate_phone) }
      : {}),
    ...(changes.status !== undefined ? { status: normalize(changes.status) } : {}),
    ...(changes.full_address !== undefined
      ? { full_address: normalize(changes.full_address) }
      : {}),
    ...(changes.postal_code !== undefined ? { postal_code: normalize(changes.postal_code) } : {}),
    ...(changes.city !== undefined ? { city: normalize(changes.city) } : {}),
    ...(changes.city_unlocode !== undefined
      ? { city_unlocode: normalize(changes.city_unlocode) }
      : {}),
  }

  writeStore(store)
}

export function removeClientProfileOverlay(clientId: string) {
  const store = readStore()
  delete store[clientId]
  writeStore(store)
}

export function applyClientProfileOverlay(client: Client): Client {
  const overlay = getClientProfileOverlay(client.id)

  return {
    ...client,
    website: overlay.website ?? client.website,
    corporate_phone: overlay.corporate_phone ?? client.corporate_phone,
    status: overlay.status ?? client.status,
    full_address: overlay.full_address ?? client.full_address,
    postal_code: overlay.postal_code ?? client.postal_code,
    city: overlay.city ?? client.city,
    city_unlocode: overlay.city_unlocode ?? client.city_unlocode,
  }
}
