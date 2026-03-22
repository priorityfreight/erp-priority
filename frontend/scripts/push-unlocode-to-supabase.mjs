import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function parseArgs(argv) {
  const options = {
    csvPath: "",
    batchSize: 500,
    mode: "full-sync",
    countryCode: "",
    pruneCountry: false,
    manifestPath: "",
    manifestDir: "",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === "--csv") {
      options.csvPath = argv[index + 1] ?? ""
      index += 1
      continue
    }

    if (argument === "--batch-size") {
      options.batchSize = Number(argv[index + 1] ?? "500")
      index += 1
      continue
    }

    if (argument === "--mode") {
      options.mode = argv[index + 1] ?? "full-sync"
      index += 1
      continue
    }

    if (argument === "--country") {
      options.countryCode = (argv[index + 1] ?? "").trim().toUpperCase()
      index += 1
      continue
    }

    if (argument === "--prune-country") {
      options.pruneCountry = true
      continue
    }

    if (argument === "--manifest") {
      options.manifestPath = argv[index + 1] ?? ""
      index += 1
      continue
    }

    if (argument === "--manifest-dir") {
      options.manifestDir = argv[index + 1] ?? ""
      index += 1
      continue
    }
  }

  if (!options.csvPath) {
    throw new Error(
      "Usage: node scripts/push-unlocode-to-supabase.mjs --csv ../master_data/unlocode/snapshots/north-america-unlocode.csv"
    )
  }

  if (!Number.isFinite(options.batchSize) || options.batchSize <= 0) {
    throw new Error("Batch size must be a positive number")
  }

  if (!["full-sync", "add-country", "refresh-country"].includes(options.mode)) {
    throw new Error("Mode must be one of: full-sync, add-country, refresh-country")
  }

  if (options.mode !== "full-sync" && !options.countryCode) {
    throw new Error("Country code is required for add-country and refresh-country modes")
  }

  return options
}

function parseCsv(content) {
  const rows = []
  let current = ""
  let row = []
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    const nextCharacter = content[index + 1]

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === "," && !inQuotes) {
      row.push(current)
      current = ""
      continue
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1
      }

      row.push(current)
      current = ""

      if (row.some((value) => value !== "")) {
        rows.push(row)
      }

      row = []
      continue
    }

    current += character
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current)
    if (row.some((value) => value !== "")) {
      rows.push(row)
    }
  }

  if (!rows.length) {
    return []
  }

  const [headers, ...dataRows] = rows

  return dataRows.map((values) => {
    const record = {}

    headers.forEach((header, index) => {
      record[header] = values[index] === "" ? null : values[index] ?? null
    })

    return record
  })
}

async function main() {
  const {
    csvPath,
    batchSize,
    mode,
    countryCode,
    pruneCountry,
    manifestPath,
    manifestDir,
  } = parseArgs(process.argv.slice(2))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  const resolvedCsvPath = path.resolve(process.cwd(), csvPath)
  const content = await readFile(resolvedCsvPath, "utf8")
  const parsedRows = parseCsv(content)
  const deduplicatedRows = Array.from(
    new Map(parsedRows.map((row) => [String(row.unlocode ?? ""), row])).values()
  ).filter((row) => row.unlocode)
  const rows = countryCode
    ? deduplicatedRows.filter(
        (row) => String(row.country_code ?? "").toUpperCase() === countryCode
      )
    : deduplicatedRows

  if (!rows.length) {
    throw new Error("No UN/LOCODE rows were parsed from the CSV")
  }

  if (countryCode) {
    const mismatchedRow = rows.find(
      (row) => String(row.country_code ?? "").toUpperCase() !== countryCode
    )

    if (mismatchedRow) {
      throw new Error(`CSV contains rows outside the requested country ${countryCode}`)
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: sourceRow, error: sourceError } = await supabase
    .from("external_data_sources")
    .select("id")
    .eq("code", "unece_unlocode")
    .single()

  if (sourceError || !sourceRow?.id) {
    throw sourceError ?? new Error("UN/LOCODE external data source not found")
  }

  const syncStartedAt = new Date().toISOString()
  let existingCountryCount = 0

  if (countryCode) {
    const { count, error: countError } = await supabase
      .from("unlocodes")
      .select("id", { count: "exact", head: true })
      .eq("country_code", countryCode)

    if (countError) {
      throw countError
    }

    existingCountryCount = count ?? 0
  }

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize).map((row) => ({
      source_id: sourceRow.id,
      country_code: row.country_code,
      location_code: row.location_code,
      unlocode: row.unlocode,
      country_name: row.country_name,
      name: row.name,
      name_without_diacritics: row.name_without_diacritics,
      subdivision_code: row.subdivision_code,
      function_classifier: row.function_classifier,
      status: row.status,
      change_indicator: row.change_indicator,
      date_code: row.date_code,
      iata_code: row.iata_code,
      coordinates: row.coordinates,
      remarks: row.remarks,
      source_page_url: row.source_page_url,
    }))

    const { error } = await supabase
      .from("unlocodes")
      .upsert(batch, { onConflict: "unlocode" })

    if (error) {
      throw new Error(
        `UN/LOCODE batch starting at ${start + 1} failed: ${error.message}`
      )
    }

    console.log(
      `Uploaded ${Math.min(start + batch.length, rows.length)} / ${rows.length} UN/LOCODE rows`
    )
  }

  let prunedCount = 0

  if (countryCode && mode === "refresh-country" && pruneCountry) {
    const { data: existingRows, error: existingRowsError } = await supabase
      .from("unlocodes")
      .select("unlocode")
      .eq("country_code", countryCode)

    if (existingRowsError) {
      throw existingRowsError
    }

    const incomingCodes = new Set(rows.map((row) => String(row.unlocode)))
    const staleCodes = ((existingRows ?? []) as Array<{ unlocode: string | null }>)
      .map((row) => String(row.unlocode ?? ""))
      .filter((code) => code && !incomingCodes.has(code))

    if (staleCodes.length) {
      for (let start = 0; start < staleCodes.length; start += batchSize) {
        const batch = staleCodes.slice(start, start + batchSize)
        const { error } = await supabase
          .from("unlocodes")
          .delete()
          .eq("country_code", countryCode)
          .in("unlocode", batch)

        if (error) {
          throw new Error(
            `UN/LOCODE prune batch starting at ${start + 1} failed: ${error.message}`
          )
        }
      }

      prunedCount = staleCodes.length
    }
  }

  const { error: updateError } = await supabase
    .from("external_data_sources")
    .update({ last_imported_at: new Date().toISOString() })
    .eq("id", sourceRow.id)

  if (updateError) {
    throw updateError
  }

  let finalCountryCount = rows.length
  if (countryCode) {
    const { count, error: finalCountError } = await supabase
      .from("unlocodes")
      .select("id", { count: "exact", head: true })
      .eq("country_code", countryCode)

    if (finalCountError) {
      throw finalCountError
    }

    finalCountryCount = count ?? rows.length
  }

  if (manifestPath || manifestDir) {
    const manifest = manifestPath
      ? JSON.parse(await readFile(path.resolve(process.cwd(), manifestPath), "utf8"))
      : null

    const syncReport = {
      synced_at: new Date().toISOString(),
      started_at: syncStartedAt,
      mode,
      country_code: countryCode || null,
      csv_path: resolvedCsvPath,
      row_count: rows.length,
      batch_size: batchSize,
      prune_country: pruneCountry,
      existing_country_count: countryCode ? existingCountryCount : null,
      final_country_count: countryCode ? finalCountryCount : null,
      pruned_count: prunedCount,
      source_manifest: manifest,
    }

    const reportDir = manifestDir
      ? path.resolve(process.cwd(), manifestDir)
      : path.dirname(path.resolve(process.cwd(), manifestPath || resolvedCsvPath))
    const reportName =
      countryCode && mode !== "full-sync"
        ? `${countryCode.toLowerCase()}-${mode}-sync.json`
        : `full-sync-${Date.now()}.json`

    await mkdir(reportDir, { recursive: true })
    await writeFile(path.join(reportDir, reportName), `${JSON.stringify(syncReport, null, 2)}\n`, "utf8")
  }

  console.log(
    `UN/LOCODE sync completed: ${rows.length} rows` +
      (countryCode ? ` for ${countryCode} (${finalCountryCount} rows now stored)` : "")
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
