import { supabase } from "@/lib/supabaseClient"

export type BackendMode = "canonical"
export type MasterDataBackendMode = "canonical"

let backendModePromise: Promise<BackendMode> | null = null
let masterDataBackendModePromise: Promise<MasterDataBackendMode> | null = null

function buildMissingCanonicalBackendError(objectName: string, context: string) {
  return new Error(
    `Canonical backend object "${objectName}" is not available for ${context}. ` +
      "This ERP now runs in canonical-only mode; restore the linked canonical schema before continuing."
  )
}

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
    throw buildMissingCanonicalBackendError("client_overview_view", "CRM reads and writes")
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
    throw buildMissingCanonicalBackendError("unlocode_lookup_view", "master data lookups")
  }

  throw error
}

export function getMasterDataBackendMode(): Promise<MasterDataBackendMode> {
  if (!masterDataBackendModePromise) {
    masterDataBackendModePromise = detectMasterDataBackendMode()
  }

  return masterDataBackendModePromise
}
