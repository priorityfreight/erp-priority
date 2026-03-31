import fs from "node:fs/promises"
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

async function deleteRows(client, table, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return
  }

  const { error } = await client.from(table).delete().in("id", ids)

  if (error) {
    throw error
  }
}

function mergeLedgerEntries(left = [], right = []) {
  const leftItems = Array.isArray(left) ? left : []
  const rightItems = Array.isArray(right) ? right : []
  return Array.from(new Set([...leftItems, ...rightItems].filter(Boolean)))
}

async function readLedgerIfPresent(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function readJsonIfPresent(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function cleanupValidationSessionUsers(client, context) {
  const generatedUsersPath = path.join(context.paths.runtimeValidationDir, "session-users.generated.json")
  const generatedUsers = await readJsonIfPresent(generatedUsersPath)
  const knownUsers = Array.isArray(generatedUsers) ? generatedUsers : []

  const knownErpUserIds = knownUsers
    .map((item) => item?.erpUserId)
    .filter((value) => typeof value === "string" && value.length > 0)
  const knownAuthUserIds = knownUsers
    .map((item) => item?.authUserId)
    .filter((value) => typeof value === "string" && value.length > 0)

  const { data: discoveredUsers, error: discoveredUsersError } = await client
    .from("users")
    .select("id, auth_user_id, email")
    .ilike("email", `%@${validationSessionEmailDomain}`)

  if (discoveredUsersError) {
    throw discoveredUsersError
  }

  const discoveredErpUserIds = (discoveredUsers ?? []).map((item) => String(item.id))
  const discoveredAuthUserIds = (discoveredUsers ?? [])
    .map((item) => item.auth_user_id)
    .filter((value) => typeof value === "string" && value.length > 0)

  const erpUserIds = Array.from(new Set([...knownErpUserIds, ...discoveredErpUserIds]))
  const authUserIds = Array.from(new Set([...knownAuthUserIds, ...discoveredAuthUserIds]))

  if (erpUserIds.length > 0) {
    const { error: auditError } = await client.from("audit_logs").delete().in("user_id", erpUserIds)

    if (auditError) {
      throw auditError
    }
  }

  if (erpUserIds.length > 0) {
    const { error } = await client.from("users").delete().in("id", erpUserIds)

    if (error) {
      throw error
    }
  }

  for (const authUserId of authUserIds) {
    const { error } = await client.auth.admin.deleteUser(authUserId)

    if (error) {
      throw error
    }
  }

  await fs.rm(generatedUsersPath, { force: true })

  return {
    erpUsersRemoved: erpUserIds.length,
    authUsersRemoved: authUserIds.length,
  }
}

async function softDeleteClients(client, ids) {
  for (const id of ids) {
    const { error } = await client.rpc("soft_delete_client", {
      p_client_id: id,
    })

    if (error) {
      throw error
    }
  }
}

function isMissingSchemaObjectError(error) {
  const message = error?.message?.toLowerCase?.() ?? ""
  return (
    message.includes("schema cache") ||
    message.includes("could not find the function") ||
    message.includes("could not find the table")
  )
}

function isMissingClientError(error) {
  const message = error?.message?.toLowerCase?.() ?? ""
  return message.includes("client") && message.includes("not found")
}

async function neutralizeAndSoftDeleteClient(client, id) {
  const { error: updateError } = await client
    .from("clients")
    .update({
      company_name: `PURGED_TEST_CLIENT_${id.slice(0, 8)}`,
      website: null,
      corporate_phone: null,
      full_address: null,
      account_owner_id: null,
    })
    .eq("id", id)

  if (updateError) {
    throw updateError
  }

  await softDeleteClients(client, [id])
}

async function purgeClients(client, ids) {
  for (const id of ids ?? []) {
    const { error } = await client.rpc("purge_ephemeral_client_record", {
      p_client_id: id,
    })

    if (!error) {
      continue
    }

    if (isMissingClientError(error)) {
      continue
    }

    if (isMissingSchemaObjectError(error)) {
      await neutralizeAndSoftDeleteClient(client, id)
      continue
    }

    throw error
  }
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  assertWritableClone(context)

  const ledgerPath = path.join(context.paths.runtimeValidationDir, "live-local-run-ledger.json")
  const breakLedgerPath = path.join(context.paths.runtimeValidationDir, "live-local-break-ledger.json")
  const primaryLedger = await readLedgerIfPresent(ledgerPath)
  const breakLedger = await readLedgerIfPresent(breakLedgerPath)

  if (!primaryLedger && !breakLedger) {
    throw new Error("No validation ledger was found for cleanup.")
  }

  const ledger = Object.fromEntries(
    Array.from(
      new Set([
        ...Object.keys(primaryLedger ?? {}),
        ...Object.keys(breakLedger ?? {}),
      ])
    ).map((key) => [key, mergeLedgerEntries(primaryLedger?.[key], breakLedger?.[key])])
  )
  const client = createSupabaseAdminClient(context, { requireWritableClone: true })

  await deleteRows(client, "shipment_events", ledger.shipment_events ?? [])
  await deleteRows(client, "shipments", ledger.shipments ?? [])
  await deleteRows(client, "quotation_costs", ledger.quotation_costs ?? [])
  await deleteRows(client, "quotation_cargo_lines", ledger.quotation_cargo_lines ?? [])
  await deleteRows(client, "quotation_options", ledger.quotation_options ?? [])
  await deleteRows(client, "quotations", ledger.quotations ?? [])
  await deleteRows(client, "opportunities", ledger.opportunities ?? [])
  await deleteRows(client, "provider_service_offerings", ledger.provider_service_offerings ?? [])
  await deleteRows(client, "provider_contacts", ledger.provider_contacts ?? [])
  await deleteRows(client, "providers", ledger.providers ?? [])
  await deleteRows(client, "contacts", ledger.contacts ?? [])
  await deleteRows(client, "client_logistics_parties", ledger.client_logistics_parties ?? [])
  await deleteRows(client, "exchange_rates", ledger.exchange_rates ?? [])
  await deleteRows(client, "quotation_rejection_reasons", ledger.quotation_rejection_reasons ?? [])
  await deleteRows(client, "sales_accounting_concepts", ledger.sales_accounting_concepts ?? [])
  await deleteRows(client, "service_transport_types", ledger.service_transport_types ?? [])
  await purgeClients(client, ledger.clients ?? [])
  const sessionUserCleanup = await cleanupValidationSessionUsers(client, context)

  const payload = {
    generatedAt: isoTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
    },
    cleanedLedgers: [ledgerPath, breakLedgerPath].filter((item, index, current) => current.indexOf(item) === index),
    validationSessionUsers: sessionUserCleanup,
    note:
      "Clients use purge_ephemeral_client_record() when available; if the current TRAIN schema is behind that contract, cleanup falls back to neutralize + soft delete so clean-state can still return to zero. Validation session users are removed from public.users and auth.users when their email domain matches the generated validation domain.",
  }

  await writeJson(
    path.join(context.paths.generatedDocsDir, "live-local-cleanup-summary.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-cleanup-summary.md"),
    [
      "# Live/Local Cleanup Summary",
      "",
      `- Generated at: \`${payload.generatedAt}\``,
      `- Target project ref: \`${context.target.projectRef}\``,
      `- Ledgers used: ${payload.cleanedLedgers.map((item) => `\`${item}\``).join(", ")}`,
      `- Validation ERP users removed: \`${payload.validationSessionUsers.erpUsersRemoved}\``,
      `- Validation auth users removed: \`${payload.validationSessionUsers.authUsersRemoved}\``,
      "",
      payload.note,
      "",
    ].join("\n")
  )

  console.log("Cleanup completed.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
