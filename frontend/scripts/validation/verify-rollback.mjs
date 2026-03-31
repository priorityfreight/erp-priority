import { execFile } from "node:child_process"
import { promisify } from "node:util"
import path from "node:path"
import {
  ensureValidationDirectories,
  getValidationContext,
  isoTimestamp,
  writeJson,
  writeText,
} from "./shared/config.mjs"

const execFileAsync = promisify(execFile)

async function git(args, cwd) {
  const { stdout } = await execFileAsync("git", args, { cwd })
  return stdout.trim()
}

async function main() {
  const context = await getValidationContext()
  await ensureValidationDirectories()

  const repoRoot = context.paths.repoRoot
  const branch = await git(["branch", "--show-current"], repoRoot)
  const commit = await git(["rev-parse", "HEAD"], repoRoot)
  const status = await git(["status", "--short", "--branch"], repoRoot)
  const rollbackBranch = await git(["branch", "--list", context.rollback.branch], repoRoot)

  const payload = {
    generatedAt: isoTimestamp(),
    branch,
    commit,
    rollbackBranch: context.rollback.branch,
    rollbackBranchExists: Boolean(rollbackBranch.trim()),
    gitStatus: status,
    target: {
      kind: context.target.kind,
      projectRef: context.target.projectRef,
      protected: context.target.isProtectedRef,
    },
    prefixes: context.prefixes,
  }

  const jsonPath = path.join(context.paths.runtimeValidationDir, "rollback-metadata.json")
  const mdPath = path.join(context.paths.generatedDocsDir, "rollback-metadata.md")

  await writeJson(jsonPath, payload)
  await writeText(
    mdPath,
    [
      "# Live/Local Validation Rollback Metadata",
      "",
      `- Generated at: \`${payload.generatedAt}\``,
      `- Branch: \`${branch}\``,
      `- Commit: \`${commit}\``,
      `- Rollback branch: \`${context.rollback.branch}\``,
      `- Rollback branch exists: \`${payload.rollbackBranchExists}\``,
      `- Target kind: \`${context.target.kind}\``,
      `- Target project ref: \`${context.target.projectRef ?? "not-configured"}\``,
      `- Protected target: \`${context.target.isProtectedRef}\``,
      "",
      "```text",
      status,
      "```",
      "",
    ].join("\n")
  )

  if (!payload.rollbackBranchExists) {
    throw new Error(
      `Rollback branch ${context.rollback.branch} was not found. Refusing to continue.`
    )
  }

  console.log(`Rollback metadata written to ${jsonPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
