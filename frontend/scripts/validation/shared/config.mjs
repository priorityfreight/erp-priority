import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { stressPrefixes } from "./liveModules.mjs"

const __filename = fileURLToPath(import.meta.url)
const sharedDir = path.dirname(__filename)
const validationDir = path.dirname(sharedDir)
export const frontendRoot = path.resolve(validationDir, "..", "..")
export const repoRoot = path.resolve(frontendRoot, "..")
export const docsValidationDir = path.join(repoRoot, "docs", "validation")
export const generatedDocsDir = path.join(docsValidationDir, "generated")
export const runtimeValidationDir = path.join(frontendRoot, ".validation")
export const protectedProjectRefs = new Set(["chnxpajsawbfevuakhsm"])
export const validationSessionEmailDomain = "validation.priority-erp.test"

function parseEnvLine(line) {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith("#")) {
    return null
  }

  const separatorIndex = trimmed.indexOf("=")
  if (separatorIndex === -1) {
    return null
  }

  const key = trimmed.slice(0, separatorIndex).trim()
  let value = trimmed.slice(separatorIndex + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return [key, value]
}

async function loadEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map(parseEnvLine)
        .filter(Boolean)
    )
  } catch {
    return {}
  }
}

export async function loadValidationEnv() {
  const envExample = await loadEnvFile(path.join(frontendRoot, ".env.example"))
  const envLocal = await loadEnvFile(path.join(frontendRoot, ".env.local"))
  const env = {
    ...envExample,
    ...envLocal,
    ...process.env,
  }

  return env
}

export function extractProjectRef(url) {
  if (!url) {
    return null
  }

  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    return host.split(".")[0] || null
  } catch {
    return null
  }
}

export async function ensureValidationDirectories() {
  await Promise.all([
    fs.mkdir(docsValidationDir, { recursive: true }),
    fs.mkdir(generatedDocsDir, { recursive: true }),
    fs.mkdir(runtimeValidationDir, { recursive: true }),
  ])
}

export async function getValidationContext() {
  const env = await loadValidationEnv()
  const targetUrl = env.VALIDATION_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceRoleKey =
    env.VALIDATION_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || ""
  const anonKey =
    env.VALIDATION_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    ""
  const projectRef = extractProjectRef(targetUrl)
  const isProtectedRef = projectRef ? protectedProjectRefs.has(projectRef) : false
  const requestedKind = env.VALIDATION_TARGET_KIND || ""
  const allowTrainWrites = String(env.VALIDATION_ALLOW_TRAIN_WRITES || "").toLowerCase() === "true"
  const targetKind =
    requestedKind ||
    (isProtectedRef ? "train" : targetUrl ? "staging-clone" : "unknown")

  return {
    env,
    paths: {
      frontendRoot,
      repoRoot,
      docsValidationDir,
      generatedDocsDir,
      runtimeValidationDir,
    },
    rollback: {
      branch: "codex/live-local-validation-baseline-20260327",
    },
    prefixes: stressPrefixes,
    target: {
      url: targetUrl,
      anonKey,
      serviceRoleKey,
      projectRef,
      kind: targetKind,
      isProtectedRef,
      allowTrainWrites,
    },
  }
}

export function createSupabaseAdminClient(context, options = {}) {
  const { requireWritableClone = false } = options
  const { url, serviceRoleKey } = context.target

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server credentials. Provide VALIDATION_SUPABASE_URL and VALIDATION_SUPABASE_SERVICE_ROLE_KEY or frontend/.env.local values."
    )
  }

  if (requireWritableClone) {
    assertWritableClone(context)
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createSupabaseAnonClient(context) {
  const { url, anonKey } = context.target

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase public credentials. Provide VALIDATION_SUPABASE_URL and VALIDATION_SUPABASE_ANON_KEY or frontend/.env.local values."
    )
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function assertWritableClone(context) {
  if (!context.target.url || !context.target.projectRef) {
    throw new Error("Writable validation target is not configured.")
  }

  if (context.target.isProtectedRef) {
    if (context.target.kind !== "train") {
      throw new Error(
        `Refusing to write against TRAIN project ${context.target.projectRef} without VALIDATION_TARGET_KIND=train.`
      )
    }

    if (!context.target.allowTrainWrites) {
      throw new Error(
        `Refusing to write against TRAIN project ${context.target.projectRef} without VALIDATION_ALLOW_TRAIN_WRITES=true.`
      )
    }

    return
  }

  if (context.target.kind !== "staging-clone") {
    throw new Error(
      `Writable validation requires VALIDATION_TARGET_KIND=staging-clone or a TRAIN target explicitly unlocked with VALIDATION_ALLOW_TRAIN_WRITES=true. Current value: ${context.target.kind}.`
    )
  }
}

export function summarizeTarget(context) {
  return {
    kind: context.target.kind,
    projectRef: context.target.projectRef,
    protected: context.target.isProtectedRef,
  }
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

export async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, value, "utf8")
}

export async function readText(filePath) {
  return fs.readFile(filePath, "utf8")
}

export function isoTimestamp() {
  return new Date().toISOString()
}
