import { useCallback, useEffect, useMemo, useState } from "react"
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
import {
  applyPermissionScope,
  applyPermissionToggle,
  buildConditionMap,
  buildDirtyFieldPermissions,
  buildDirtyResourcePermissions,
  buildFieldMatrixRows,
  buildResourceMatrixRows,
  buildSubmoduleTree,
  groupFieldRowsByGroup,
  makeFieldKey,
  makeResourceKey,
} from "./helpers"

export function useRolesPermissionsController() {
  const [roles, setRoles] = useState<UserRole[]>([])
  const [actions, setActions] = useState<PermissionAction[]>([])
  const [conditions, setConditions] = useState<PermissionCondition[]>([])
  const [resources, setResources] = useState<PermissionResourceCatalogItem[]>([])
  const [fields, setFields] = useState<PermissionFieldCatalogItem[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [selectedSubmoduleCode, setSelectedSubmoduleCode] = useState<string | null>(null)
  const [selectedResourceKey, setSelectedResourceKey] = useState<string | null>(null)
  const [loadedResourcePermissions, setLoadedResourcePermissions] = useState<
    RoleResourcePermissionMatrixRow[]
  >([])
  const [draftResourcePermissions, setDraftResourcePermissions] = useState<
    RoleResourcePermissionMatrixRow[]
  >([])
  const [loadedFieldPermissions, setLoadedFieldPermissions] = useState<RoleFieldPermissionMatrixRow[]>(
    []
  )
  const [draftFieldPermissions, setDraftFieldPermissions] = useState<RoleFieldPermissionMatrixRow[]>(
    []
  )
  const [duplicateSourceRoleId, setDuplicateSourceRoleId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCloneModal, setShowCloneModal] = useState(false)

  const conditionByCode = useMemo(() => buildConditionMap(conditions), [conditions])
  const defaultNoneConditionId = conditionByCode.get("none")?.id ?? ""

  const fieldActionCodes = useMemo(
    () =>
      actions
        .filter((action) => action.scope_type === "both" || action.scope_type === "field")
        .map((action) => action.code),
    [actions]
  )

  const resourceActions = useMemo(
    () => actions.filter((action) => action.scope_type === "both" || action.scope_type === "resource"),
    [actions]
  )

  const fieldConditions = useMemo(
    () => conditions.filter((condition) => condition.code !== ""),
    [conditions]
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
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el catalogo de permisos."
      )
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

  const submoduleTree = useMemo(() => buildSubmoduleTree(resources), [resources])

  useEffect(() => {
    if (selectedSubmoduleCode) {
      return
    }

    const firstSubmodule = submoduleTree.flatMap((moduleEntry) => moduleEntry.items)[0]
    if (firstSubmodule) {
      setSelectedSubmoduleCode(firstSubmodule.code)
    }
  }, [selectedSubmoduleCode, submoduleTree])

  const matrixRows = useMemo(
    () => buildResourceMatrixRows(resources, draftResourcePermissions, selectedSubmoduleCode),
    [draftResourcePermissions, resources, selectedSubmoduleCode]
  )

  useEffect(() => {
    if (
      selectedResourceKey &&
      matrixRows.some((row) => row.resource.resource_key === selectedResourceKey)
    ) {
      return
    }

    setSelectedResourceKey(matrixRows[0]?.resource.resource_key ?? null)
  }, [matrixRows, selectedResourceKey])

  const selectedResource = useMemo(
    () => matrixRows.find((row) => row.resource.resource_key === selectedResourceKey) ?? null,
    [matrixRows, selectedResourceKey]
  )

  const fieldRows = useMemo(
    () => buildFieldMatrixRows(fields, draftFieldPermissions, selectedResourceKey),
    [draftFieldPermissions, fields, selectedResourceKey]
  )

  const groupedFieldRows = useMemo(() => groupFieldRowsByGroup(fieldRows), [fieldRows])

  const dirtyResourceKeys = useMemo(
    () => buildDirtyResourcePermissions(loadedResourcePermissions, draftResourcePermissions),
    [draftResourcePermissions, loadedResourcePermissions]
  )

  const dirtyFieldKeys = useMemo(
    () => buildDirtyFieldPermissions(loadedFieldPermissions, draftFieldPermissions),
    [draftFieldPermissions, loadedFieldPermissions]
  )

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  )

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
    updateResourceDraft(resourceId, actionCode, (permission) =>
      applyPermissionToggle(permission, checked, conditionByCode, defaultNoneConditionId)
    )
  }

  function setResourceScope(resourceId: string, actionCode: string, conditionCode: string) {
    const condition = conditionByCode.get(conditionCode)
    if (!condition) {
      return
    }

    updateResourceDraft(resourceId, actionCode, (permission) =>
      applyPermissionScope(permission, condition)
    )
  }

  function toggleFieldAction(fieldId: string, actionCode: string, checked: boolean) {
    updateFieldDraft(fieldId, actionCode, (permission) =>
      applyPermissionToggle(permission, checked, conditionByCode, defaultNoneConditionId)
    )
  }

  function setFieldScope(fieldId: string, actionCode: string, conditionCode: string) {
    const condition = conditionByCode.get(conditionCode)
    if (!condition) {
      return
    }

    updateFieldDraft(fieldId, actionCode, (permission) => applyPermissionScope(permission, condition))
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
      setError(
        saveError instanceof Error ? saveError.message : "No se pudieron guardar los permisos."
      )
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
      setError(
        cloneError instanceof Error ? cloneError.message : "No se pudieron duplicar los permisos."
      )
    }
  }

  function resetDrafts() {
    setDraftResourcePermissions(loadedResourcePermissions)
    setDraftFieldPermissions(loadedFieldPermissions)
    setFeedback("Cambios locales restablecidos al ultimo estado guardado.")
  }

  return {
    actions,
    conditions,
    dirtyFieldKeys,
    dirtyResourceKeys,
    draftFieldPermissions,
    draftResourcePermissions,
    duplicateSourceRoleId,
    error,
    feedback,
    fieldActionCodes,
    fieldConditions,
    fieldRows,
    groupedFieldRows,
    loading,
    matrixRows,
    resourceActions,
    roles,
    saving,
    selectedResource,
    selectedResourceKey,
    selectedRole,
    selectedRoleId,
    selectedSubmoduleCode,
    showCloneModal,
    submoduleTree,
    setDuplicateSourceRoleId,
    setSelectedResourceKey,
    setSelectedRoleId,
    setSelectedSubmoduleCode,
    setShowCloneModal,
    handleCloneFromRole,
    handleSaveChanges,
    resetDrafts,
    toggleFieldAction,
    toggleResourceAction,
    setFieldScope,
    setResourceScope,
  }
}
