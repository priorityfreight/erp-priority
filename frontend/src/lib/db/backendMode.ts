import { supabase } from "@/lib/supabaseClient"

export type BackendMode = "canonical" | "legacy"
export type MasterDataBackendMode = "canonical" | "snapshot"

let backendModePromise: Promise<BackendMode> | null = null
let masterDataBackendModePromise: Promise<MasterDataBackendMode> | null = null

// Temporary rollback safety only. The linked cloud backend is canonical and
// new product behavior must not be designed around legacy or snapshot modes.

export function isMissingSchemaObjectError(error: { message?: string } | null): boolean {
  const message = error?.message?.toLowerCase() ?? ""

  return (
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("could not find the function")
  )
}

async function detectBackendMode(): Promise<BackendMode> {
  const { error } = await supabase.from("client_overview_view").select("id").limit(1)

  if (!error) {
    return "canonical"
  }

  if (isMissingSchemaObjectError(error)) {
    return "legacy"
  }

  throw error
}

export function getBackendMode(): Promise<BackendMode> {
  if (!backendModePromise) {
    backendModePromise = detectBackendMode()
  }

  return backendModePromise
}

async function detectMasterDataBackendMode(): Promise<MasterDataBackendMode> {
  const { error } = await supabase.from("unlocode_lookup_view").select("id").limit(1)

  if (!error) {
    return "canonical"
  }

  if (isMissingSchemaObjectError(error)) {
    return "snapshot"
  }

  throw error
}

export function getMasterDataBackendMode(): Promise<MasterDataBackendMode> {
  if (!masterDataBackendModePromise) {
    masterDataBackendModePromise = detectMasterDataBackendMode()
  }

  return masterDataBackendModePromise
}
