#!/usr/bin/env node

import process from "node:process"
import path from "node:path"
import { createRequire } from "node:module"

const repoRoot = process.cwd()
const require = createRequire(path.join(repoRoot, "frontend", "package.json"))
const { createClient } = require("@supabase/supabase-js")

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim()
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME?.trim() || null
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME?.trim() || null
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || null

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "Required envs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD. Optional: ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_USERNAME."
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function findAdminRoleId() {
  const result = await supabase.from("roles").select("id,name").eq("name", "Admin").maybeSingle()
  if (result.error) throw result.error
  if (!result.data?.id) {
    throw new Error("Admin role not found in roles table.")
  }
  return result.data.id
}

async function ensureAuthUser() {
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (list.error) throw list.error
  const existing = list.data.users.find((user) => (user.email || "").toLowerCase() === ADMIN_EMAIL)

  if (existing) {
    const update = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
      },
    })
    if (update.error) throw update.error
    return update.data.user
  }

  const created = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
    },
  })
  if (created.error) throw created.error
  return created.data.user
}

async function ensurePublicUser({ authUserId, adminRoleId }) {
  const existing = await supabase
    .from("users")
    .select("id,auth_user_id,email,username")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle()

  if (existing.error) throw existing.error

  const payload = {
    auth_user_id: authUserId,
    email: ADMIN_EMAIL,
    first_name: ADMIN_FIRST_NAME,
    last_name: ADMIN_LAST_NAME,
    username: ADMIN_USERNAME,
    role_id: adminRoleId,
    active: true,
  }

  if (existing.data?.id) {
    const update = await supabase.from("users").update(payload).eq("id", existing.data.id).select("id").single()
    if (update.error) throw update.error
    return update.data.id
  }

  const insert = await supabase.from("users").insert(payload).select("id").single()
  if (insert.error) throw insert.error
  return insert.data.id
}

async function main() {
  const adminRoleId = await findAdminRoleId()
  const authUser = await ensureAuthUser()
  const publicUserId = await ensurePublicUser({
    authUserId: authUser.id,
    adminRoleId,
  })

  console.log(
    JSON.stringify(
      {
        project: SUPABASE_URL,
        email: ADMIN_EMAIL,
        authUserId: authUser.id,
        publicUserId,
        role: "Admin",
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
