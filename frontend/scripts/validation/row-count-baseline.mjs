import path from "node:path"
import {
  createSupabaseAdminClient,
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"
import { liveValidationTableCounts } from "./shared/liveModules.mjs"

function applyFilters(request, filters = []) {
  let current = request

  for (const filter of filters) {
    current = current[filter.operator](filter.column, filter.value)
  }

  return current
}

async function captureCounts(client) {
  const counts = []

  for (const item of liveValidationTableCounts) {
    let request = client.from(item.table).select("id", { count: "exact", head: true })
    request = applyFilters(request, item.filters)
    const { count, error } = await request

    if (error) {
      counts.push({
        table: item.table,
        ok: false,
        error: error.message,
      })
      continue
    }

    counts.push({
      table: item.table,
      ok: true,
      count: count ?? 0,
      filters: item.filters ?? [],
    })
  }

  return counts
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  const client = createSupabaseAdminClient(context)
  const counts = await captureCounts(client)
  const timestamp = isoTimestamp()

  const payload = {
    generatedAt: timestamp,
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    counts,
  }

  const jsonPath = path.join(
    context.paths.runtimeValidationDir,
    `row-count-baseline-${timestamp.replace(/[:.]/g, "-")}.json`
  )
  const latestPath = path.join(context.paths.runtimeValidationDir, "row-count-baseline.latest.json")
  const mdPath = path.join(context.paths.generatedDocsDir, "live-local-row-count-baseline.md")

  await writeJson(jsonPath, payload)
  await writeJson(latestPath, payload)
  await writeText(
    mdPath,
    [
      "# Live/Local Row Count Baseline",
      "",
      `Generated at: \`${timestamp}\``,
      `Target kind: \`${context.target.kind}\``,
      `Target project ref: \`${context.target.projectRef ?? "not-configured"}\``,
      `Protected target: \`${context.target.isProtectedRef}\``,
      "",
      ...counts.map((item) =>
        item.ok
          ? `- \`${item.table}\`: ${item.count}`
          : `- \`${item.table}\`: error - ${item.error}`
      ),
      "",
    ].join("\n")
  )

  console.log(`Row-count baseline written to ${jsonPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
