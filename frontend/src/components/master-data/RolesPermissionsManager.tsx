"use client"

import type { ColDef } from "ag-grid-community"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertCircleIcon, ChevronDownIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/layout/PageContainer"
import { Modal } from "@/components/data/Modal"
import {
  PriorityFormField,
  PriorityFormSection,
  PrioritySelectField,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
import { PriorityGrid } from "@/components/priority/grid/PriorityGrid"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityMetricCard, PriorityMetricStrip, PrioritySummaryRail } from "@/components/priority/PriorityWorkspace"
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

  const routeAccessColumns: ColDef<(typeof matrixRows)[number]>[] = [
    {
      headerName: "Recurso",
      field: "resource.resource_name",
      flex: 1.45,
      cellRenderer: (params: { data?: (typeof matrixRows)[number] }) => {
        const row = params.data
        if (!row) return null

        return (
          <button
            type="button"
            onClick={() => setSelectedResourceKey(row.resource.resource_key)}
            className="text-left"
          >
            <div className="font-medium text-[#0F172A]">{row.resource.resource_name}</div>
            <div className="mt-1 text-xs text-[#64748B]">
              {resourceGroupLabel(row.resource.resource_type)}
              {row.resource.resource_group ? ` · ${row.resource.resource_group}` : ""}
              {row.allowedActionCount > 0 ? ` · ${row.allowedActionCount} activas` : " · sin acceso"}
            </div>
          </button>
        )
      },
    },
    ...coreActions.map(
      (actionCode) =>
        ({
          headerName: actionCode.charAt(0).toUpperCase() + actionCode.slice(1),
          colId: actionCode,
          width: 96,
          sortable: false,
          filter: false,
          cellRenderer: (params: { data?: (typeof matrixRows)[number] }) => {
            const row = params.data
            const permission = row?.actionMap.get(actionCode)

            if (!row || !permission) {
              return <span className="text-xs text-[#94A3B8]">—</span>
            }

            return (
              <div className="flex h-full items-center">
                <Checkbox
                  checked={permission.allowed}
                  onCheckedChange={(checked) =>
                    toggleResourceAction(row.resource.resource_id, actionCode, checked === true)
                  }
                  aria-label={`${actionCode} para ${row.resource.resource_name}`}
                />
              </div>
            )
          },
        }) satisfies ColDef<(typeof matrixRows)[number]>
    ),
    {
      headerName: "Acciones avanzadas",
      flex: 1,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data?: (typeof matrixRows)[number] }) => {
        const row = params.data
        if (!row) return null

        const extraActions = resourceActions.filter(
          (action) => !coreActions.includes(action.code as (typeof coreActions)[number])
        )
        const enabledExtraActions = extraActions.filter((action) => row.actionMap.get(action.code)?.allowed)

        return (
          <div className="flex h-full flex-wrap items-center gap-2 py-2">
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
              <span className="text-xs text-[#94A3B8]">Configura en field masking</span>
            )}
          </div>
        )
      },
    },
    {
      headerName: "Alcance",
      width: 180,
      sortable: false,
      filter: false,
      cellRenderer: (params: { data?: (typeof matrixRows)[number] }) => {
        const row = params.data
        const primaryScopePermission = row?.primaryScopePermission

        if (!row || !primaryScopePermission) {
          return null
        }

        return (
          <select
            value={primaryScopePermission.condition_code ?? "none"}
            onChange={(event) =>
              setResourceScope(row.resource.resource_id, primaryScopePermission.action_code, event.target.value)
            }
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-medium text-[#334155] outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
          >
            {fieldConditions.map((condition) => (
              <option key={condition.id} value={condition.code}>
                {condition.name}
              </option>
            ))}
          </select>
        )
      },
    },
  ]

  return (
    <PageContainer
      density="compact"
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
      <div className="space-y-5">
        <PrioritySummaryRail className="xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <PriorityTypography variant="eyebrow" className="text-[#5F7287]">
              Workspace de roles
            </PriorityTypography>
            <PriorityTypography as="h2" variant="sectionTitle" className="mt-2">
              Configura visibilidad, acciones y campos sensibles sin salir del mismo contexto.
            </PriorityTypography>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <label className="flex flex-1 flex-col gap-2">
                <span className="text-sm font-medium text-[#526175]">Rol seleccionado</span>
                <select
                  value={selectedRoleId}
                  onChange={(event) => setSelectedRoleId(event.target.value)}
                  className="rounded-2xl border border-[#D1D6DF] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[rgba(179,58,91,0.45)]"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id} className="text-[#111827]">
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-2xl border border-[rgba(11,31,59,0.08)] bg-[rgba(11,31,59,0.03)] px-4 py-3 text-sm text-[#526175]">
                Usuario actual: <span className="font-semibold text-[var(--brand-navy)]">{currentUserEmail}</span>
              </div>
            </div>
          </div>
        </PrioritySummaryRail>

        <PriorityMetricStrip density="compact" className="xl:grid-cols-2">
          <PriorityMetricCard
            density="compact"
            label="Cambios pendientes"
            value={dirtyResourceKeys.length + dirtyFieldKeys.length}
            helper={`${dirtyResourceKeys.length} reglas de recurso y ${dirtyFieldKeys.length} reglas de campo listas para guardar.`}
            tone="warning"
          />
          <PriorityMetricCard
            density="compact"
            label="Cobertura"
            value={submoduleTree.flatMap((moduleEntry) => moduleEntry.items).length}
            helper="Submódulos registrados con recursos y campos reutilizables."
            tone="info"
          />
        </PriorityMetricStrip>

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

        <div className="grid gap-4 xl:grid-cols-[248px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-white/10 bg-[rgba(7,16,32,0.72)] p-4 text-white shadow-[0_20px_56px_-34px_rgba(11,31,59,0.72)]">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-gray)]">Módulos</div>
            <div className="mt-3 space-y-4">
              {submoduleTree.map((moduleEntry) => (
                <div key={moduleEntry.moduleCode}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-soft-gray)]">
                    {moduleEntry.moduleName}
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {moduleEntry.items.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setSelectedSubmoduleCode(item.code)}
                        className={[
                          "w-full rounded-2xl border px-3 py-2.5 text-left transition",
                          selectedSubmoduleCode === item.code
                            ? "border-[rgba(179,58,91,0.5)] bg-[rgba(179,58,91,0.18)] text-white"
                            : "border-white/8 bg-white/5 text-[var(--brand-light-gray)] hover:border-white/15 hover:bg-white/8",
                        ].join(" ")}
                      >
                          <div className="text-[0.92rem] font-medium">{item.name}</div>
                          <div className="mt-0.5 text-xs text-[var(--brand-gray)]">
                            {item.active ? "Activo en ERP" : "Planeado / oculto"}
                          </div>
                        </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
            <Tabs defaultValue="route-access" className="gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-lg font-semibold text-[#0F172A]">
                    {selectedRole?.name || "Rol"} · {matrixRows[0]?.resource.submodule_name || "Selecciona un submodulo"}
                  </div>
                  <div className="mt-1 text-sm text-[#64748B]">
                    Configura acceso de rutas, recursos internos y visibilidad de campos sensibles.
                  </div>
                </div>
                {loading ? <div className="text-sm text-[#64748B]">Cargando catálogo...</div> : null}
              </div>

              <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="route-access">Acceso por recurso</TabsTrigger>
                <TabsTrigger value="field-masking">Campos sensibles</TabsTrigger>
              </TabsList>

              <TabsContent value="route-access">
                <PriorityGrid
                  mode="bulk-edit-matrix"
                  rowData={matrixRows}
                  columnDefs={routeAccessColumns}
                  emptyTitle="Sin recursos configurados"
                  emptyDescription="Selecciona un submódulo para editar accesos, acciones y alcances desde esta matriz."
                  height={540}
                  rowHeight={84}
                  getRowId={(params) => params.data.resource.resource_key}
                  getRowClass={(params) =>
                    params.data?.resource.resource_key === selectedResourceKey ? "bg-[#FFF7FA]" : undefined
                  }
                  renderMobileCard={(row) => {
                    const extraActions = resourceActions.filter(
                      (action) => !coreActions.includes(action.code as (typeof coreActions)[number])
                    )
                    const enabledExtraActions = extraActions.filter((action) => row.actionMap.get(action.code)?.allowed)

                    return (
                      <div className="space-y-4 rounded-[22px] border border-[var(--border-subtle)] bg-white p-4 shadow-[0_20px_40px_-34px_rgba(3,10,24,0.26)]">
                        <button
                          type="button"
                          onClick={() => setSelectedResourceKey(row.resource.resource_key)}
                          className="text-left"
                        >
                          <div className="font-medium text-[#0F172A]">{row.resource.resource_name}</div>
                          <div className="mt-1 text-xs text-[#64748B]">
                            {resourceGroupLabel(row.resource.resource_type)}
                            {row.resource.resource_group ? ` · ${row.resource.resource_group}` : ""}
                          </div>
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                          {coreActions.map((actionCode) => {
                            const permission = row.actionMap.get(actionCode)
                            return (
                              <label key={actionCode} className="flex items-center justify-between gap-3 rounded-[16px] bg-[rgba(11,31,59,0.04)] px-3 py-3 text-sm font-medium text-[#334155]">
                                <span>{actionCode}</span>
                                {permission ? (
                                  <Checkbox
                                    checked={permission.allowed}
                                    onCheckedChange={(checked) =>
                                      toggleResourceAction(row.resource.resource_id, actionCode, checked === true)
                                    }
                                  />
                                ) : (
                                  <span className="text-xs text-[#94A3B8]">—</span>
                                )}
                              </label>
                            )
                          })}
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Alcance</div>
                          {row.primaryScopePermission ? (
                            <select
                              value={row.primaryScopePermission.condition_code ?? "none"}
                              onChange={(event) =>
                                setResourceScope(row.resource.resource_id, row.primaryScopePermission!.action_code, event.target.value)
                              }
                              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#334155] outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                            >
                              {fieldConditions.map((condition) => (
                                <option key={condition.id} value={condition.code}>
                                  {condition.name}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748B]">Acciones avanzadas</div>
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
                              <span className="text-xs text-[#94A3B8]">Configura en field masking</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
              </TabsContent>

              <TabsContent value="field-masking">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#64748B]">
                        Controles de campo
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
                          <PriorityTypography variant="cardTitle">Acciones avanzadas</PriorityTypography>
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
          description="Copia la configuración base de otro rol dentro de este workspace. Los cambios no se aplican hasta guardar."
          size="compact"
          onClose={() => setShowCloneModal(false)}
        >
          <div className="space-y-5">
            <PriorityFormSection
              title="Rol origen"
              description="Selecciona un rol base para cargar su configuración actual de accesos y alcances."
            >
              <PriorityFormField label="Rol origen" required>
                <PrioritySelectField
                  value={duplicateSourceRoleId}
                  onValueChange={setDuplicateSourceRoleId}
                  placeholder="Selecciona un rol"
                  options={roles
                    .filter((role) => role.id !== selectedRoleId)
                    .map((role) => ({
                      value: role.id,
                      label: role.name,
                    }))}
                />
              </PriorityFormField>
            </PriorityFormSection>

            <PrioritySectionAlert title="Qué se copiará" variant="info">
              Se copiarán permisos por recurso y configuración base de alcance. Los cambios no se aplican hasta guardar el workspace.
            </PrioritySectionAlert>

            <PrioritySubmitBar density="compact" mode="inline">
              <Button type="button" variant="outline" onClick={() => setShowCloneModal(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCloneFromRole} disabled={!duplicateSourceRoleId}>
                <AlertCircleIcon />
                Cargar permisos
              </Button>
            </PrioritySubmitBar>
          </div>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
