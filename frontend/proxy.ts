import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/supabase"

function createLoginRedirect(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = "/login"
  redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname)
  return redirectUrl
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const isLoginRoute = request.nextUrl.pathname === "/login"
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/")
  const { data: authData } = await supabase.auth.getUser()
  const authUser = authData.user

  if (!authUser) {
    if (isLoginRoute) {
      return response
    }

    return NextResponse.redirect(createLoginRedirect(request))
  }

  const { data: profileData, error: profileError } = await supabase.rpc("get_current_erp_user")
  const activeProfile = Array.isArray(profileData) ? profileData[0] : profileData

  if (profileError || !activeProfile) {
    await supabase.auth.signOut()

    if (isLoginRoute) {
      return response
    }

    const redirectUrl = createLoginRedirect(request)
    redirectUrl.searchParams.set("reason", "inactive")
    return NextResponse.redirect(redirectUrl)
  }

  if (isLoginRoute) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    homeUrl.search = ""
    return NextResponse.redirect(homeUrl)
  }

  if (isApiRoute) {
    return response
  }

  const { data: routeAccess, error: routeError } = await supabase.rpc("erp_can_access_route", {
    p_route_path: request.nextUrl.pathname,
    p_action_code: "view",
  })

  if (routeError || !routeAccess) {
    const fallbackUrl = request.nextUrl.clone()
    fallbackUrl.pathname = "/"
    fallbackUrl.searchParams.set("reason", "forbidden")
    return NextResponse.redirect(fallbackUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
}
