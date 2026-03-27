import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dirname, "..")
const sourceDir = path.join(repoRoot, "ASSETS")
const targetDir = path.join(repoRoot, "frontend", "public", "assets")

async function ensureDirectory(dir) {
  await mkdir(dir, { recursive: true })
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort()
}

async function filesMatch(sourceFile, targetFile) {
  try {
    const [sourceBuffer, targetBuffer] = await Promise.all([
      readFile(sourceFile),
      readFile(targetFile),
    ])
    return sourceBuffer.equals(targetBuffer)
  } catch {
    return false
  }
}

async function main() {
  await ensureDirectory(targetDir)

  const sourceStats = await stat(sourceDir)
  if (!sourceStats.isDirectory()) {
    throw new Error(`ASSETS source directory not found: ${sourceDir}`)
  }

  const files = await listFiles(sourceDir)
  if (files.length === 0) {
    console.log("No brand assets found in ASSETS/.")
    return
  }

  let copied = 0
  let skipped = 0

  for (const fileName of files) {
    const sourceFile = path.join(sourceDir, fileName)
    const targetFile = path.join(targetDir, fileName)

    if (await filesMatch(sourceFile, targetFile)) {
      skipped += 1
      continue
    }

    const buffer = await readFile(sourceFile)
    await writeFile(targetFile, buffer)
    copied += 1
    console.log(`Synced ${fileName}`)
  }

  console.log(
    copied > 0
      ? `Brand asset sync complete. Copied ${copied} file(s), skipped ${skipped}.`
      : `Brand assets already synchronized. Skipped ${skipped} file(s).`
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
