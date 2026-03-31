"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertCircleIcon, ChevronDownIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/layout/PageContainer"
import { Modal } from "@/components/data/Modal"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import {
  coreActions,
  resourceGroupLabel,
} from "@/features/master-data/roles-permissions/helpers"
import { useRolesPermissionsController } from "@/features/master-data/roles-permissions/useRolesPermissionsController"

type RolesPermissionsManagerProps = {
  currentUserEmail: string
}

export function RolesPermissionsManager({ currentUserEmail }: RolesPermissionsManagerProps) {
  const {
    draftResourcePermissions,
    dirtyFieldKeys,
    dirtyResourceKeys,
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
    setFieldScope,
    setResourceScope,
    setSelectedResourceKey,
    setSelectedRoleId,
    setSelectedSubmoduleCode,
    setShowCloneModal,
    handleCloneFromRole,
    handleSaveChanges,
    resetDrafts,
    toggleFieldAction,
    toggleResourceAction,
  } = useRolesPermissionsController()

  return (
    <PageContainer
      title="Roles y permisos"
      description="Workspace visual para configurar que puede ver, editar y ejecutar cada rol del ERP."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="lg" onClick={resetDrafts}>
            Restablecer
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => setShowCloneModal(true)}>
            Duplicar permisos desde
          </Button>
          <Button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving || (dirtyResourceKeys.length === 0 && dirtyFieldKeys.length === 0)}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
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
          <PrioritySectionAlert title="Cambios listos para guardar" variant="success">
            {feedback}
          </PrioritySectionAlert>
        ) : null}

        {error ? (
          <PrioritySectionAlert title="Error de permisos" variant="destructive">
            {error}
          </PrioritySectionAlert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
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
            <Tabs defaultValue="route-access" className="gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-lg font-semibold text-[#0F172A]">
                    {selectedRole?.name || "Rol"} · {matrixRows[0]?.resource.submodule_name || "Selecciona un submodulo"}
                  </div>
                  <div className="mt-1 text-sm text-[#64748B]">
                    Configura acceso de rutas, recursos internos y visibilidad de campos sensibles.
                  </div>
                </div>
                {loading ? <div className="text-sm text-[#64748B]">Cargando catalogo...</div> : null}
              </div>

              <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="route-access">Route access</TabsTrigger>
                <TabsTrigger value="field-masking">Field masking</TabsTrigger>
              </TabsList>

              <TabsContent value="route-access">
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
                                    <Checkbox
                                      checked={permission.allowed}
                                      onCheckedChange={(checked) =>
                                        toggleResourceAction(resource.resource_id, actionCode, checked === true)
                                      }
                                      aria-label={`${actionCode} para ${resource.resource_name}`}
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
                                  <span className="text-xs text-[#94A3B8]">Configure in field masking</span>
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
              </TabsContent>

              <TabsContent value="field-masking">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
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

                  {selectedResource ? (
                    <Collapsible defaultOpen className="rounded-2xl border border-[#E2E8F0] bg-[#FFF7FA] p-4">
                      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                        <div>
                          <PriorityTypography variant="cardTitle">Advanced Actions</PriorityTypography>
                          <PriorityTypography variant="caption" className="mt-1">
                            Reglas extendidas para acciones fuera del CRUD base.
                          </PriorityTypography>
                        </div>
                        <ChevronDownIcon className="size-4 text-[#64748B]" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 grid gap-3">
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
                                  <Checkbox
                                    checked={permission.allowed}
                                    onCheckedChange={(checked) =>
                                      toggleResourceAction(
                                        selectedResource.resource.resource_id,
                                        action.code,
                                        checked === true
                                      )
                                    }
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
                      </CollapsibleContent>
                    </Collapsible>
                  ) : null}

                  {fieldRows.length === 0 ? (
                    <PrioritySectionAlert title="Sin campos registrados" variant="info">
                      Este recurso aun no tiene campos registrados en el sistema de permisos.
                    </PrioritySectionAlert>
                  ) : (
                    groupedFieldRows.map(([groupName, groupRows]) => (
                      <Collapsible key={groupName} defaultOpen className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                          <PriorityTypography variant="cardTitle" className="text-base">
                            {groupName}
                          </PriorityTypography>
                          <ChevronDownIcon className="size-4 text-[#64748B]" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-3">
                          {groupRows.map(({ field, permissions }) => {
                            const permissionMap = new Map(
                              permissions.map((permission) => [permission.action_code, permission])
                            )
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
                                          <Checkbox
                                            checked={permission.allowed}
                                            onCheckedChange={(checked) =>
                                              toggleFieldAction(field.field_id, actionCode, checked === true)
                                            }
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
                        </CollapsibleContent>
                      </Collapsible>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </section>
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
              <PriorityTypography variant="fieldLabel">Rol origen</PriorityTypography>
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
              <Button type="button" variant="outline" onClick={() => setShowCloneModal(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCloneFromRole} disabled={!duplicateSourceRoleId}>
                <AlertCircleIcon />
                Cargar permisos
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
