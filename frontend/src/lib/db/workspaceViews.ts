import { getCurrentErpUser } from "@/lib/auth"
import { supabase } from "@/lib/supabaseClient"
import type { Database } from "@/types/supabase"
import type {
  SavedWorkspaceView,
  SavedWorkspaceViewPayload,
  WorkspaceKey,
} from "./models"

type WorkspaceSavedViewInsert =
  Database["public"]["Tables"]["workspace_saved_views"]["Insert"]
type WorkspaceSavedViewUpdate =
  Database["public"]["Tables"]["workspace_saved_views"]["Update"]
type WorkspaceSavedViewJson = WorkspaceSavedViewInsert["filters_json"]
type WorkspaceSavedViewColumnsJson = WorkspaceSavedViewInsert["visible_columns_json"]
const localStoragePrefix = "priority-workspace-saved-views"
const deletedViewsLocalStorageKey = "priority-workspace-saved-views-deleted"
const systemViewPrefix = "__system__:"
const workspaceColumnsPreferenceName = `${systemViewPrefix}columns`

function mapSavedWorkspaceView(row: Record<string, unknown>): SavedWorkspaceView {
  return {
    id: String(row.id),
    workspace_key: String(row.workspace_key) as WorkspaceKey,
    owner_user_id: String(row.owner_user_id),
    name: String(row.name ?? ""),
    search_query: (row.search_query as string | null | undefined) ?? null,
    status_lane: (row.status_lane as SavedWorkspaceView["status_lane"]) ?? null,
    filters_json:
      row.filters_json && typeof row.filters_json === "object" && !Array.isArray(row.filters_json)
        ? (row.filters_json as Record<string, unknown>)
        : {},
    sort_json:
      row.sort_json && typeof row.sort_json === "object" && !Array.isArray(row.sort_json)
        ? (row.sort_json as Record<string, unknown>)
        : {},
    visible_columns_json: Array.isArray(row.visible_columns_json)
      ? row.visible_columns_json.map((value) => String(value))
      : [],
    is_default: Boolean(row.is_default ?? false),
    created_at: String(row.created_at ?? new Date(0).toISOString()),
    updated_at: (row.updated_at as string | null | undefined) ?? null,
  }
}

function isSystemWorkspaceViewName(name: string | null | undefined) {
  return Boolean(name && name.startsWith(systemViewPrefix))
}

async function requireCurrentErpUserId() {
  const currentUser = await getCurrentErpUser()

  if (!currentUser?.id) {
    throw new Error("No se pudo resolver el usuario ERP actual")
  }

  return currentUser.id
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function getLocalStorageKey(ownerUserId: string, workspaceKey: WorkspaceKey) {
  return `${localStoragePrefix}:${ownerUserId}:${workspaceKey}`
}

function getWorkspaceColumnPresetKey(ownerUserId: string, workspaceKey: WorkspaceKey) {
  return `${localStoragePrefix}:columns:${ownerUserId}:${workspaceKey}`
}

function readLocalWorkspaceViews(ownerUserId: string, workspaceKey: WorkspaceKey): SavedWorkspaceView[] {
  if (!canUseLocalStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(ownerUserId, workspaceKey))
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && typeof item === "object")
          .map((item) => mapSavedWorkspaceView(item as Record<string, unknown>))
      : []
  } catch {
    return []
  }
}

function writeLocalWorkspaceViews(
  ownerUserId: string,
  workspaceKey: WorkspaceKey,
  views: SavedWorkspaceView[]
) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(getLocalStorageKey(ownerUserId, workspaceKey), JSON.stringify(views))
}

function readWorkspaceColumnPreset(ownerUserId: string, workspaceKey: WorkspaceKey): string[] | null {
  if (!canUseLocalStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getWorkspaceColumnPresetKey(ownerUserId, workspaceKey))
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : null
  } catch {
    return null
  }
}

function writeWorkspaceColumnPreset(ownerUserId: string, workspaceKey: WorkspaceKey, visibleColumns: string[]) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(
    getWorkspaceColumnPresetKey(ownerUserId, workspaceKey),
    JSON.stringify(visibleColumns)
  )
}

function readDeletedWorkspaceViewIds() {
  if (!canUseLocalStorage()) {
    return new Set<string>()
  }

  try {
    const raw = window.localStorage.getItem(deletedViewsLocalStorageKey)
    if (!raw) {
      return new Set<string>()
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set<string>()
    }

    return new Set(parsed.map((value) => String(value)))
  } catch {
    return new Set<string>()
  }
}

function writeDeletedWorkspaceViewIds(ids: Set<string>) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(deletedViewsLocalStorageKey, JSON.stringify([...ids]))
}

function removeDeletedWorkspaceViewIds(ids: string[]) {
  const deletedIds = readDeletedWorkspaceViewIds()
  let changed = false

  ids.forEach((id) => {
    if (deletedIds.delete(id)) {
      changed = true
    }
  })

  if (changed) {
    writeDeletedWorkspaceViewIds(deletedIds)
  }
}

function addDeletedWorkspaceViewId(id: string) {
  const deletedIds = readDeletedWorkspaceViewIds()
  deletedIds.add(id)
  writeDeletedWorkspaceViewIds(deletedIds)
}

async function getCurrentWorkspaceOwnerId() {
  try {
    return await requireCurrentErpUserId()
  } catch {
    return "local-workspace-user"
  }
}

export async function getWorkspaceViews(workspaceKey: WorkspaceKey): Promise<SavedWorkspaceView[]> {
  const ownerUserId = await getCurrentWorkspaceOwnerId()
  const deletedIds = readDeletedWorkspaceViewIds()

  try {
    const { data, error } = await supabase
      .from("workspace_saved_views")
      .select("*")
      .eq("workspace_key", workspaceKey)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })

    if (error) {
      throw error
    }

    return ((data ?? []) as Record<string, unknown>[])
      .map((row) => mapSavedWorkspaceView(row))
      .filter((view) => !isSystemWorkspaceViewName(view.name))
      .filter((view) => !deletedIds.has(view.id))
  } catch {
    const localViews = readLocalWorkspaceViews(ownerUserId, workspaceKey)
    return localViews
      .filter((view) => !isSystemWorkspaceViewName(view.name))
      .filter((view) => !deletedIds.has(view.id))
  }
}

export async function getWorkspaceColumnPreference(
  workspaceKey: WorkspaceKey
): Promise<string[] | null> {
  const ownerUserId = await getCurrentWorkspaceOwnerId()

  try {
    const { data, error } = await supabase
      .from("workspace_saved_views")
      .select("*")
      .eq("workspace_key", workspaceKey)
      .eq("name", workspaceColumnsPreferenceName)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return readWorkspaceColumnPreset(ownerUserId, workspaceKey)
    }

    const view = mapSavedWorkspaceView(data as Record<string, unknown>)
    const columns = view.visible_columns_json.filter(Boolean)
    writeWorkspaceColumnPreset(ownerUserId, workspaceKey, columns)
    return columns.length > 0 ? columns : null
  } catch {
    return readWorkspaceColumnPreset(ownerUserId, workspaceKey)
  }
}

export async function setWorkspaceColumnPreference(
  workspaceKey: WorkspaceKey,
  visibleColumns: string[]
): Promise<void> {
  const ownerUserId = await getCurrentWorkspaceOwnerId()
  const normalizedColumns = visibleColumns.map((value) => String(value)).filter(Boolean)

  writeWorkspaceColumnPreset(ownerUserId, workspaceKey, normalizedColumns)

  const payload: WorkspaceSavedViewInsert = {
    owner_user_id: ownerUserId,
    workspace_key: workspaceKey,
    name: workspaceColumnsPreferenceName,
    search_query: null,
    status_lane: null,
    filters_json: {} as WorkspaceSavedViewJson,
    sort_json: {} as WorkspaceSavedViewJson,
    visible_columns_json: normalizedColumns as WorkspaceSavedViewColumnsJson,
    is_default: false,
  }

  try {
    const { data, error } = await supabase
      .from("workspace_saved_views")
      .select("id")
      .eq("workspace_key", workspaceKey)
      .eq("name", workspaceColumnsPreferenceName)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data?.id) {
      const { error: updateError } = await supabase
        .from("workspace_saved_views")
        .update({
          visible_columns_json: normalizedColumns as WorkspaceSavedViewColumnsJson,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)

      if (updateError) {
        throw updateError
      }

      return
    }

    const { error: insertError } = await supabase.from("workspace_saved_views").insert(payload)

    if (insertError) {
      throw insertError
    }
  } catch {
    return
  }
}

export async function createWorkspaceView(
  payload: SavedWorkspaceViewPayload
): Promise<SavedWorkspaceView> {
  if (isSystemWorkspaceViewName(payload.name)) {
    throw new Error("El nombre de la vista no está disponible")
  }

  const ownerUserId = await getCurrentWorkspaceOwnerId()
  const insertPayload: WorkspaceSavedViewInsert = {
    owner_user_id: ownerUserId,
    workspace_key: payload.workspace_key,
    name: payload.name.trim(),
    search_query: payload.search_query?.trim() || null,
    status_lane: payload.status_lane ?? null,
    filters_json: (payload.filters_json ?? {}) as WorkspaceSavedViewJson,
    sort_json: (payload.sort_json ?? {}) as WorkspaceSavedViewJson,
    visible_columns_json:
      (payload.visible_columns_json ?? []) as WorkspaceSavedViewColumnsJson,
    is_default: false,
  }

  try {
    const { data, error } = await supabase
      .from("workspace_saved_views")
      .insert(insertPayload)
      .select("*")
      .single()

    if (error) {
      throw error
    }

    const createdView = mapSavedWorkspaceView(data as Record<string, unknown>)
    removeDeletedWorkspaceViewIds([createdView.id])

    if (payload.is_default) {
      await setDefaultWorkspaceView(createdView.id, payload.workspace_key)
      return {
        ...createdView,
        is_default: true,
      }
    }

    return createdView
  } catch {
    const fallbackOwnerUserId = ownerUserId || (await getCurrentWorkspaceOwnerId())
    const currentViews = readLocalWorkspaceViews(fallbackOwnerUserId, payload.workspace_key)
    const createdView: SavedWorkspaceView = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      owner_user_id: fallbackOwnerUserId,
      workspace_key: payload.workspace_key,
      name: payload.name.trim(),
      search_query: payload.search_query?.trim() || null,
      status_lane: payload.status_lane ?? null,
      filters_json: payload.filters_json ?? {},
      sort_json: payload.sort_json ?? {},
      visible_columns_json: payload.visible_columns_json ?? [],
      is_default: Boolean(payload.is_default),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const normalizedViews = payload.is_default
      ? currentViews.map((view) => ({ ...view, is_default: false }))
      : currentViews

    writeLocalWorkspaceViews(fallbackOwnerUserId, payload.workspace_key, [...normalizedViews, createdView])
    removeDeletedWorkspaceViewIds([createdView.id])
    return createdView
  }
}

export async function updateWorkspaceView(
  id: string,
  payload: Partial<SavedWorkspaceViewPayload>
): Promise<SavedWorkspaceView> {
  const changes: WorkspaceSavedViewUpdate = {}

  if (payload.name !== undefined) {
    if (isSystemWorkspaceViewName(payload.name)) {
      throw new Error("El nombre de la vista no está disponible")
    }
    changes.name = payload.name.trim()
  }

  if (payload.search_query !== undefined) {
    changes.search_query = payload.search_query?.trim() || null
  }

  if (payload.status_lane !== undefined) {
    changes.status_lane = payload.status_lane ?? null
  }

  if (payload.filters_json !== undefined) {
    changes.filters_json = payload.filters_json as WorkspaceSavedViewJson
  }

  if (payload.sort_json !== undefined) {
    changes.sort_json = payload.sort_json as WorkspaceSavedViewJson
  }

  if (payload.visible_columns_json !== undefined) {
    changes.visible_columns_json =
      payload.visible_columns_json as WorkspaceSavedViewColumnsJson
  }

  try {
    if (Object.keys(changes).length > 0) {
      const { error } = await supabase
        .from("workspace_saved_views")
        .update(changes)
        .eq("id", id)

      if (error) {
        throw error
      }
    }

    if (payload.is_default && payload.workspace_key) {
      await setDefaultWorkspaceView(id, payload.workspace_key)
    }

    const { data, error } = await supabase
      .from("workspace_saved_views")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      throw error
    }

    const updatedView = mapSavedWorkspaceView(data as Record<string, unknown>)
    removeDeletedWorkspaceViewIds([updatedView.id])
    return updatedView
  } catch {
    const workspaceKey = payload.workspace_key
    if (!workspaceKey) {
      throw new Error("workspace_key es requerido para actualizar vistas en modo local")
    }

    const ownerUserId = await getCurrentWorkspaceOwnerId()
    const currentViews = readLocalWorkspaceViews(ownerUserId, workspaceKey)
    const nextViews = currentViews.map((view) => {
      if (view.id !== id) {
        return payload.is_default ? { ...view, is_default: false } : view
      }

      return {
        ...view,
        name: payload.name !== undefined ? payload.name.trim() : view.name,
        search_query:
          payload.search_query !== undefined ? payload.search_query?.trim() || null : view.search_query,
        status_lane: payload.status_lane !== undefined ? payload.status_lane ?? null : view.status_lane,
        filters_json: payload.filters_json !== undefined ? payload.filters_json : view.filters_json,
        sort_json: payload.sort_json !== undefined ? payload.sort_json : view.sort_json,
        visible_columns_json:
          payload.visible_columns_json !== undefined
            ? payload.visible_columns_json
            : view.visible_columns_json,
        is_default: payload.is_default !== undefined ? payload.is_default : view.is_default,
        updated_at: new Date().toISOString(),
      }
    })

    writeLocalWorkspaceViews(ownerUserId, workspaceKey, nextViews)
    const updatedView = nextViews.find((view) => view.id === id)
    if (!updatedView) {
      throw new Error("No se pudo actualizar la vista local")
    }
    removeDeletedWorkspaceViewIds([updatedView.id])
    return updatedView
  }
}

export async function deleteWorkspaceView(id: string): Promise<void> {
  const ownerUserId = await getCurrentWorkspaceOwnerId()
  addDeletedWorkspaceViewId(id)

  try {
    const { error } = await supabase
      .from("workspace_saved_views")
      .delete()
      .eq("id", id)

    if (error) {
      throw error
    }
  } catch {
    if (!canUseLocalStorage()) {
      throw new Error("No se pudo eliminar la vista guardada")
    }
  }

  if (!canUseLocalStorage()) {
    return
  }

  const keys = Object.keys(window.localStorage).filter((key) =>
    key.startsWith(`${localStoragePrefix}:${ownerUserId}:`)
  )

  for (const key of keys) {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      continue
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      continue
    }

    const filtered = parsed.filter(
      (view) => view && typeof view === "object" && String((view as { id?: string }).id) !== id
    )
    window.localStorage.setItem(key, JSON.stringify(filtered))
  }
}

export async function setDefaultWorkspaceView(
  id: string,
  workspaceKey: WorkspaceKey
): Promise<void> {
  const ownerUserId = await getCurrentWorkspaceOwnerId()
  removeDeletedWorkspaceViewIds([id])

  try {
    const { error } = await supabase.rpc("set_workspace_saved_view_default", {
      p_workspace_view_id: id,
      p_workspace_key: workspaceKey,
    } as never)

    if (error) {
      throw error
    }
  } catch {
    const currentViews = readLocalWorkspaceViews(ownerUserId, workspaceKey)
    writeLocalWorkspaceViews(
      ownerUserId,
      workspaceKey,
      currentViews.map((view) => ({
        ...view,
        is_default: view.id === id,
        updated_at: new Date().toISOString(),
      }))
    )
  }
}
