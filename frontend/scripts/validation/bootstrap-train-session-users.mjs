import path from "node:path"
import {
  assertWritableClone,
  createSupabaseAdminClient,
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  validationSessionEmailDomain,
  writeJson,
  writeText,
} from "./shared/config.mjs"
import { buildSessionPoolCounts, loadProfiles } from "./shared/hardeningThresholds.mjs"

const personaDefinitions = [
  {
    persona: "sales",
    roleName: "Ventas",
    routePath: "/quotations",
    deniedRoutePaths: ["/pricing/quotations", "/master-data/users/roles"],
  },
  {
    persona: "pricing",
    roleName: "Pricing",
    routePath: "/pricing/quotations",
    deniedRoutePaths: ["/master-data/users/roles"],
  },
  {
    persona: "admin",
    roleName: "Admin",
    routePath: "/master-data/users/roles",
    deniedRoutePaths: [],
  },
]

function buildPassword(persona) {
  return `TrainQa!${persona.slice(0, 3)}_${crypto.randomUUID().slice(0, 10)}`
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  assertWritableClone(context)

  const loadLevel = context.env.VALIDATION_LOAD_LEVEL || "light"
  const loadProfile = loadProfiles[loadLevel]

  if (!loadProfile) {
    throw new Error(`Unsupported VALIDATION_LOAD_LEVEL for session bootstrap: ${loadLevel}`)
  }

  const requiredCounts = buildSessionPoolCounts(loadProfile)
  const client = createSupabaseAdminClient(context, { requireWritableClone: true })
  const generatedAt = isoTimestamp()
  const generatedFilePath = path.join(context.paths.runtimeValidationDir, "session-users.generated.json")
  const summaryJsonPath = path.join(context.paths.generatedDocsDir, "live-local-session-users.json")
  const summaryMdPath = path.join(context.paths.docsValidationDir, "live-local-session-users.md")

  const { data: roles, error: rolesError } = await client
    .from("roles")
    .select("id,name")
    .in(
      "name",
      personaDefinitions.map((item) => item.roleName)
    )

  if (rolesError) {
    throw rolesError
  }

  const roleMap = new Map((roles ?? []).map((role) => [String(role.name).toLowerCase(), String(role.id)]))
  const missingRoles = personaDefinitions.filter((item) => !roleMap.has(item.roleName.toLowerCase()))

  if (missingRoles.length > 0) {
    throw new Error(`Missing TRAIN roles for validation bootstrap: ${missingRoles.map((item) => item.roleName).join(", ")}`)
  }

  const { data: branches, error: branchesError } = await client.from("branches").select("id").limit(2)
  if (branchesError) {
    throw branchesError
  }

  const defaultBranchId = (branches ?? []).length === 1 ? String(branches[0].id) : null
  const stamp = Date.now()
  const records = []

  for (const definition of personaDefinitions) {
    const personaCount = requiredCounts[definition.persona] ?? 1

    for (let index = 0; index < personaCount; index += 1) {
      const password = buildPassword(definition.persona)
      const email = `${definition.persona}.${stamp}.${index}@${validationSessionEmailDomain}`
      const firstName = `TRAIN_${definition.persona.toUpperCase()}`
      const lastName = `VALIDATION_${stamp}_${index}`

      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          validation_persona: definition.persona,
          validation_scope: "train-hardening",
          validation_load_level: loadLevel,
          validation_pool_index: index,
        },
      })

      if (authError || !authData.user?.id) {
        throw authError ?? new Error(`Failed to create auth user for ${definition.persona}.`)
      }

      const userPayload = {
        auth_user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        username: `${definition.persona}_${stamp}_${index}`,
        role_id: roleMap.get(definition.roleName.toLowerCase()),
        branch_id: defaultBranchId,
        active: true,
      }

      const { data: userRow, error: userError } = await client
        .from("users")
        .upsert(userPayload, {
          onConflict: "email",
          ignoreDuplicates: false,
        })
        .select("id")
        .single()

      if (userError || !userRow?.id) {
        await client.auth.admin.deleteUser(authData.user.id)
        throw userError ?? new Error(`Failed to create ERP user for ${definition.persona}.`)
      }

      records.push({
        persona: definition.persona,
        roleName: definition.roleName,
        poolIndex: index,
        loadLevel,
        email,
        password,
        routePath: definition.routePath,
        deniedRoutePaths: definition.deniedRoutePaths,
        authUserId: authData.user.id,
        erpUserId: String(userRow.id),
        generatedAt,
      })
    }
  }

  await writeJson(generatedFilePath, records)
  await writeJson(summaryJsonPath, {
    generatedAt,
    loadLevel,
    requiredCounts,
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
    },
    generatedFilePath,
      records: records.map((item) => ({
        persona: item.persona,
        roleName: item.roleName,
        email: item.email,
        routePath: item.routePath,
        deniedRoutePaths: item.deniedRoutePaths,
        authUserId: item.authUserId,
        erpUserId: item.erpUserId,
      })),
    note: "Passwords are stored only in the runtime-generated session users file under frontend/.validation and should be removed by validation:cleanup.",
  })
  await writeText(
    summaryMdPath,
    [
      "# Live/Local Validation Session Users",
      "",
      `- Generated at: \`${generatedAt}\``,
      `- Load level: \`${loadLevel}\``,
      `- Target project ref: \`${context.target.projectRef}\``,
      `- Runtime credentials file: \`${generatedFilePath}\``,
      "",
      "## Session Pool Counts",
      "",
      `- Sales: \`${requiredCounts.sales}\``,
      `- Pricing: \`${requiredCounts.pricing}\``,
      `- Admin: \`${requiredCounts.admin}\``,
      "",
      "## Personas",
      "",
      ...records.map(
        (item) =>
          `- \`${item.persona}\`: \`${item.email}\` -> route \`${item.routePath}\`${item.deniedRoutePaths.length > 0 ? `, denied ${item.deniedRoutePaths.map((route) => `\`${route}\``).join(", ")}` : ""}`
      ),
      "",
      "Passwords are stored only in the runtime credentials file and must be removed by cleanup.",
      "",
    ].join("\n")
  )

  console.log(`Validation session users generated at ${generatedFilePath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
