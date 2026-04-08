import { supabase } from "@/lib/supabaseClient"
import type {
  NavigationPermissionItem,
  PermissionAction,
  PermissionCondition,
  PermissionFieldCatalogItem,
  PermissionResourceCatalogItem,
  RoleFieldPermissionMatrixRow,
  RoleResourcePermissionMatrixRow,
} from "./models"

const supplementalNavigationItems: NavigationPermissionItem[] = [
  {
    module_code: "master_data",
    module_name: "Master Data",
    module_icon_key: "master_data",
    module_sort_order: 50,
    submodule_code: "master_data.mail",
    submodule_name: "Mail",
    route_path: "/master-data/mail",
    route_matchers: ["/master-data/mail"],
    submodule_sort_order: 35,
  },
]

function mergeSupplementalNavigationItems(items: NavigationPermissionItem[]) {
  const byRoutePath = new Set(
    items
      .map((item) => item.route_path?.trim())
      .filter((value): value is string => Boolean(value))
  )
  const bySubmoduleCode = new Set(items.map((item) => item.submodule_code))
  const merged = [...items]

  supplementalNavigationItems.forEach((item) => {
    if (byRoutePath.has(String(item.route_path)) || bySubmoduleCode.has(item.submodule_code)) {
      return
    }

    merged.push(item)
  })

  return merged
}

function mapNavigationItem(row: Record<string, unknown>): NavigationPermissionItem {
  return {
    module_code: String(row.module_code ?? ""),
    module_name: String(row.module_name ?? ""),
    module_icon_key: (row.module_icon_key as string | null | undefined) ?? null,
    module_sort_order: Number(row.module_sort_order ?? 0),
    submodule_code: String(row.submodule_code ?? ""),
    submodule_name: String(row.submodule_name ?? ""),
    route_path: (row.route_path as string | null | undefined) ?? null,
    route_matchers: Array.isArray(row.route_matchers)
      ? row.route_matchers.map((value) => String(value))
      : [],
    submodule_sort_order: Number(row.submodule_sort_order ?? 0),
  }
}

function mapPermissionAction(row: Record<string, unknown>): PermissionAction {
  return {
    id: String(row.id ?? ""),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    scope_type: String(row.scope_type ?? ""),
    active: Boolean(row.active ?? false),
  }
}

function mapPermissionCondition(row: Record<string, unknown>): PermissionCondition {
  return {
    id: String(row.id ?? ""),
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    description: (row.description as string | null | undefined) ?? null,
  }
}

function mapPermissionResource(row: Record<string, unknown>): PermissionResourceCatalogItem {
  return {
    module_id: String(row.module_id ?? ""),
    module_code: String(row.module_code ?? ""),
    module_name: String(row.module_name ?? ""),
    module_icon_key: (row.module_icon_key as string | null | undefined) ?? null,
    module_sort_order: Number(row.module_sort_order ?? 0),
    module_active: Boolean(row.module_active ?? false),
    submodule_id: (row.submodule_id as string | null | undefined) ?? null,
    submodule_code: (row.submodule_code as string | null | undefined) ?? null,
    submodule_name: (row.submodule_name as string | null | undefined) ?? null,
    route_path: (row.route_path as string | null | undefined) ?? null,
    route_matchers: Array.isArray(row.route_matchers)
      ? row.route_matchers.map((value) => String(value))
      : [],
    submodule_sort_order:
      typeof row.submodule_sort_order === "number"
        ? row.submodule_sort_order
        : row.submodule_sort_order === null || row.submodule_sort_order === undefined
          ? null
          : Number(row.submodule_sort_order),
    submodule_active:
      typeof row.submodule_active === "boolean"
        ? row.submodule_active
        : row.submodule_active === null || row.submodule_active === undefined
          ? null
          : Boolean(row.submodule_active),
    resource_id: String(row.resource_id ?? ""),
    resource_key: String(row.resource_key ?? ""),
    resource_name: String(row.resource_name ?? ""),
    resource_type: String(row.resource_type ?? ""),
    resource_group: (row.resource_group as string | null | undefined) ?? null,
    table_name: (row.table_name as string | null | undefined) ?? null,
    view_name: (row.view_name as string | null | undefined) ?? null,
    rpc_name: (row.rpc_name as string | null | undefined) ?? null,
    entity_owner_field: (row.entity_owner_field as string | null | undefined) ?? null,
    entity_branch_field: (row.entity_branch_field as string | null | undefined) ?? null,
    resource_sort_order: Number(row.resource_sort_order ?? 0),
    resource_active: Boolean(row.resource_active ?? false),
  }
}

function mapPermissionField(row: Record<string, unknown>): PermissionFieldCatalogItem {
  return {
    resource_key: String(row.resource_key ?? ""),
    resource_name: String(row.resource_name ?? ""),
    field_id: String(row.field_id ?? ""),
    resource_id: String(row.resource_id ?? ""),
    field_key: String(row.field_key ?? ""),
    label: String(row.label ?? ""),
    data_type: (row.data_type as string | null | undefined) ?? null,
    field_group: (row.field_group as string | null | undefined) ?? null,
    field_sort_order: Number(row.field_sort_order ?? row.sort_order ?? 0),
    active: Boolean(row.active ?? false),
  }
}

function mapRoleResourcePermission(row: Record<string, unknown>): RoleResourcePermissionMatrixRow {
  return {
    role_id: String(row.role_id ?? ""),
    role_name: String(row.role_name ?? ""),
    module_id: String(row.module_id ?? ""),
    module_code: String(row.module_code ?? ""),
    module_name: String(row.module_name ?? ""),
    module_icon_key: (row.module_icon_key as string | null | undefined) ?? null,
    module_sort_order: Number(row.module_sort_order ?? 0),
    submodule_id: (row.submodule_id as string | null | undefined) ?? null,
    submodule_code: (row.submodule_code as string | null | undefined) ?? null,
    submodule_name: (row.submodule_name as string | null | undefined) ?? null,
    route_path: (row.route_path as string | null | undefined) ?? null,
    route_matchers: Array.isArray(row.route_matchers)
      ? row.route_matchers.map((value) => String(value))
      : [],
    submodule_sort_order:
      typeof row.submodule_sort_order === "number"
        ? row.submodule_sort_order
        : row.submodule_sort_order === null || row.submodule_sort_order === undefined
          ? null
          : Number(row.submodule_sort_order),
    resource_id: String(row.resource_id ?? ""),
    resource_key: String(row.resource_key ?? ""),
    resource_name: String(row.resource_name ?? ""),
    resource_type: String(row.resource_type ?? ""),
    resource_group: (row.resource_group as string | null | undefined) ?? null,
    action_id: String(row.action_id ?? ""),
    action_code: String(row.action_code ?? ""),
    action_name: String(row.action_name ?? ""),
    allowed: Boolean(row.allowed ?? false),
    condition_id: (row.condition_id as string | null | undefined) ?? null,
    condition_code: String(row.condition_code ?? "none"),
    condition_name: String(row.condition_name ?? "None"),
    role_permission_id: (row.role_permission_id as string | null | undefined) ?? null,
  }
}

function mapRoleFieldPermission(row: Record<string, unknown>): RoleFieldPermissionMatrixRow {
  return {
    role_id: String(row.role_id ?? ""),
    role_name: String(row.role_name ?? ""),
    resource_key: String(row.resource_key ?? ""),
    resource_name: String(row.resource_name ?? ""),
    field_id: String(row.field_id ?? ""),
    field_key: String(row.field_key ?? ""),
    field_label: String(row.field_label ?? ""),
    data_type: (row.data_type as string | null | undefined) ?? null,
    field_group: (row.field_group as string | null | undefined) ?? null,
    field_sort_order: Number(row.field_sort_order ?? 0),
    action_id: String(row.action_id ?? ""),
    action_code: String(row.action_code ?? ""),
    action_name: String(row.action_name ?? ""),
    allowed: Boolean(row.allowed ?? false),
    condition_id: (row.condition_id as string | null | undefined) ?? null,
    condition_code: String(row.condition_code ?? "none"),
    condition_name: String(row.condition_name ?? "None"),
    role_field_permission_id: (row.role_field_permission_id as string | null | undefined) ?? null,
  }
}

export async function getCurrentNavigationItems(): Promise<NavigationPermissionItem[]> {
  const { data, error } = await supabase.rpc("get_current_navigation_items")

  if (error) {
    throw error
  }

  return mergeSupplementalNavigationItems(
    ((data ?? []) as Record<string, unknown>[]).map(mapNavigationItem)
  )
}

export async function canCurrentUserAccessRoute(routePath: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("erp_can_access_route", {
    p_route_path: routePath,
    p_action_code: "view",
  })

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function getPermissionActions(): Promise<PermissionAction[]> {
  const { data, error } = await supabase
    .from("permission_actions")
    .select("id, code, name, scope_type, active")
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapPermissionAction)
}

export async function getPermissionConditions(): Promise<PermissionCondition[]> {
  const { data, error } = await supabase
    .from("permission_conditions")
    .select("id, code, name, description")
    .order("name", { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapPermissionCondition)
}

export async function getPermissionResourceCatalog(): Promise<PermissionResourceCatalogItem[]> {
  const { data, error } = await supabase
    .from("permission_resource_catalog_view")
    .select("*")

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapPermissionResource)
}

export async function getPermissionFieldCatalog(): Promise<PermissionFieldCatalogItem[]> {
  const { data, error } = await supabase
    .from("permission_field_catalog_view")
    .select("*")

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapPermissionField)
}

export async function getRoleResourcePermissions(
  roleId: string
): Promise<RoleResourcePermissionMatrixRow[]> {
  const { data, error } = await supabase
    .from("role_resource_permission_matrix_view")
    .select("*")
    .eq("role_id", roleId)

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapRoleResourcePermission)
}

export async function getRoleFieldPermissions(
  roleId: string,
  resourceKey?: string
): Promise<RoleFieldPermissionMatrixRow[]> {
  let query = supabase
    .from("role_field_permission_matrix_view")
    .select("*")
    .eq("role_id", roleId)

  if (resourceKey) {
    query = query.eq("resource_key", resourceKey)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapRoleFieldPermission)
}

export async function upsertRoleResourcePermission(params: {
  roleId: string
  resourceId: string
  actionId: string
  conditionId: string
  allowed: boolean
}) {
  const { error } = await supabase.rpc("upsert_role_resource_permission" as never, {
    p_role_id: params.roleId,
    p_resource_id: params.resourceId,
    p_action_id: params.actionId,
    p_condition_id: params.conditionId,
    p_allowed: params.allowed,
  } as never)

  if (error) {
    throw error
  }
}

export async function upsertRoleFieldPermission(params: {
  roleId: string
  fieldId: string
  actionId: string
  conditionId: string
  allowed: boolean
}) {
  const { error } = await supabase.rpc("upsert_role_field_permission" as never, {
    p_role_id: params.roleId,
    p_field_id: params.fieldId,
    p_action_id: params.actionId,
    p_condition_id: params.conditionId,
    p_allowed: params.allowed,
  } as never)

  if (error) {
    throw error
  }
}
