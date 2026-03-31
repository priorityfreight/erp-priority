import type {
  PermissionCondition,
  PermissionFieldCatalogItem,
  PermissionResourceCatalogItem,
  RoleFieldPermissionMatrixRow,
  RoleResourcePermissionMatrixRow,
} from "@/lib/db"

export const coreActions = ["view", "create", "edit", "delete"] as const

export function makeResourceKey(
  row: Pick<RoleResourcePermissionMatrixRow, "resource_id" | "action_id">
) {
  return `${row.resource_id}:${row.action_id}`
}

export function makeFieldKey(row: Pick<RoleFieldPermissionMatrixRow, "field_id" | "action_id">) {
  return `${row.field_id}:${row.action_id}`
}

export function resourceGroupLabel(resourceType: string) {
  if (resourceType === "submodule") return "Submodule"
  if (resourceType === "module") return "Module"
  return "Resource"
}

export type SubmoduleTreeEntry = {
  moduleCode: string
  moduleName: string
  moduleSortOrder: number
  items: Array<{
    code: string
    name: string
    sortOrder: number
    active: boolean | null
  }>
}

export type ResourceMatrixRow = {
  resource: PermissionResourceCatalogItem
  actionMap: Map<string, RoleResourcePermissionMatrixRow>
  allowedActionCount: number
  primaryScopePermission: RoleResourcePermissionMatrixRow | null
}

export type FieldMatrixRow = {
  field: PermissionFieldCatalogItem
  permissions: RoleFieldPermissionMatrixRow[]
}

export function buildConditionMap(conditions: PermissionCondition[]) {
  return new Map(conditions.map((condition) => [condition.code, condition]))
}

export function buildSubmoduleTree(resources: PermissionResourceCatalogItem[]): SubmoduleTreeEntry[] {
  const modules = new Map<string, SubmoduleTreeEntry>()

  resources.forEach((resource) => {
    if (!resource.submodule_code || !resource.submodule_name) {
      return
    }

    const moduleEntry = modules.get(resource.module_code) ?? {
      moduleCode: resource.module_code,
      moduleName: resource.module_name,
      moduleSortOrder: resource.module_sort_order,
      items: [],
    }

    if (!moduleEntry.items.some((item) => item.code === resource.submodule_code)) {
      moduleEntry.items.push({
        code: resource.submodule_code,
        name: resource.submodule_name,
        sortOrder: resource.submodule_sort_order ?? 0,
        active: resource.submodule_active,
      })
    }

    modules.set(resource.module_code, moduleEntry)
  })

  return Array.from(modules.values())
    .sort((left, right) => left.moduleSortOrder - right.moduleSortOrder)
    .map((moduleEntry) => ({
      ...moduleEntry,
      items: moduleEntry.items.sort((left, right) => left.sortOrder - right.sortOrder),
    }))
}

export function buildResourceMatrixRows(
  resources: PermissionResourceCatalogItem[],
  draftResourcePermissions: RoleResourcePermissionMatrixRow[],
  selectedSubmoduleCode: string | null
): ResourceMatrixRow[] {
  if (!selectedSubmoduleCode) {
    return []
  }

  const scopedResources = resources
    .filter((resource) => resource.submodule_code === selectedSubmoduleCode)
    .sort((left, right) => left.resource_sort_order - right.resource_sort_order)

  return scopedResources.map((resource) => {
    const actionsForResource = draftResourcePermissions.filter(
      (permission) => permission.resource_key === resource.resource_key
    )

    const actionMap = new Map(actionsForResource.map((permission) => [permission.action_code, permission]))
    const allowedActionCount = Array.from(actionMap.values()).filter((permission) => permission.allowed).length

    const primaryScopePermission =
      actionMap.get("view") ||
      Array.from(actionMap.values()).find((permission) => permission.allowed) ||
      actionsForResource[0] ||
      null

    return {
      resource,
      actionMap,
      allowedActionCount,
      primaryScopePermission,
    }
  })
}

export function buildFieldMatrixRows(
  fields: PermissionFieldCatalogItem[],
  draftFieldPermissions: RoleFieldPermissionMatrixRow[],
  selectedResourceKey: string | null
): FieldMatrixRow[] {
  if (!selectedResourceKey) {
    return []
  }

  const fieldsForResource = fields
    .filter((field) => field.resource_key === selectedResourceKey)
    .sort((left, right) => left.field_sort_order - right.field_sort_order)

  return fieldsForResource.map((field) => ({
    field,
    permissions: draftFieldPermissions.filter(
      (permission) =>
        permission.resource_key === selectedResourceKey && permission.field_id === field.field_id
    ),
  }))
}

export function buildDirtyResourcePermissions(
  loadedResourcePermissions: RoleResourcePermissionMatrixRow[],
  draftResourcePermissions: RoleResourcePermissionMatrixRow[]
) {
  const loadedMap = new Map(
    loadedResourcePermissions.map((permission) => [makeResourceKey(permission), permission])
  )

  return draftResourcePermissions.filter((permission) => {
    const original = loadedMap.get(makeResourceKey(permission))
    return (
      !original ||
      original.allowed !== permission.allowed ||
      original.condition_id !== permission.condition_id
    )
  })
}

export function buildDirtyFieldPermissions(
  loadedFieldPermissions: RoleFieldPermissionMatrixRow[],
  draftFieldPermissions: RoleFieldPermissionMatrixRow[]
) {
  const loadedMap = new Map(
    loadedFieldPermissions.map((permission) => [makeFieldKey(permission), permission])
  )

  return draftFieldPermissions.filter((permission) => {
    const original = loadedMap.get(makeFieldKey(permission))
    return (
      !original ||
      original.allowed !== permission.allowed ||
      original.condition_id !== permission.condition_id
    )
  })
}

export function applyPermissionToggle<
  T extends {
    condition_id: string | null
    condition_code: string
    condition_name: string
    allowed: boolean
  },
>(
  permission: T,
  checked: boolean,
  conditionByCode: Map<string, PermissionCondition>,
  defaultNoneConditionId: string
): T {
  return {
    ...permission,
    allowed: checked,
    condition_id: checked
      ? permission.condition_id || conditionByCode.get("all")?.id || permission.condition_id
      : defaultNoneConditionId || permission.condition_id,
    condition_code: checked
      ? permission.condition_code === "none"
        ? "all"
        : permission.condition_code
      : "none",
    condition_name: checked
      ? permission.condition_code === "none"
        ? "All"
        : permission.condition_name
      : "None",
  }
}

export function applyPermissionScope<
  T extends {
    condition_id: string | null
    condition_code: string
    condition_name: string
    allowed: boolean
  },
>(permission: T, condition: PermissionCondition): T {
  return {
    ...permission,
    allowed: condition.code !== "none",
    condition_id: condition.id,
    condition_code: condition.code,
    condition_name: condition.name,
  }
}

export function groupFieldRowsByGroup(fieldRows: FieldMatrixRow[]) {
  return Object.entries(
    fieldRows.reduce<Record<string, FieldMatrixRow[]>>((groups, row) => {
      const groupKey = row.field.field_group || "General"
      groups[groupKey] = groups[groupKey] ?? []
      groups[groupKey].push(row)
      return groups
    }, {})
  )
}

export function upsertResourcePermissionDraft(
  current: RoleResourcePermissionMatrixRow[],
  nextRow: RoleResourcePermissionMatrixRow
) {
  const draftKey = makeResourceKey(nextRow)
  return current.some((row) => makeResourceKey(row) === draftKey)
    ? current.map((row) => (makeResourceKey(row) === draftKey ? nextRow : row))
    : [...current, nextRow]
}

export function upsertFieldPermissionDraft(
  current: RoleFieldPermissionMatrixRow[],
  nextRow: RoleFieldPermissionMatrixRow
) {
  const draftKey = makeFieldKey(nextRow)
  return current.some((row) => makeFieldKey(row) === draftKey)
    ? current.map((row) => (makeFieldKey(row) === draftKey ? nextRow : row))
    : [...current, nextRow]
}
