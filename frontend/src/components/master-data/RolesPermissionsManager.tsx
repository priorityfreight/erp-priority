"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Modal } from "@/components/data/Modal"
import {
  getPermissionActions,
  getPermissionConditions,
  getPermissionFieldCatalog,
  getPermissionResourceCatalog,
  getRoleFieldPermissions,
  getRoleResourcePermissions,
  getUserRoles,
  type PermissionAction,
  type PermissionCondition,
  type PermissionFieldCatalogItem,
  type PermissionResourceCatalogItem,
  type RoleFieldPermissionMatrixRow,
  type RoleResourcePermissionMatrixRow,
  type UserRole,
  upsertRoleFieldPermission,
  upsertRoleResourcePermission,
} from "@/lib/db"

const coreActions = ["view", "create", "edit", "delete"] as const

function makeResourceKey(row: Pick<RoleResourcePermissionMatrixRow, "resource_id" | "action_id">) {
  return `${row.resource_id}:${row.action_id}`
}

function makeFieldKey(row: Pick<RoleFieldPermissionMatrixRow, "field_id" | "action_id">) {
  return `${row.field_id}:${row.action_id}`
}

function resourceGroupLabel(resourceType: string) {
  if (resourceType === "submodule") return "Submodule"
  if (resourceType === "module") return "Module"
  return "Resource"
}

type RolesPermissionsManagerProps = {
  currentUserEmail: string
}

export function RolesPermissionsManager({ currentUserEmail }: RolesPermissionsManagerProps) {
  const [roles, setRoles] = useState<UserRole[]>([])
  const [actions, setActions] = useState<PermissionAction[]>([])
  const [conditions, setConditions] = useState<PermissionCondition[]>([])
  const [resources, setResources] = useState<PermissionResourceCatalogItem[]>([])
  const [fields, setFields] = useState<PermissionFieldCatalogItem[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [selectedSubmoduleCode, setSelectedSubmoduleCode] = useState<string | null>(null)
  const [selectedResourceKey, setSelectedResourceKey] = useState<string | null>(null)
  const [loadedResourcePermissions, setLoadedResourcePermissions] = useState<RoleResourcePermissionMatrixRow[]>([])
  const [draftResourcePermissions, setDraftResourcePermissions] = useState<RoleResourcePermissionMatrixRow[]>([])
  const [loadedFieldPermissions, setLoadedFieldPermissions] = useState<RoleFieldPermissionMatrixRow[]>([])
  const [draftFieldPermissions, setDraftFieldPermissions] = useState<RoleFieldPermissionMatrixRow[]>([])
  const [duplicateSourceRoleId, setDuplicateSourceRoleId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCloneModal, setShowCloneModal] = useState(false)

  const conditionByCode = useMemo(
    () => new Map(conditions.map((condition) => [condition.code, condition])),
    [conditions]
  )
  const defaultNoneConditionId = conditionByCode.get("none")?.id ?? ""

  const fieldActionCodes = useMemo(
    () => actions.filter((action) => action.scope_type === "both" || action.scope_type === "field").map((action) => action.code),
    [actions]
  )

  const loadStaticCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [roleRows, actionRows, conditionRows, resourceRows, fieldRows] = await Promise.all([
        getUserRoles(),
        getPermissionActions(),
        getPermissionConditions(),
        getPermissionResourceCatalog(),
        getPermissionFieldCatalog(),
      ])

      setRoles(roleRows)
      setActions(actionRows)
      setConditions(conditionRows)
      setResources(resourceRows)
      setFields(fieldRows)

      if (!selectedRoleId && roleRows[0]?.id) {
        setSelectedRoleId(roleRows[0].id)
      }
    } catch (loadError) {
      console.error(loadError)
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el catalogo de permisos.")
    } finally {
      setLoading(false)
    }
  }, [selectedRoleId])

  const loadRoleMatrix = useCallback(async (roleId: string) => {
    if (!roleId) {
      return
    }

    setError(null)

    try {
      const [resourceRows, fieldRows] = await Promise.all([
        getRoleResourcePermissions(roleId),
        getRoleFieldPermissions(roleId),
      ])

      setLoadedResourcePermissions(resourceRows)
      setDraftResourcePermissions(resourceRows)
      setLoadedFieldPermissions(fieldRows)
      setDraftFieldPermissions(fieldRows)
    } catch (loadError) {
      console.error(loadError)
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la matriz del rol.")
    }
  }, [])

  useEffect(() => {
    void loadStaticCatalog()
  }, [loadStaticCatalog])

  useEffect(() => {
    if (!selectedRoleId) {
      return
    }

    void loadRoleMatrix(selectedRoleId)
  }, [loadRoleMatrix, selectedRoleId])

  const submoduleTree = useMemo(() => {
    const modules = new Map<
      string,
      {
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
    >()

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
  }, [resources])

  useEffect(() => {
    if (selectedSubmoduleCode) {
      return
    }

    const firstSubmodule = submoduleTree.flatMap((moduleEntry) => moduleEntry.items)[0]
    if (firstSubmodule) {
      setSelectedSubmoduleCode(firstSubmodule.code)
    }
  }, [selectedSubmoduleCode, submoduleTree])

  const matrixRows = useMemo(() => {
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
  }, [draftResourcePermissions, resources, selectedSubmoduleCode])

  useEffect(() => {
    if (selectedResourceKey && matrixRows.some((row) => row.resource.resource_key === selectedResourceKey)) {
      return
    }

    setSelectedResourceKey(matrixRows[0]?.resource.resource_key ?? null)
  }, [matrixRows, selectedResourceKey])

  const selectedResource = useMemo(
    () => matrixRows.find((row) => row.resource.resource_key === selectedResourceKey) ?? null,
    [matrixRows, selectedResourceKey]
  )

  const fieldRows = useMemo(() => {
    if (!selectedResourceKey) {
      return []
    }

    const fieldsForResource = fields
      .filter((field) => field.resource_key === selectedResourceKey)
      .sort((left, right) => left.field_sort_order - right.field_sort_order)

    return fieldsForResource.map((field) => {
      const permissions = draftFieldPermissions.filter(
        (permission) => permission.resource_key === selectedResourceKey && permission.field_id === field.field_id
      )
      return {
        field,
        permissions,
      }
    })
  }, [draftFieldPermissions, fields, selectedResourceKey])

  const dirtyResourceKeys = useMemo(() => {
    const loadedMap = new Map(loadedResourcePermissions.map((permission) => [makeResourceKey(permission), permission]))
    return draftResourcePermissions.filter((permission) => {
      const original = loadedMap.get(makeResourceKey(permission))
      return !original ||
        original.allowed !== permission.allowed ||
        original.condition_id !== permission.condition_id
    })
  }, [draftResourcePermissions, loadedResourcePermissions])

  const dirtyFieldKeys = useMemo(() => {
    const loadedMap = new Map(loadedFieldPermissions.map((permission) => [makeFieldKey(permission), permission]))
    return draftFieldPermissions.filter((permission) => {
      const original = loadedMap.get(makeFieldKey(permission))
      return !original ||
        original.allowed !== permission.allowed ||
        original.condition_id !== permission.condition_id
    })
  }, [draftFieldPermissions, loadedFieldPermissions])

  function updateResourceDraft(
    resourceId: string,
    actionCode: string,
    updater: (current: RoleResourcePermissionMatrixRow) => RoleResourcePermissionMatrixRow
  ) {
    setDraftResourcePermissions((current) =>
      current.map((permission) =>
        permission.resource_id === resourceId && permission.action_code === actionCode
          ? updater(permission)
          : permission
      )
    )
  }

  function updateFieldDraft(
    fieldId: string,
    actionCode: string,
    updater: (current: RoleFieldPermissionMatrixRow) => RoleFieldPermissionMatrixRow
  ) {
    setDraftFieldPermissions((current) =>
      current.map((permission) =>
        permission.field_id === fieldId && permission.action_code === actionCode
          ? updater(permission)
          : permission
      )
    )
  }

  function toggleResourceAction(resourceId: string, actionCode: string, checked: boolean) {
    updateResourceDraft(resourceId, actionCode, (permission) => ({
      ...permission,
      allowed: checked,
      condition_id: checked ? permission.condition_id || conditionByCode.get("all")?.id || permission.condition_id : defaultNoneConditionId || permission.condition_id,
      condition_code: checked ? permission.condition_code === "none" ? "all" : permission.condition_code : "none",
      condition_name: checked ? permission.condition_code === "none" ? "All" : permission.condition_name : "None",
    }))
  }

  function setResourceScope(resourceId: string, actionCode: string, conditionCode: string) {
    const condition = conditionByCode.get(conditionCode)
    if (!condition) return

    updateResourceDraft(resourceId, actionCode, (permission) => ({
      ...permission,
      allowed: conditionCode !== "none",
      condition_id: condition.id,
      condition_code: condition.code,
      condition_name: condition.name,
    }))
  }

  function toggleFieldAction(fieldId: string, actionCode: string, checked: boolean) {
    updateFieldDraft(fieldId, actionCode, (permission) => ({
      ...permission,
      allowed: checked,
      condition_id: checked ? permission.condition_id || conditionByCode.get("all")?.id || permission.condition_id : defaultNoneConditionId || permission.condition_id,
      condition_code: checked ? permission.condition_code === "none" ? "all" : permission.condition_code : "none",
      condition_name: checked ? permission.condition_code === "none" ? "All" : permission.condition_name : "None",
    }))
  }

  function setFieldScope(fieldId: string, actionCode: string, conditionCode: string) {
    const condition = conditionByCode.get(conditionCode)
    if (!condition) return

    updateFieldDraft(fieldId, actionCode, (permission) => ({
      ...permission,
      allowed: conditionCode !== "none",
      condition_id: condition.id,
      condition_code: condition.code,
      condition_name: condition.name,
    }))
  }

  async function handleSaveChanges() {
    if (!selectedRoleId) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      setFeedback(null)

      await Promise.all([
        ...dirtyResourceKeys.map((permission) =>
          upsertRoleResourcePermission({
            roleId: permission.role_id,
            resourceId: permission.resource_id,
            actionId: permission.action_id,
            conditionId: permission.condition_id || defaultNoneConditionId,
            allowed: permission.allowed,
          })
        ),
        ...dirtyFieldKeys.map((permission) =>
          upsertRoleFieldPermission({
            roleId: permission.role_id,
            fieldId: permission.field_id,
            actionId: permission.action_id,
            conditionId: permission.condition_id || defaultNoneConditionId,
            allowed: permission.allowed,
          })
        ),
      ])

      await loadRoleMatrix(selectedRoleId)
      setFeedback("Permisos guardados correctamente.")
    } catch (saveError) {
      console.error(saveError)
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los permisos.")
    } finally {
      setSaving(false)
    }
  }

  async function handleCloneFromRole() {
    if (!duplicateSourceRoleId || duplicateSourceRoleId === selectedRoleId) {
      return
    }

    try {
      setError(null)
      const [resourceRows, fieldRows] = await Promise.all([
        getRoleResourcePermissions(duplicateSourceRoleId),
        getRoleFieldPermissions(duplicateSourceRoleId),
      ])

      const resourceByComposite = new Map(
        resourceRows.map((permission) => [makeResourceKey(permission), permission])
      )
      const fieldByComposite = new Map(
        fieldRows.map((permission) => [makeFieldKey(permission), permission])
      )

      setDraftResourcePermissions((current) =>
        current.map((permission) => {
          const source = resourceByComposite.get(makeResourceKey(permission))
          return source
            ? {
                ...permission,
                allowed: source.allowed,
                condition_id: source.condition_id,
                condition_code: source.condition_code,
                condition_name: source.condition_name,
              }
            : permission
        })
      )

      setDraftFieldPermissions((current) =>
        current.map((permission) => {
          const source = fieldByComposite.get(makeFieldKey(permission))
          return source
            ? {
                ...permission,
                allowed: source.allowed,
                condition_id: source.condition_id,
                condition_code: source.condition_code,
                condition_name: source.condition_name,
              }
            : permission
        })
      )

      setShowCloneModal(false)
      setFeedback("Se cargaron los permisos del rol origen. Guarda los cambios para aplicarlos.")
    } catch (cloneError) {
      console.error(cloneError)
      setError(cloneError instanceof Error ? cloneError.message : "No se pudieron duplicar los permisos.")
    }
  }

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null
  const resourceActions = actions.filter((action) => action.scope_type === "both" || action.scope_type === "resource")
  const fieldConditions = conditions.filter((condition) => condition.code !== "")

  return (
    <PageContainer
      title="Roles y permisos"
      description="Workspace visual para configurar que puede ver, editar y ejecutar cada rol del ERP."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setDraftResourcePermissions(loadedResourcePermissions)
              setDraftFieldPermissions(loadedFieldPermissions)
              setFeedback("Cambios locales restablecidos al ultimo estado guardado.")
            }}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            Restablecer
          </button>
          <button
            type="button"
            onClick={() => setShowCloneModal(true)}
            className="rounded-xl border border-[rgba(179,58,91,0.35)] bg-[rgba(179,58,91,0.14)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(179,58,91,0.22)]"
          >
            Duplicar permisos desde
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving || (dirtyResourceKeys.length === 0 && dirtyFieldKeys.length === 0)}
            className="rounded-xl bg-[linear-gradient(135deg,_#B33A5B,_#800020)] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(179,58,91,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.9fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-[rgba(7,16,32,0.6)] p-6 text-white shadow-[0_24px_80px_-36px_rgba(11,31,59,0.85)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--brand-gray)]">
              Role Workspace
            </div>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <label className="flex flex-1 flex-col gap-2">
                <span className="text-sm font-medium text-[var(--brand-soft-gray)]">Rol seleccionado</span>
                <select
                  value={selectedRoleId}
                  onChange={(event) => setSelectedRoleId(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm text-white outline-none focus:border-[rgba(179,58,91,0.45)]"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id} className="text-[#111827]">
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[var(--brand-soft-gray)]">
                Usuario actual: <span className="font-semibold text-white">{currentUserEmail}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.25)]">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#64748B]">Cambios pendientes</div>
            <div className="mt-3 text-3xl font-semibold text-[#0F172A]">
              {dirtyResourceKeys.length + dirtyFieldKeys.length}
            </div>
            <div className="mt-2 text-sm text-[#64748B]">
              {dirtyResourceKeys.length} reglas de recurso y {dirtyFieldKeys.length} reglas de campo listas para guardar.
            </div>
          </div>

          <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.25)]">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#64748B]">Cobertura</div>
            <div className="mt-3 text-3xl font-semibold text-[#0F172A]">{submoduleTree.flatMap((moduleEntry) => moduleEntry.items).length}</div>
            <div className="mt-2 text-sm text-[#64748B]">
              Submodulos registrados en el sistema de permisos con recursos y campos reutilizables.
            </div>
          </div>
        </section>

        {feedback ? (
          <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="rounded-[28px] border border-white/10 bg-[rgba(7,16,32,0.72)] p-5 text-white shadow-[0_24px_80px_-36px_rgba(11,31,59,0.85)]">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-gray)]">Modules</div>
            <div className="mt-4 space-y-5">
              {submoduleTree.map((moduleEntry) => (
                <div key={moduleEntry.moduleCode}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-soft-gray)]">
                    {moduleEntry.moduleName}
                  </div>
                  <div className="mt-3 space-y-2">
                    {moduleEntry.items.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setSelectedSubmoduleCode(item.code)}
                        className={[
                          "w-full rounded-2xl border px-3 py-3 text-left transition",
                          selectedSubmoduleCode === item.code
                            ? "border-[rgba(179,58,91,0.5)] bg-[rgba(179,58,91,0.18)] text-white"
                            : "border-white/8 bg-white/5 text-[var(--brand-light-gray)] hover:border-white/15 hover:bg-white/8",
                        ].join(" ")}
                      >
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="mt-1 text-xs text-[var(--brand-gray)]">
                          {item.active ? "Live in ERP" : "Planned / hidden"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.25)]">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-lg font-semibold text-[#0F172A]">
                  {selectedRole?.name || "Rol"} · {matrixRows[0]?.resource.submodule_name || "Selecciona un submodulo"}
                </div>
                <div className="text-sm text-[#64748B]">
                  Matriz principal por modulo, pantalla y recursos internos.
                </div>
              </div>
              {loading ? (
                <div className="text-sm text-[#64748B]">Cargando catalogo...</div>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
              <table className="min-w-full divide-y divide-[#E2E8F0] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-[0.22em] text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">View</th>
                    <th className="px-4 py-3">Create</th>
                    <th className="px-4 py-3">Edit</th>
                    <th className="px-4 py-3">Delete</th>
                    <th className="px-4 py-3">Actions</th>
                    <th className="px-4 py-3">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] bg-white">
                  {matrixRows.map(({ resource, actionMap, allowedActionCount, primaryScopePermission }) => {
                    const extraActions = resourceActions.filter(
                      (action) => !coreActions.includes(action.code as (typeof coreActions)[number])
                    )
                    const enabledExtraActions = extraActions.filter(
                      (action) => actionMap.get(action.code)?.allowed
                    )

                    return (
                      <tr
                        key={resource.resource_key}
                        className={selectedResourceKey === resource.resource_key ? "bg-[#FFF7FA]" : undefined}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedResourceKey(resource.resource_key)}
                            className="text-left"
                          >
                            <div className="font-medium text-[#0F172A]">{resource.resource_name}</div>
                            <div className="mt-1 text-xs text-[#64748B]">
                              {resourceGroupLabel(resource.resource_type)}
                              {resource.resource_group ? ` · ${resource.resource_group}` : ""}
                              {allowedActionCount > 0 ? ` · ${allowedActionCount} active` : " · no access"}
                            </div>
                          </button>
                        </td>
                        {coreActions.map((actionCode) => {
                          const permission = actionMap.get(actionCode)
                          return (
                            <td key={actionCode} className="px-4 py-3">
                              {permission ? (
                                <input
                                  type="checkbox"
                                  checked={permission.allowed}
                                  onChange={(event) =>
                                    toggleResourceAction(resource.resource_id, actionCode, event.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-[#CBD5E1] text-[#800020] focus:ring-[#800020]"
                                />
                              ) : (
                                <span className="text-xs text-[#94A3B8]">—</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {enabledExtraActions.length > 0 ? (
                              enabledExtraActions.map((action) => (
                                <span
                                  key={action.code}
                                  className="rounded-full bg-[#FDE7EF] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#800020]"
                                >
                                  {action.code}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-[#94A3B8]">Configure in drawer</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={primaryScopePermission?.condition_code ?? "none"}
                            onChange={(event) => {
                              if (!primaryScopePermission) return
                              setResourceScope(
                                resource.resource_id,
                                primaryScopePermission.action_code,
                                event.target.value
                              )
                            }}
                            className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#334155] outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                          >
                            {fieldConditions.map((condition) => (
                              <option key={condition.id} value={condition.code}>
                                {condition.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#64748B]">
                  Field Controls
                </div>
                <div className="mt-2 text-lg font-semibold text-[#0F172A]">
                  {selectedResource?.resource.resource_name || "Selecciona un recurso"}
                </div>
                <div className="mt-1 text-sm text-[#64748B]">
                  Visibilidad y editabilidad de campos sensibles.
                </div>
              </div>
              {selectedResource ? (
                <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#4338CA]">
                  {resourceGroupLabel(selectedResource.resource.resource_type)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 space-y-5">
              {selectedResource ? (
                <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFF7FA] p-4">
                  <div className="text-sm font-semibold text-[#0F172A]">Advanced Actions</div>
                  <div className="mt-3 grid gap-3">
                    {resourceActions
                      .filter((action) => !coreActions.includes(action.code as (typeof coreActions)[number]))
                      .map((action) => {
                        const permission =
                          selectedResource.actionMap.get(action.code) ??
                          draftResourcePermissions.find(
                            (item) =>
                              item.resource_id === selectedResource.resource.resource_id &&
                              item.action_code === action.code
                          ) ??
                          null

                        if (!permission) {
                          return null
                        }

                        return (
                          <div
                            key={action.code}
                            className="rounded-2xl border border-white bg-white px-3 py-3"
                          >
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-[#475569]">
                              <span>{action.code}</span>
                              <input
                                type="checkbox"
                                checked={permission.allowed}
                                onChange={(event) =>
                                  toggleResourceAction(
                                    selectedResource.resource.resource_id,
                                    action.code,
                                    event.target.checked
                                  )
                                }
                                className="h-4 w-4 rounded border-[#CBD5E1] text-[#800020] focus:ring-[#800020]"
                              />
                            </label>
                            <select
                              value={permission.condition_code}
                              onChange={(event) =>
                                setResourceScope(
                                  selectedResource.resource.resource_id,
                                  action.code,
                                  event.target.value
                                )
                              }
                              className="mt-3 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#334155] outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                            >
                              {fieldConditions.map((condition) => (
                                <option key={condition.id} value={condition.code}>
                                  {condition.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ) : null}

              {fieldRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-sm text-[#64748B]">
                  Este recurso aun no tiene campos registrados en el sistema de permisos.
                </div>
              ) : (
                Object.entries(
                  fieldRows.reduce<Record<string, typeof fieldRows>>((groups, row) => {
                    const groupKey = row.field.field_group || "General"
                    groups[groupKey] = groups[groupKey] ?? []
                    groups[groupKey].push(row)
                    return groups
                  }, {})
                ).map(([groupName, groupRows]) => (
                  <div key={groupName} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div className="text-sm font-semibold text-[#0F172A]">{groupName}</div>
                    <div className="mt-3 space-y-3">
                      {groupRows.map(({ field, permissions }) => {
                        const permissionMap = new Map(permissions.map((permission) => [permission.action_code, permission]))
                        return (
                          <div key={field.field_id} className="rounded-2xl border border-white bg-white p-3">
                            <div className="text-sm font-medium text-[#0F172A]">{field.label}</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
                              {fieldActionCodes.map((actionCode) => {
                                const permission = permissionMap.get(actionCode)
                                if (!permission) return null

                                return (
                                  <div key={actionCode} className="rounded-xl border border-[#E2E8F0] px-3 py-3">
                                    <label className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-[#475569]">
                                      <span>{actionCode}</span>
                                      <input
                                        type="checkbox"
                                        checked={permission.allowed}
                                        onChange={(event) =>
                                          toggleFieldAction(field.field_id, actionCode, event.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-[#CBD5E1] text-[#800020] focus:ring-[#800020]"
                                      />
                                    </label>
                                    <select
                                      value={permission.condition_code}
                                      onChange={(event) =>
                                        setFieldScope(field.field_id, actionCode, event.target.value)
                                      }
                                      className="mt-3 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#334155] outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                                    >
                                      {fieldConditions.map((condition) => (
                                        <option key={condition.id} value={condition.code}>
                                          {condition.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      {showCloneModal ? (
        <Modal
          title="Duplicar permisos desde otro rol"
          description="Copia la configuracion base de otro rol dentro de este workspace. Los cambios no se aplican hasta guardar."
          onClose={() => setShowCloneModal(false)}
        >
          <div className="space-y-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#0F172A]">Rol origen</span>
              <select
                value={duplicateSourceRoleId}
                onChange={(event) => setDuplicateSourceRoleId(event.target.value)}
                className="rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
              >
                <option value="">Selecciona un rol</option>
                {roles
                  .filter((role) => role.id !== selectedRoleId)
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
              </select>
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="rounded-xl border border-[#CBD5E1] px-4 py-2 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCloneFromRole}
                disabled={!duplicateSourceRoleId}
                className="rounded-xl bg-[linear-gradient(135deg,_#B33A5B,_#800020)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cargar permisos
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
