"use client"

import { useMemo } from "react"
import type { UserRole } from "@/lib/db"
import { PrioritySectionAlert } from "@/components/priority"
import { PriorityFormEngine } from "@/components/priority/forms/PriorityFormEngine"
import type { FormSchemaDefinition } from "@/lib/forms/types"
import { userFormSchema, type UserFormSchemaValues } from "@/features/master-data/users/schemas/user-form"

export type UserFormValues = UserFormSchemaValues

type UserFormProps = {
  values: UserFormValues
  roles: UserRole[]
  passwordRequired?: boolean
  onChange: (field: keyof UserFormValues, value: string) => void
}

export function UserForm({
  values,
  roles,
  passwordRequired = false,
  onChange,
}: UserFormProps) {
  const schemaDefinition = useMemo<FormSchemaDefinition<typeof userFormSchema>>(
    () => ({
      schema: userFormSchema,
      title: "Perfil del usuario",
      description: "Datos base, acceso y estatus operativo del usuario dentro del ERP.",
      sections: [
        {
          id: "profile",
          title: "Perfil del usuario",
          description: "Datos base del usuario asignado dentro del ERP.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "fullName",
              type: "text",
              label: "Nombre",
              placeholder: "Nombre completo",
              required: true,
            },
            {
              name: "roleName",
              type: "select",
              label: "Rol",
              placeholder: "Selecciona un rol",
              required: true,
              options: roles.map((role) => ({ value: role.name, label: role.name })),
            },
            {
              name: "email",
              type: "text",
              label: "Correo",
              placeholder: "correo@empresa.com",
              required: true,
            },
            {
              name: "phone",
              type: "text",
              label: "Teléfono",
              placeholder: "+52 81 0000 0000",
            },
          ],
        },
        {
          id: "access",
          title: "Acceso",
          description: "Credenciales y estatus de acceso al ERP.",
          columnsClassName: "xl:grid-cols-3",
          fields: [
            {
              name: "username",
              type: "text",
              label: "Username",
              placeholder: "usuario.erp",
              required: true,
            },
            {
              name: "status",
              type: "toggle-group",
              label: "Estatus",
              helperText: "Controla si el usuario puede autenticarse y operar dentro del ERP.",
              required: true,
              options: [
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ],
            },
            {
              name: "password",
              type: "text",
              label: passwordRequired ? "Contraseña" : "Nueva contraseña",
              placeholder: passwordRequired ? "Mínimo 8 caracteres" : "Dejar vacío para no cambiar",
              className: "md:col-span-2",
              required: passwordRequired,
            },
          ],
        },
      ],
    }),
    [passwordRequired, roles]
  )

  return (
    <PriorityFormEngine
      schemaDefinition={schemaDefinition}
      values={values}
      density="compact"
      onFieldChange={(field, value) => onChange(field as keyof UserFormValues, String(value ?? ""))}
      afterSections={(currentValues) => {
        const passwordLength = currentValues.password.trim().length

        return passwordRequired && passwordLength > 0 && passwordLength < 8 ? (
          <PrioritySectionAlert title="Contraseña incompleta" variant="warning">
            La contraseña inicial debe tener al menos 8 caracteres para crear al usuario.
          </PrioritySectionAlert>
        ) : null
      }}
    />
  )
}
