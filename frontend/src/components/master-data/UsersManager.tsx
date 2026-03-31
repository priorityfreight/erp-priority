"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { PencilLineIcon, PlusIcon, ShieldAlertIcon, Trash2Icon, UserCogIcon } from "lucide-react"
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { UserForm, type UserFormValues } from "@/components/forms/UserForm"
import { PageContainer } from "@/components/layout/PageContainer"
import { PriorityDataTable } from "@/components/priority/PriorityDataTable"
import { PriorityRowActions } from "@/components/priority/PriorityRowActions"
import { PrioritySectionAlert } from "@/components/priority/PrioritySectionAlert"
import {
  PriorityInput,
  PrioritySelectField,
  PrioritySubmitBar,
} from "@/components/priority/PriorityForm"
import { PriorityCardTitle, PriorityTypography } from "@/components/priority/PriorityTypography"
import { PriorityToolbar } from "@/components/priority/PriorityToolbar"
import { PriorityUserAvatar } from "@/components/priority/PriorityUserAvatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { getUserRoles, getUsers, type User, type UserRole } from "@/lib/db"
import { notifyError } from "@/lib/feedback"

const emptyForm: UserFormValues = {
  fullName: "",
  roleName: "",
  email: "",
  phone: "",
  username: "",
  password: "",
  status: "activo",
}

function splitFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, " ")

  if (!normalized) {
    return { firstName: "", lastName: "" }
  }

  const parts = normalized.split(" ")
  return {
    firstName: parts.shift() ?? "",
    lastName: parts.join(" "),
  }
}

function getDisplayName(user: User) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  return fullName || user.username || user.email
}

function mapUserToForm(user: User): UserFormValues {
  return {
    fullName: [user.first_name, user.last_name].filter(Boolean).join(" ").trim(),
    roleName: user.role_name || "",
    email: user.email,
    phone: user.phone || "",
    username: user.username || "",
    password: "",
    status: user.active ? "activo" : "inactivo",
  }
}

type UsersManagerProps = {
  currentUserEmail: string
  currentUserId: string
}

export function UsersManager({ currentUserEmail, currentUserId }: UsersManagerProps) {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const [statusFilter, setStatusFilter] = useState<"todos" | "activo" | "inactivo">("todos")
  const [roleFilter, setRoleFilter] = useState("todos")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [formValues, setFormValues] = useState<UserFormValues>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [tableError, setTableError] = useState<string | null>(null)
  const [tableFeedback, setTableFeedback] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const [userRows, roleRows] = await Promise.all([getUsers(), getUserRoles()])
      setUsers(userRows)
      setRoles(roleRows)
      setTableError(null)
    } catch (error) {
      console.error(error)
      setTableError(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase()

    return users.filter((user) => {
      if (statusFilter === "activo" && !user.active) return false
      if (statusFilter === "inactivo" && user.active) return false
      if (roleFilter !== "todos" && user.role_name !== roleFilter) return false

      if (!normalizedQuery) {
        return true
      }

      return [getDisplayName(user), user.email, user.username || "", user.role_name || ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [deferredSearch, roleFilter, statusFilter, users])

  const activeUsers = users.filter((user) => user.active).length
  const inactiveUsers = users.length - activeUsers

  const roleOptions = useMemo(
    () => [{ value: "todos", label: "Todos los roles" }].concat(
      roles.map((role) => ({ value: role.name, label: role.name }))
    ),
    [roles]
  )

  function resetForm() {
    setFormValues(emptyForm)
    setEditingUser(null)
    setFormError(null)
  }

  function handleChange(field: keyof UserFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function openCreateModal() {
    resetForm()
    setShowCreateModal(true)
  }

  function openEditModal(user: User) {
    setEditingUser(user)
    setFormValues(mapUserToForm(user))
    setFormError(null)
    setShowCreateModal(true)
  }

  function buildUpdatePayload(
    user: User,
    overrides?: Partial<{
      active: boolean
      roleName: string
      phone: string | null
      username: string | null
      firstName: string
      lastName: string
    }>
  ) {
    return {
      userId: user.id,
      authUserId: user.auth_user_id ?? null,
      firstName: overrides?.firstName ?? user.first_name,
      lastName: overrides?.lastName ?? user.last_name,
      email: user.email.trim().toLowerCase(),
      phone: overrides?.phone ?? user.phone ?? null,
      username: overrides?.username ?? user.username ?? null,
      roleName: overrides?.roleName ?? user.role_name ?? "",
      active: overrides?.active ?? user.active,
      password: null,
    }
  }

  async function handleSubmit() {
    const { firstName, lastName } = splitFullName(formValues.fullName)

    if (!firstName || !formValues.email.trim() || !formValues.roleName || !formValues.username.trim()) {
      setFormError("Nombre, rol, correo y username son requeridos.")
      return
    }

    if (!editingUser && formValues.password.trim().length < 8) {
      setFormError("La contrasena inicial debe tener al menos 8 caracteres.")
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)

      const payload = {
        userId: editingUser?.id,
        authUserId: editingUser?.auth_user_id ?? null,
        firstName,
        lastName,
        email: formValues.email.trim(),
        phone: formValues.phone.trim() || null,
        username: formValues.username.trim().toLowerCase(),
        roleName: formValues.roleName,
        active: formValues.status === "activo",
        password: formValues.password.trim() || null,
      }

      const response = await fetch("/api/admin/users", {
        method: editingUser ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || "No se pudo guardar el usuario.")
      }

      setShowCreateModal(false)
      resetForm()
      setTableFeedback(editingUser ? "Usuario actualizado correctamente." : "Usuario creado correctamente.")
      await loadUsers()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el usuario.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(user: User) {
    const nextStatus = !user.active

    if (user.id === currentUserId && !nextStatus) {
      setTableError("No puedes inactivar tu propio usuario administrador.")
      return
    }

    try {
      setSubmitting(true)
      setTableError(null)

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildUpdatePayload(user, { active: nextStatus })),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(result.error || "No se pudo actualizar el estatus del usuario.")
      }

      setTableFeedback(`Usuario marcado como ${nextStatus ? "activo" : "inactivo"}.`)
      await loadUsers()
    } catch (error) {
      setTableError(error instanceof Error ? error.message : "No se pudo actualizar el estatus del usuario.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteUser() {
    if (!pendingDelete) {
      return
    }

    if (pendingDelete.id === currentUserId) {
      setTableError("No puedes eliminar tu propio usuario administrador.")
      setPendingDelete(null)
      return
    }

    try {
      setSubmitting(true)
      setTableError(null)

      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: pendingDelete.id,
          authUserId: pendingDelete.auth_user_id ?? null,
        }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        const message =
          result.error ||
          "No se pudo eliminar el usuario. Si tiene clientes, oportunidades o cotizaciones relacionadas, primero debe reasignarse."
        throw new Error(message)
      }

      setTableFeedback("Usuario eliminado correctamente.")
      setPendingDelete(null)
      await loadUsers()
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el usuario."
      setTableError(message)
      notifyError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      id: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <PriorityUserAvatar name={getDisplayName(row.original)} />
          <div className="space-y-1">
            <div className="font-medium text-[var(--brand-navy)]">{getDisplayName(row.original)}</div>
            <PriorityTypography variant="caption">
              {row.original.auth_user_id ? "Auth vinculado" : "Auth pendiente"}
            </PriorityTypography>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role_name",
      header: "Rol",
      cell: ({ row }) =>
        row.original.role_name ? <Badge variant="secondary">{row.original.role_name}</Badge> : <span>Sin rol</span>,
    },
    {
      accessorKey: "email",
      header: "Correo",
    },
    {
      accessorKey: "phone",
      header: "Telefono",
      cell: ({ row }) => <span>{row.original.phone || "No disponible"}</span>,
    },
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => <span>{row.original.username || "No asignado"}</span>,
    },
    {
      accessorKey: "active",
      header: "Estatus",
      cell: ({ row }) => (
        <div className="flex items-center justify-between gap-3">
          <StatusBadge status={row.original.active ? "active" : "inactive"} />
          <Switch
            checked={row.original.active}
            aria-label={row.original.active ? "Inactivar usuario" : "Activar usuario"}
            disabled={submitting}
            onCheckedChange={() => void handleToggleActive(row.original)}
          />
        </div>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <PriorityRowActions
            label="Acciones de usuario"
            actions={[
              {
                label: "Editar",
                icon: <PencilLineIcon />,
                onSelect: () => openEditModal(row.original),
              },
              {
                label: row.original.active ? "Inactivar" : "Activar",
                icon: <UserCogIcon />,
                onSelect: () => void handleToggleActive(row.original),
                disabled: submitting,
              },
              {
                label: "Eliminar",
                icon: <Trash2Icon />,
                onSelect: () => setPendingDelete(row.original),
                disabled: submitting,
                destructive: true,
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <PageContainer
      title="Usuarios"
      description="Directorio de acceso ERP para usuarios asignados, roles y estatus de acceso."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild type="button" variant="outline" size="lg">
            <Link href="/master-data/users/roles">
              <UserCogIcon />
              Roles y permisos
            </Link>
          </Button>
          <Button type="button" size="lg" onClick={openCreateModal}>
            <PlusIcon />
            Anadir usuario
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-[rgba(37,99,235,0.16)] bg-[linear-gradient(180deg,_rgba(239,246,255,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-5 shadow-[0_24px_48px_-36px_rgba(37,99,235,0.25)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
              Total usuarios
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{users.length}</div>
          </div>
          <div className="rounded-[24px] border border-[rgba(16,185,129,0.16)] bg-[linear-gradient(180deg,_rgba(236,253,245,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-5 shadow-[0_24px_48px_-36px_rgba(16,185,129,0.22)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#047857]">
              Activos
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{activeUsers}</div>
          </div>
          <div className="rounded-[24px] border border-[rgba(217,119,6,0.16)] bg-[linear-gradient(180deg,_rgba(255,251,235,0.95)_0%,_rgba(255,255,255,0.92)_100%)] p-5 shadow-[0_24px_48px_-36px_rgba(217,119,6,0.18)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">
              Inactivos
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">{inactiveUsers}</div>
          </div>
        </section>

        <section className="space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_28px_56px_-42px_rgba(3,10,24,0.34)]">
          <div className="flex flex-col gap-4">
            <div>
              <PriorityCardTitle>Directorio ERP</PriorityCardTitle>
              <PriorityTypography variant="bodyMuted" className="mt-1">
                El login usa username o correo, pero solo permite acceso a usuarios activos.
              </PriorityTypography>
            </div>

            <PriorityToolbar className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto]">
              <PriorityInput
                placeholder="Buscar usuario"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <PrioritySelectField
                value={roleFilter}
                onValueChange={setRoleFilter}
                placeholder="Rol"
                options={roleOptions}
              />
              <PrioritySelectField
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
                placeholder="Estatus"
                options={[
                  { value: "todos", label: "Todos los estatus" },
                  { value: "activo", label: "Activo" },
                  { value: "inactivo", label: "Inactivo" },
                ]}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearch("")
                  setRoleFilter("todos")
                  setStatusFilter("todos")
                }}
              >
                Limpiar
              </Button>
            </PriorityToolbar>
          </div>

          <div className="rounded-[22px] border border-[rgba(144,158,174,0.16)] bg-[rgba(11,31,59,0.04)] px-4 py-3 text-sm text-[#526175]">
            Usuario actual: <span className="font-semibold text-[var(--brand-navy)]">{currentUserEmail}</span>
          </div>

          {tableFeedback ? (
            <PrioritySectionAlert title="Operacion completada" variant="success">
              {tableFeedback}
            </PrioritySectionAlert>
          ) : null}

          {tableError ? (
            <PrioritySectionAlert title="No se pudo completar la accion" variant="destructive">
              {tableError}
            </PrioritySectionAlert>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 rounded-[18px]" />
              <Skeleton className="h-12 rounded-[18px]" />
              <Skeleton className="h-12 rounded-[18px]" />
            </div>
          ) : (
            <PriorityDataTable
              columns={columns}
              data={filteredUsers}
              emptyTitle="No hay usuarios que coincidan con los filtros"
              emptyDescription="Ajusta la búsqueda o crea un nuevo usuario para el directorio ERP."
            />
          )}
        </section>
      </div>

      {showCreateModal ? (
        <Modal
          title={editingUser ? "Editar usuario" : "Anadir usuario"}
          description="Administra el perfil ERP y las credenciales de acceso del usuario."
          onClose={() => {
            setShowCreateModal(false)
            resetForm()
          }}
        >
          <div className="space-y-5">
            <UserForm
              values={formValues}
              roles={roles}
              passwordRequired={!editingUser}
              onChange={handleChange}
            />

            {formError ? (
              <div className="rounded-[22px] border border-[rgba(239,68,68,0.16)] bg-[rgba(254,242,242,0.95)] px-4 py-3 text-sm text-[#B91C1C]">
                {formError}
              </div>
            ) : null}

            <PrioritySubmitBar>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? <Spinner className="text-current" /> : null}
                {submitting ? "Guardando..." : editingUser ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </PrioritySubmitBar>
          </div>
        </Modal>
      ) : null}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(244,246,249,0.96)_100%)] p-0 text-[var(--brand-navy)] shadow-[0_36px_80px_-36px_rgba(3,10,24,0.55)]">
          <AlertDialogHeader className="px-6 pt-6 text-left sm:place-items-start sm:text-left">
            <AlertDialogMedia className="bg-[rgba(179,58,91,0.08)] text-[var(--brand-burgundy)]">
              <ShieldAlertIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Vas a eliminar a ${getDisplayName(pendingDelete)}. Esta accion no se puede deshacer y primero debes asegurarte de que no tenga relaciones operativas activas.`
                : "Confirma la eliminacion del usuario."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rounded-b-[28px] border-t border-[var(--border-subtle)] bg-[rgba(11,31,59,0.03)] px-6 py-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDeleteUser()}>
              Eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  )
}
