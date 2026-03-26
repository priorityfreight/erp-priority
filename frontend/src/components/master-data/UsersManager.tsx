"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Modal } from "@/components/data/Modal"
import { StatusBadge } from "@/components/data/StatusBadge"
import { PageContainer } from "@/components/layout/PageContainer"
import { UserForm, type UserFormValues } from "@/components/forms/UserForm"
import { getUserRoles, getUsers, type User, type UserRole } from "@/lib/db"

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
  const [formValues, setFormValues] = useState<UserFormValues>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [tableError, setTableError] = useState<string | null>(null)
  const [tableFeedback, setTableFeedback] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      const [userRows, roleRows] = await Promise.all([
        getUsers(),
        getUserRoles(),
      ])
      setUsers(userRows)
      setRoles(roleRows)
      setTableError(null)
    } catch (error) {
      console.error(error)
      setTableError(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.")
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

      return [
        getDisplayName(user),
        user.email,
        user.username || "",
        user.role_name || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [deferredSearch, roleFilter, statusFilter, users])

  const activeUsers = users.filter((user) => user.active).length
  const inactiveUsers = users.length - activeUsers

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

  function buildUpdatePayload(user: User, overrides?: Partial<{
    active: boolean
    roleName: string
    phone: string | null
    username: string | null
    firstName: string
    lastName: string
  }>) {
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
      setTableError(
        error instanceof Error ? error.message : "No se pudo actualizar el estatus del usuario."
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteUser(user: User) {
    if (user.id === currentUserId) {
      setTableError("No puedes eliminar tu propio usuario administrador.")
      return
    }

    const confirmed = window.confirm(
      `Vas a eliminar al usuario ${getDisplayName(user)}. Esta accion no se puede deshacer.`
    )

    if (!confirmed) {
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
          userId: user.id,
          authUserId: user.auth_user_id ?? null,
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
      await loadUsers()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el usuario."
      setTableError(message)
      window.alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer
      title="Usuarios"
      description="Directorio de acceso ERP para usuarios asignados, roles y estatus de acceso."
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/master-data/users/roles"
            className="rounded-md border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-medium text-[#334155] shadow-sm hover:bg-[#F8FAFC]"
          >
            Roles y permisos
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            Anadir usuario
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Total usuarios
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{users.length}</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Activos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{activeUsers}</div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Inactivos
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{inactiveUsers}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-lg font-semibold text-[#111827]">Directorio ERP</div>
              <div className="text-sm text-[#6B7280]">
                El login usa username o correo, pero solo permite acceso a usuarios activos.
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Buscar usuario"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="todos">Todos los roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as typeof statusFilter)
                }
              >
                <option value="todos">Todos los estatus</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]">
            Usuario actual: <span className="font-semibold text-[#0F172A]">{currentUserEmail}</span>
          </div>

          {tableFeedback ? (
            <div className="mb-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
              {tableFeedback}
            </div>
          ) : null}

          {tableError ? (
            <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {tableError}
            </div>
          ) : null}

          {filteredUsers.length === 0 ? (
            <p className="text-sm text-[#6B7280]">
              No hay usuarios que coincidan con los filtros actuales.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Correo</th>
                    <th className="px-4 py-3">Telefono</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3">Auth</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-medium text-[#111827]">{getDisplayName(user)}</td>
                      <td className="px-4 py-3 text-[#475569]">{user.role_name || "Sin rol"}</td>
                      <td className="px-4 py-3 text-[#475569]">{user.email}</td>
                      <td className="px-4 py-3 text-[#475569]">{user.phone || "No disponible"}</td>
                      <td className="px-4 py-3 text-[#475569]">{user.username || "No asignado"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.active ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {user.auth_user_id ? "Vinculado" : "Pendiente"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="rounded-md border border-[#D1D5DB] px-3 py-2 text-xs font-medium text-[#374151] hover:bg-[#F8FAFC]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleActive(user)}
                            disabled={submitting}
                            className={[
                              "rounded-md px-3 py-2 text-xs font-medium text-white",
                              user.active
                                ? "bg-[#B45309] hover:bg-[#92400E]"
                                : "bg-[#047857] hover:bg-[#065F46]",
                              submitting ? "cursor-not-allowed opacity-70" : "",
                            ].join(" ")}
                          >
                            {user.active ? "Inactivar" : "Activar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteUser(user)}
                            disabled={submitting}
                            className="rounded-md border border-[#FCA5A5] px-3 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <div className="space-y-6">
            <UserForm
              values={formValues}
              roles={roles}
              passwordRequired={!editingUser}
              onChange={handleChange}
            />

            {formError ? (
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                {formError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="rounded-md border border-[#D1D5DB] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Guardando..." : editingUser ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </PageContainer>
  )
}
