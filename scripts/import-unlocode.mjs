import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

function parseArgs(argv) {
  const options = {
    countries: [],
    inputDir: "",
    outPrefix: "",
    manifestDir: "",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === "--countries") {
      options.countries = (argv[index + 1] ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
      index += 1
      continue
    }

    if (argument === "--input-dir") {
      options.inputDir = argv[index + 1] ?? ""
      index += 1
      continue
    }

    if (argument === "--out-prefix") {
      options.outPrefix = argv[index + 1] ?? ""
      index += 1
      continue
    }

    if (argument === "--manifest-dir") {
      options.manifestDir = argv[index + 1] ?? ""
      index += 1
      continue
    }
  }

  if (!options.countries.length || !options.inputDir || !options.outPrefix) {
    throw new Error(
      "Usage: node scripts/import-unlocode.mjs --countries mx,us,ca --input-dir /tmp/unlocode --out-prefix master_data/unlocode/snapshots/north-america"
    )
  }

  return options
}

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCharCode(Number(codePoint)))
}

function stripTags(value) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractCountryName(html) {
  const titleMatch = html.match(/<title>\s*UNLOCODE\s*\([A-Z]{2}\)\s*-\s*([^<]+)<\/title>/i)
  return titleMatch?.[1]?.trim() ?? "Unknown"
}

function parseLocodeCell(value) {
  const normalized = value.replace(/\s+/g, " ").trim()
  const [countryCode = "", locationCode = ""] = normalized.split(" ")
  return {
    countryCode: countryCode.toUpperCase(),
    locationCode: locationCode.toUpperCase(),
  }
}

function parseRows(html, sourcePageUrl) {
  const countryName = extractCountryName(html)
  const rows = []
  const trMatches = html.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)

  for (const match of trMatches) {
    const cellMatches = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
    if (cellMatches.length < 11) {
      continue
    }

    const cells = cellMatches.slice(0, 11).map((cell) => stripTags(cell[1]))
    if (cells[1].toUpperCase() === "LOCODE") {
      continue
    }

    const { countryCode, locationCode } = parseLocodeCell(cells[1])
    if (!countryCode || !locationCode) {
      continue
    }

    rows.push({
      change_indicator: cells[0] || null,
      country_code: countryCode,
      location_code: locationCode,
      unlocode: `${countryCode}${locationCode}`,
      country_name: countryName,
      name: cells[2],
      name_without_diacritics: cells[3] || null,
      subdivision_code: cells[4] || null,
      function_classifier: cells[5] || null,
      status: cells[6] || null,
      date_code: cells[7] || null,
      iata_code: cells[8] || null,
      coordinates: cells[9] || null,
      remarks: cells[10] || null,
      source_page_url: sourcePageUrl,
    })
  }

  return rows
}

function toCsv(records) {
  const headers = [
    "country_code",
    "location_code",
    "unlocode",
    "country_name",
    "name",
    "name_without_diacritics",
    "subdivision_code",
    "function_classifier",
    "status",
    "change_indicator",
    "date_code",
    "iata_code",
    "coordinates",
    "remarks",
    "source_page_url",
  ]

  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`
  const lines = [headers.join(",")]

  for (const record of records) {
    lines.push(headers.map((header) => escapeCsv(record[header])).join(","))
  }

  return lines.join("\n") + "\n"
}

function createContentHash(value) {
  return createHash("sha256").update(value).digest("hex")
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const records = []
  const summary = {
    generated_at: new Date().toISOString(),
    countries: [],
    total_rows: 0,
  }
  const countryManifests = []

  for (const country of options.countries) {
    const inputPath = path.join(options.inputDir, `${country}.html`)
    const sourcePageUrl = `https://service.unece.org/trade/locode/${country}.htm`
    const html = await readFile(inputPath, "latin1")
    const countryRows = parseRows(html, sourcePageUrl)
    const countryCode = country.toUpperCase()
    const countryName = countryRows[0]?.country_name ?? extractCountryName(html)
    const htmlHash = createContentHash(html)
    const countryCsv = toCsv(countryRows)
    const countryCsvHash = createContentHash(countryCsv)

    summary.countries.push({
      country_code: countryCode,
      row_count: countryRows.length,
      source_page_url: sourcePageUrl,
    })

    countryManifests.push({
      generated_at: summary.generated_at,
      country_code: countryCode,
      country_name: countryName,
      row_count: countryRows.length,
      source_page_url: sourcePageUrl,
      source_file: inputPath,
      source_hash: htmlHash,
      csv_hash: countryCsvHash,
      refresh_strategy: "country_incremental_upsert",
      suggested_push_mode: "add-country",
    })

    records.push(...countryRows)
  }

  records.sort((left, right) => left.unlocode.localeCompare(right.unlocode))
  summary.total_rows = records.length
  summary.snapshot_hash = createContentHash(toCsv(records))

  const outDir = path.dirname(options.outPrefix)
  await mkdir(outDir, { recursive: true })

  await writeFile(`${options.outPrefix}-unlocode.csv`, toCsv(records), "utf8")
  await writeFile(`${options.outPrefix}-summary.json`, `${JSON.stringify(summary, null, 2)}\n`, "utf8")

  if (options.manifestDir) {
    await mkdir(options.manifestDir, { recursive: true })

    await Promise.all(
      countryManifests.map((manifest) =>
        writeFile(
          path.join(options.manifestDir, `${manifest.country_code.toLowerCase()}.json`),
          `${JSON.stringify(manifest, null, 2)}\n`,
          "utf8"
        )
      )
    )
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
