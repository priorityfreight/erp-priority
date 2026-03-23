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
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
            Perfil del usuario
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Datos base del usuario asignado dentro del ERP.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#0F172A]">Nombre</span>
            <input
              type="text"
              value={values.fullName}
              onChange={(event) => onChange("fullName", event.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#0F172A]">Rol</span>
            <select
              value={values.roleName}
              onChange={(event) => onChange("roleName", event.target.value)}
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
            >
              <option value="">Selecciona un rol</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#0F172A]">Correo</span>
            <input
              type="email"
              value={values.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="correo@empresa.com"
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#0F172A]">Telefono</span>
            <input
              type="text"
              value={values.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              placeholder="+52 81 0000 0000"
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
            Acceso
          </h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Credenciales y estatus de acceso al ERP.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#0F172A]">Username</span>
            <input
              type="text"
              value={values.username}
              onChange={(event) => onChange("username", event.target.value)}
              placeholder="usuario.erp"
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#0F172A]">Estatus</span>
            <select
              value={values.status}
              onChange={(event) =>
                onChange("status", event.target.value as UserFormValues["status"])
              }
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-[#0F172A]">
              {passwordRequired ? "Contrasena" : "Nueva contrasena"}
            </span>
            <input
              type="password"
              value={values.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder={passwordRequired ? "Minimo 8 caracteres" : "Dejar vacio para no cambiar"}
              className="w-full rounded-xl border border-[#CBD5E1] px-3 py-2.5 text-sm outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
            />
          </label>
        </div>
      </section>
    </div>
  )
}
