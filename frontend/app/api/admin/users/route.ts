import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"

type UserPayload = {
  userId?: string
  authUserId?: string | null
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  username?: string | null
  roleName: string
  active: boolean
  password?: string | null
}

async function getAdminClients() {
  const sessionClient = await createSupabaseServerClient()
  const { data, error } = await sessionClient.rpc("get_current_erp_user")
  const currentUser = Array.isArray(data) ? data[0] : data

  if (error || !currentUser || currentUser.role_name !== "Admin") {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    return {
      error: NextResponse.json(
        {
          error:
            "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to enable secure password provisioning.",
        },
        { status: 500 }
      ),
    }
  }

  const adminClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return { sessionClient, adminClient, currentUser }
}

export async function POST(request: Request) {
  const clients = await getAdminClients()

  if ("error" in clients) {
    return clients.error
  }

  const { sessionClient, adminClient } = clients
  const payload = (await request.json()) as UserPayload

  try {
    const password = payload.password?.trim()

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must contain at least 8 characters." },
        { status: 400 }
      )
    }

    const createAuthResult = await adminClient.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        username: payload.username?.trim().toLowerCase() || null,
      },
    })

    if (createAuthResult.error || !createAuthResult.data.user) {
      return NextResponse.json(
        { error: createAuthResult.error?.message ?? "Could not create auth user." },
        { status: 400 }
      )
    }

    const authUserId = createAuthResult.data.user.id
    const profileResult = await sessionClient.rpc("create_erp_user_profile", {
      p_first_name: payload.firstName,
      p_last_name: payload.lastName || undefined,
      p_email: payload.email.trim().toLowerCase(),
      p_phone: payload.phone?.trim() || undefined,
      p_username: payload.username?.trim().toLowerCase() || undefined,
      p_role_name: payload.roleName,
      p_active: payload.active,
      p_auth_user_id: authUserId || undefined,
    })

    if (profileResult.error) {
      await adminClient.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ error: profileResult.error.message }, { status: 400 })
    }

    return NextResponse.json({ id: profileResult.data, authUserId }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const clients = await getAdminClients()

  if ("error" in clients) {
    return clients.error
  }

  const { sessionClient, adminClient, currentUser } = clients
  const payload = (await request.json()) as UserPayload

  if (!payload.userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 })
  }

  try {
    if (payload.userId === currentUser.id && payload.active === false) {
      return NextResponse.json(
        { error: "No puedes inactivar tu propio usuario administrador." },
        { status: 400 }
      )
    }

    let resolvedAuthUserId = payload.authUserId ?? null
    const trimmedEmail = payload.email.trim().toLowerCase()
    const trimmedPassword = payload.password?.trim() || null

    if (resolvedAuthUserId) {
      const updateAuthResult = await adminClient.auth.admin.updateUserById(resolvedAuthUserId, {
        email: trimmedEmail,
        password: trimmedPassword || undefined,
        user_metadata: {
          username: payload.username?.trim().toLowerCase() || null,
        },
      })

      if (updateAuthResult.error) {
        return NextResponse.json({ error: updateAuthResult.error.message }, { status: 400 })
      }
    } else if (trimmedPassword) {
      const createAuthResult = await adminClient.auth.admin.createUser({
        email: trimmedEmail,
        password: trimmedPassword,
        email_confirm: true,
        user_metadata: {
          username: payload.username?.trim().toLowerCase() || null,
        },
      })

      if (createAuthResult.error || !createAuthResult.data.user) {
        return NextResponse.json(
          { error: createAuthResult.error?.message ?? "Could not create auth user." },
          { status: 400 }
        )
      }

      resolvedAuthUserId = createAuthResult.data.user.id
    }

    const profileResult = await sessionClient.rpc("update_erp_user_profile", {
      p_user_id: payload.userId,
      p_first_name: payload.firstName,
      p_last_name: payload.lastName || undefined,
      p_email: trimmedEmail,
      p_phone: payload.phone?.trim() || undefined,
      p_username: payload.username?.trim().toLowerCase() || undefined,
      p_role_name: payload.roleName,
      p_active: payload.active,
      p_auth_user_id: resolvedAuthUserId || undefined,
    })

    if (profileResult.error) {
      return NextResponse.json({ error: profileResult.error.message }, { status: 400 })
    }

    return NextResponse.json({ id: profileResult.data, authUserId: resolvedAuthUserId })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const clients = await getAdminClients()

  if ("error" in clients) {
    return clients.error
  }

  const { adminClient, currentUser } = clients
  const payload = (await request.json()) as Pick<UserPayload, "userId" | "authUserId">

  if (!payload.userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 })
  }

  if (payload.userId === currentUser.id) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propio usuario administrador." },
      { status: 400 }
    )
  }

  try {
    const { data: userRow, error: userLookupError } = await adminClient
      .from("users")
      .select("id, auth_user_id")
      .eq("id", payload.userId)
      .maybeSingle()

    if (userLookupError) {
      return NextResponse.json({ error: userLookupError.message }, { status: 400 })
    }

    if (!userRow) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 })
    }

    const resolvedAuthUserId = payload.authUserId ?? userRow.auth_user_id ?? null

    const [
      clientsOwned,
      opportunitiesOwned,
      quotationsCreated,
      quotationsOwned,
      commissionsOwned,
    ] = await Promise.all([
      adminClient.from("clients").select("id", { count: "exact", head: true }).eq("account_owner_id", payload.userId),
      adminClient.from("opportunities").select("id", { count: "exact", head: true }).eq("salesperson_id", payload.userId),
      adminClient.from("quotations").select("id", { count: "exact", head: true }).eq("created_by", payload.userId),
      adminClient.from("quotations").select("id", { count: "exact", head: true }).eq("pricing_owner_id", payload.userId),
      adminClient.from("commissions").select("id", { count: "exact", head: true }).eq("user_id", payload.userId),
    ])

    const blockingReferences = [
      { label: "clientes asignados", count: clientsOwned.count ?? 0 },
      { label: "oportunidades asignadas", count: opportunitiesOwned.count ?? 0 },
      { label: "cotizaciones creadas", count: quotationsCreated.count ?? 0 },
      { label: "cotizaciones de pricing", count: quotationsOwned.count ?? 0 },
      { label: "comisiones", count: commissionsOwned.count ?? 0 },
    ].filter((item) => item.count > 0)

    if (blockingReferences.length > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el usuario porque tiene historial relacionado: ${blockingReferences
            .map((item) => `${item.label} (${item.count})`)
            .join(", ")}. Reasigna o depura ese historial antes de intentar borrarlo, o usa estatus inactivo en su lugar.`,
          blockingReferences,
        },
        { status: 400 }
      )
    }

    await adminClient.from("audit_logs").update({ user_id: null }).eq("user_id", payload.userId)

    if (resolvedAuthUserId) {
      const deleteAuthResult = await adminClient.auth.admin.deleteUser(resolvedAuthUserId)

      if (
        deleteAuthResult.error &&
        !/user.*not found/i.test(deleteAuthResult.error.message)
      ) {
        return NextResponse.json({ error: deleteAuthResult.error.message }, { status: 400 })
      }
    }

    const deleteProfileResult = await adminClient.from("users").delete().eq("id", payload.userId)

    if (deleteProfileResult.error) {
      return NextResponse.json({ error: deleteProfileResult.error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    )
  }
}
