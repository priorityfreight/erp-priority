"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { getCurrentErpUser, linkCurrentAuthUser, resolveLoginIdentity } from "@/lib/auth"
import { Brand } from "@/components/layout/Brand"

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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(179,58,91,0.26),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(144,158,174,0.14),_transparent_20%),linear-gradient(180deg,_#06101f_0%,_#0B1F3B_48%,_#081426_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.03),_transparent_28%),linear-gradient(320deg,_rgba(179,58,91,0.12),_transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="flex flex-col justify-center">
            <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-soft-gray)]">
              Secure Access Portal
            </div>

            <div className="mt-8">
              <Brand showTagline light />
            </div>

            <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-[0.02em] text-white sm:text-5xl">
              El centro corporativo para ventas, pricing y operación logística.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--brand-soft-gray)] sm:text-lg">
              Acceso controlado con usuarios asignados, identidad corporativa y seguridad centralizada antes
              de entrar al ERP.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-gray)]">
                  Seguridad
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-white">
                  Login protegido antes del homepage y acceso solo para usuarios activos.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-gray)]">
                  Inteligencia
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-white">
                  CRM, pricing y master data operan sobre un backend sincronizado y trazable.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-gray)]">
                  Rendimiento
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-white">
                  Una sola plataforma para capturar, cotizar y convertir sin duplicidad operativa.
                </p>
              </div>
            </div>
          </section>

          <section className="brand-card rounded-[32px] p-8 sm:p-10">
            <div className="mb-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--brand-burgundy)]">
                User Login
              </div>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--brand-navy)]">Iniciar sesion</h2>
              <p className="mt-2 text-sm leading-7 text-[#526175]">
                Usa tu username o correo asignado con la contraseña definida por administración.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--brand-navy)]">Usuario</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  placeholder="usuario o correo"
                  className="w-full rounded-[20px] border border-[#D1D6DF] bg-white px-4 py-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)] focus:ring-2 focus:ring-[rgba(179,58,91,0.18)]"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--brand-navy)]">Contrasena</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  className="w-full rounded-[20px] border border-[#D1D6DF] bg-white px-4 py-3 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-burgundy-light)] focus:ring-2 focus:ring-[rgba(179,58,91,0.18)]"
                  required
                />
              </label>

              {statusMessage ? (
                <div className="rounded-[20px] border border-[#F6D9A4] bg-[#FFF4DE] px-4 py-3 text-sm text-[#8C5A02]">
                  {statusMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-[20px] border border-[#F2B6B6] bg-[#FFF0F0] px-4 py-3 text-sm text-[#8E1B1B]">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-[22px] bg-[linear-gradient(135deg,_#B33A5B,_#800020)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[0_20px_34px_-22px_rgba(128,0,32,0.85)] hover:translate-y-[-1px] hover:shadow-[0_26px_40px_-22px_rgba(128,0,32,0.88)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Validando acceso..." : "Entrar al ERP"}
              </button>
            </form>

            <div className="mt-6 rounded-[22px] border border-[#DDE2EA] bg-[rgba(11,31,59,0.05)] px-4 py-4 text-xs leading-7 text-[#5B6A7D]">
              La contraseña se valida con Supabase Auth. El ERP solo permite acceso si el usuario
              existe en el directorio interno y está activo.
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
