import path from "node:path"
import {
  ensureValidationDirectories,
  frontendRoot,
  getValidationContext,
  isoTimestamp,
  readText,
  writeJson,
  writeText,
} from "./shared/config.mjs"
import { liveModuleCatalog } from "./shared/liveModules.mjs"

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort()
}

function collectMatches(source, expression) {
  return unique(Array.from(source.matchAll(expression), (match) => match[1]))
}

function countMatches(source, expression) {
  return Array.from(source.matchAll(expression)).length
}

async function fileMetrics(filePath) {
  const absolutePath = path.join(
    filePath.startsWith("frontend/") ? path.resolve(frontendRoot, "..") : frontendRoot,
    filePath
  )
  const source = await readText(absolutePath)
  const lines = source.split(/\r?\n/).length

  return {
    path: filePath,
    lines,
    useStateCount: countMatches(source, /\buseState\(/g),
    useEffectCount: countMatches(source, /\buseEffect\(/g),
    useDeferredValueCount: countMatches(source, /\buseDeferredValue\(/g),
    clientComponent: source.includes('"use client"') || source.includes("'use client'"),
  }
}

async function queryMetrics(filePath) {
  const absolutePath = path.join(
    filePath.startsWith("frontend/") ? path.resolve(frontendRoot, "..") : frontendRoot,
    filePath
  )
  const source = await readText(absolutePath)
  const rpcCalls = collectMatches(source, /\.rpc\("([^"]+)"/g)
  const relationReads = collectMatches(source, /\.from\("([^"]+)"/g)
  const directMutations = unique(
    Array.from(
      source.matchAll(
        /\.from\("([^"]+)"\)(?:[\s\S]{0,180}?)\.(insert|update|delete)\(/g
      ),
      (match) => `${match[2]}:${match[1]}`
    )
  )

  return {
    path: filePath,
    rpcCalls,
    relationReads,
    directMutations,
    fallbackMentions: countMatches(source, /\bfallback\b|\blegacy\b|\bsnapshot\b/gi),
  }
}

function finding(priority, title, body, file) {
  return { priority, title, body, file }
}

async function buildModuleInventory() {
  const inventory = []
  const findings = []

  for (const moduleEntry of liveModuleCatalog) {
    const entryFileMetrics = await Promise.all(moduleEntry.entryFiles.map((item) => fileMetrics(item)))
    const queryFileMetrics = await Promise.all(moduleEntry.queryFiles.map((item) => queryMetrics(item)))

    const allRpcs = unique(queryFileMetrics.flatMap((item) => item.rpcCalls))
    const allRelations = unique(queryFileMetrics.flatMap((item) => item.relationReads))
    const allMutations = unique(queryFileMetrics.flatMap((item) => item.directMutations))

    for (const item of entryFileMetrics) {
      if (item.lines >= 1200) {
        findings.push(
          finding(
            "high",
            `Very large live route component (${item.lines} LOC)`,
            "This route is large enough to increase regressions, rerender cost, and validation surface during concurrent workflows.",
            item.path
          )
        )
      } else if (item.lines >= 700) {
        findings.push(
          finding(
            "medium",
            `Large live route component (${item.lines} LOC)`,
            "This route deserves targeted smoke and concurrency coverage because behavior is concentrated in one client-heavy file.",
            item.path
          )
        )
      }

      if (item.useStateCount >= 20) {
        findings.push(
          finding(
            item.useStateCount >= 30 ? "high" : "medium",
            `High local state density (${item.useStateCount} useState calls)`,
            "The page manages enough local state to make stale UI, missed refreshes, or unnecessary rerenders more likely under heavy usage.",
            item.path
          )
        )
      }
    }

    for (const item of queryFileMetrics) {
      if (item.rpcCalls.length > 0 && item.directMutations.length > 0) {
        findings.push(
          finding(
            "medium",
            "Mixed RPC workflows and direct table mutations",
            "This live query module mixes canonical RPC paths with direct writes, which increases drift and makes concurrency issues harder to reason about.",
            item.path
          )
        )
      }

      if (item.fallbackMentions > 0) {
        findings.push(
          finding(
            "medium",
            "Fallback or legacy branches remain in live data access",
            "Temporary rollback-safety logic is still present in a live module, so canonical-vs-fallback behavior needs explicit regression coverage.",
            item.path
          )
        )
      }
    }

    inventory.push({
      ...moduleEntry,
      entryMetrics: entryFileMetrics,
      queryMetrics: queryFileMetrics,
      backendContracts: {
        rpcs: allRpcs,
        relations: allRelations,
        directMutations: allMutations,
      },
    })
  }

  const uniqueFindings = Array.from(
    new Map(findings.map((item) => [`${item.priority}:${item.title}:${item.file}`, item])).values()
  )

  return { inventory, findings: uniqueFindings }
}

function renderModuleMatrixMarkdown(payload) {
  const lines = [
    "# Live/Local Module Matrix",
    "",
    `Generated at: \`${payload.generatedAt}\``,
    "",
  ]

  for (const moduleEntry of payload.modules) {
    lines.push(`## ${moduleEntry.label}`)
    lines.push("")
    lines.push(`- Module id: \`${moduleEntry.id}\``)
    lines.push(`- Routes: ${moduleEntry.routes.map((item) => `\`${item}\``).join(", ")}`)
    lines.push(
      `- Entry files: ${moduleEntry.entryFiles.map((item) => `\`${item}\``).join(", ")}`
    )
    lines.push(
      `- Query files: ${
        moduleEntry.queryFiles.length > 0
          ? moduleEntry.queryFiles.map((item) => `\`${item}\``).join(", ")
          : "None"
      }`
    )
    lines.push(
      `- API files: ${
        moduleEntry.apiFiles.length > 0
          ? moduleEntry.apiFiles.map((item) => `\`${item}\``).join(", ")
          : "None"
      }`
    )
    lines.push(
      `- RPCs: ${
        moduleEntry.backendContracts.rpcs.length > 0
          ? moduleEntry.backendContracts.rpcs.map((item) => `\`${item}\``).join(", ")
          : "None"
      }`
    )
    lines.push(
      `- Relations/views: ${
        moduleEntry.backendContracts.relations.length > 0
          ? moduleEntry.backendContracts.relations.map((item) => `\`${item}\``).join(", ")
          : "None"
      }`
    )
    lines.push(
      `- Direct mutations: ${
        moduleEntry.backendContracts.directMutations.length > 0
          ? moduleEntry.backendContracts.directMutations.map((item) => `\`${item}\``).join(", ")
          : "None"
      }`
    )
    lines.push(
      `- Permission notes: ${moduleEntry.permissionNotes.map((item) => item.trim()).join(" ")}`
    )
    lines.push("")
  }

  return lines.join("\n")
}

function renderStaticSignalsMarkdown(payload) {
  const lines = [
    "# Live/Local Static Validation Signals",
    "",
    `Generated at: \`${payload.generatedAt}\``,
    "",
  ]

  if (payload.findings.length === 0) {
    lines.push("No static signals were generated.")
    lines.push("")
    return lines.join("\n")
  }

  for (const issue of payload.findings) {
    lines.push(`- [${issue.priority.toUpperCase()}] ${issue.title} — \`${issue.file}\``)
    lines.push(`  ${issue.body}`)
  }

  lines.push("")
  return lines.join("\n")
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()
  const { inventory, findings } = await buildModuleInventory()

  const payload = {
    generatedAt: isoTimestamp(),
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    modules: inventory,
    findings,
  }

  await writeJson(
    path.join(context.paths.generatedDocsDir, "live-local-module-matrix.json"),
    payload
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-module-matrix.md"),
    renderModuleMatrixMarkdown(payload)
  )
  await writeText(
    path.join(context.paths.docsValidationDir, "live-local-static-signals.md"),
    renderStaticSignalsMarkdown(payload)
  )

  console.log(`Discovered ${inventory.length} live/local modules with ${findings.length} static signals.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
