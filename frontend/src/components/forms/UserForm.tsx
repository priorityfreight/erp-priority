import {
  PriorityFormField,
  PriorityFormGrid,
  PriorityFormSection,
  PriorityInput,
  PrioritySelectField,
} from "@/components/priority/PriorityForm"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { UserRole } from "@/lib/db"

export type UserFormValues = {
  fullName: string
  roleName: string
  email: string
  phone: string
  username: string
  password: string
  status: "activo" | "inactivo"
}

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
  return (
    <div className="space-y-5">
      <PriorityFormSection
        title="Perfil del usuario"
        description="Datos base del usuario asignado dentro del ERP."
      >
        <PriorityFormGrid className="xl:grid-cols-2">
          <PriorityFormField label="Nombre">
            <PriorityInput
              type="text"
              value={values.fullName}
              onChange={(event) => onChange("fullName", event.target.value)}
              placeholder="Nombre completo"
            />
          </PriorityFormField>

          <PriorityFormField label="Rol">
            <PrioritySelectField
              value={values.roleName}
              onValueChange={(value) => onChange("roleName", value)}
              placeholder="Selecciona un rol"
              options={[
                { value: "", label: "Selecciona un rol" },
                ...roles.map((role) => ({ value: role.name, label: role.name })),
              ]}
            />
          </PriorityFormField>

          <PriorityFormField label="Correo">
            <PriorityInput
              type="email"
              value={values.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="correo@empresa.com"
            />
          </PriorityFormField>

          <PriorityFormField label="Telefono">
            <PriorityInput
              type="text"
              value={values.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              placeholder="+52 81 0000 0000"
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>

      <PriorityFormSection
        title="Acceso"
        description="Credenciales y estatus de acceso al ERP."
      >
        <PriorityFormGrid className="xl:grid-cols-2">
          <PriorityFormField label="Username">
            <PriorityInput
              type="text"
              value={values.username}
              onChange={(event) => onChange("username", event.target.value)}
              placeholder="usuario.erp"
            />
          </PriorityFormField>

          <PriorityFormField label="Estatus">
            <div className="space-y-3">
              <ToggleGroup
                type="single"
                value={values.status}
                onValueChange={(value) => {
                  if (value) {
                    onChange("status", value as UserFormValues["status"])
                  }
                }}
                className="w-full justify-start"
              >
                <ToggleGroupItem value="activo" className="min-w-[120px]">
                  Activo
                </ToggleGroupItem>
                <ToggleGroupItem value="inactivo" className="min-w-[120px]">
                  Inactivo
                </ToggleGroupItem>
              </ToggleGroup>
              <PriorityTypography variant="caption">
                Controla si el usuario puede autenticarse y operar dentro del ERP.
              </PriorityTypography>
            </div>
          </PriorityFormField>

          <PriorityFormField
            label={passwordRequired ? "Contrasena" : "Nueva contrasena"}
            className="md:col-span-2"
          >
            <PriorityInput
              type="password"
              value={values.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder={
                passwordRequired ? "Minimo 8 caracteres" : "Dejar vacio para no cambiar"
              }
            />
          </PriorityFormField>
        </PriorityFormGrid>
      </PriorityFormSection>
    </div>
  )
}
