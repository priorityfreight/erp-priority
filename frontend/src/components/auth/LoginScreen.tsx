"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { getCurrentErpUser, linkCurrentAuthUser, resolveLoginIdentity } from "@/lib/auth"

type LoginScreenProps = {
  reason?: string
}

export function LoginScreen({ reason }: LoginScreenProps) {
  const router = useRouter()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const statusMessage = useMemo(() => {
    if (reason === "inactive") {
      return "Tu usuario no tiene acceso activo. Contacta al administrador del ERP."
    }

    return null
  }, [reason])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const email = await resolveLoginIdentity(login)

      if (!email) {
        throw new Error("Usuario o contraseña incorrectos.")
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error("Usuario o contraseña incorrectos.")
      }

      await linkCurrentAuthUser()
      const erpUser = await getCurrentErpUser()

      if (!erpUser?.active) {
        await supabase.auth.signOut()
        throw new Error("Tu usuario no tiene acceso activo. Contacta al administrador del ERP.")
      }

      router.replace("/")
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo iniciar sesion.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFF8EF]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,143,77,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_34%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center rounded-full border border-[#FED7AA] bg-[#FFF1E6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#C2410C]">
              Priority Logistics ERP
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-[#0F172A] sm:text-5xl">
              Acceso seguro al hub operativo y comercial.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#475569] sm:text-lg">
              Inicia sesion con tu usuario asignado para entrar al dashboard, CRM, pricing y
              master data. Solo usuarios activos del ERP pueden continuar.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                  Control
                </p>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                  Acceso bloqueado antes del homepage
                </p>
              </div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                  Seguridad
                </p>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                  Sesion por cookies con Supabase Auth
                </p>
              </div>
              <div className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                  Usuarios
                </p>
                <p className="mt-2 text-sm font-medium text-[#0F172A]">
                  Solo perfiles ERP activos pueden entrar
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#E2E8F0] bg-white p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-[#0F172A]">Iniciar sesion</h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Usa tu username o correo asignado y tu contrasena de acceso.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#0F172A]">Usuario</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  placeholder="usuario o correo"
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[#0F172A]">Contrasena</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#F97316] focus:ring-2 focus:ring-[#FDBA74]"
                  required
                />
              </label>

              {statusMessage ? (
                <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                  {statusMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-[#F97316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Validando acceso..." : "Entrar al ERP"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-xs leading-6 text-[#64748B]">
              La contrasena se valida con Supabase Auth. El ERP solo permite el acceso si el
              usuario existe en el directorio interno y esta activo.
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
