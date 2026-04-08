"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { getCurrentErpUser, linkCurrentAuthUser, resolveLoginIdentity } from "@/lib/auth"
import { usePrioritySchemaForm } from "@/lib/forms/usePrioritySchemaForm"
import { loginFormSchema, type LoginFormSchemaValues } from "@/features/auth/schemas/login-form"
import { Brand } from "@/components/layout/Brand"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type LoginScreenProps = {
  reason?: string
}

const defaultValues: LoginFormSchemaValues = {
  login: "",
  password: "",
}

export function LoginScreen({ reason }: LoginScreenProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = usePrioritySchemaForm({
    schema: loginFormSchema,
    defaultValues,
    disabled: submitting,
  })

  const statusMessage = useMemo(() => {
    if (reason === "inactive") {
      return "Tu usuario no tiene acceso activo. Contacta al administrador del ERP."
    }

    return null
  }, [reason])

  const loginError = form.formState.errors.login?.message
  const passwordError = form.formState.errors.password?.message

  async function handleSubmit(values: LoginFormSchemaValues) {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const email = await resolveLoginIdentity(values.login)

      if (!email) {
        throw new Error("Usuario o contraseña incorrectos.")
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
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
      setErrorMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(179,58,91,0.26),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(144,158,174,0.14),_transparent_20%),linear-gradient(180deg,_#06101f_0%,_#0B1F3B_48%,_#081426_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.03),_transparent_28%),linear-gradient(320deg,_rgba(179,58,91,0.12),_transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="flex flex-col justify-center">
            <div className="w-fit rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-soft-gray)]">
              Acceso seguro al ERP
            </div>

            <div className="mt-8">
              <Brand showTagline light />
            </div>

            <h1 className="mt-8 max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-balance text-white sm:text-5xl">
              Entra directo a clientes, cotizaciones y operación.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--brand-soft-gray)] sm:text-lg">
              Un solo acceso para revisar pendientes, capturar información y seguir el trabajo del día sin duplicidad.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-gray)]">
                  Acceso
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-white">
                  Entras con tu usuario asignado y solo si tu perfil está activo.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-gray)]">
                  Flujo
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-white">
                  Clientes, cotizaciones y catálogos comparten la misma información operativa.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-gray)]">
                  Claridad
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-white">
                  Cada pantalla está pensada para ubicarte rápido y dejarte actuar con menos capacitación.
                </p>
              </div>
            </div>
          </section>

          <section className="brand-card rounded-[32px] p-8 sm:p-10">
            <div className="mb-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-burgundy)]">
                Inicio de sesión
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[var(--brand-navy)]">
                Inicia sesión
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#526175]">
                Usa tu usuario o correo asignado y entra directo al sistema.
              </p>
            </div>

            <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--brand-navy)]">
                  Usuario o correo <span className="text-[var(--brand-burgundy)]">*</span>
                </span>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="usuario o correo…"
                  className="h-12 rounded-[20px] border-[#D1D6DF] bg-white px-4 text-sm text-[var(--brand-navy)]"
                  aria-invalid={Boolean(loginError)}
                  disabled={submitting}
                  {...form.register("login")}
                />
                {loginError ? <p className="text-xs text-[#8E1B1B]">{loginError}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--brand-navy)]">
                  Contraseña <span className="text-[var(--brand-burgundy)]">*</span>
                </span>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="contraseña…"
                  className="h-12 rounded-[20px] border-[#D1D6DF] bg-white px-4 text-sm text-[var(--brand-navy)]"
                  aria-invalid={Boolean(passwordError)}
                  disabled={submitting}
                  {...form.register("password")}
                />
                {passwordError ? <p className="text-xs text-[#8E1B1B]">{passwordError}</p> : null}
              </label>

              {statusMessage ? (
                <Alert className="border-[#F6D9A4] bg-[#FFF4DE] text-[#8C5A02]">
                  <AlertTitle>Acceso restringido</AlertTitle>
                  <AlertDescription className="text-[#8C5A02]">{statusMessage}</AlertDescription>
                </Alert>
              ) : null}

              {errorMessage ? (
                <Alert variant="destructive" className="border-[#F2B6B6] bg-[#FFF0F0] text-[#8E1B1B]">
                  <AlertTitle>No se pudo iniciar sesión</AlertTitle>
                  <AlertDescription className="text-[#8E1B1B]">{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-[22px] bg-[linear-gradient(135deg,_#B33A5B,_#800020)] text-sm font-semibold text-white shadow-[0_20px_34px_-22px_rgba(128,0,32,0.85)] hover:translate-y-[-1px] hover:shadow-[0_26px_40px_-22px_rgba(128,0,32,0.88)]"
              >
                {submitting ? "Validando acceso…" : "Entrar al ERP"}
              </Button>
            </form>

            <div className="mt-6 rounded-[22px] border border-[#DDE2EA] bg-[rgba(11,31,59,0.05)] px-4 py-4 text-xs leading-7 text-[#5B6A7D]">
              La autenticación se valida con Supabase Auth. El ERP solo abre el acceso si tu usuario existe en el directorio interno y está activo.
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
