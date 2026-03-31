import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"
import type {
  UnlocodeCountrySummary,
  UnlocodeRecord,
  UnlocodeSearchParams,
} from "@/lib/db/models"

type SnapshotUnlocodeSearchResult = {
  items: UnlocodeRecord[]
  total: number
  page: number
  pageSize: number
  mode: "snapshot"
  availableCountries: string[]
  countrySummaries: UnlocodeCountrySummary[]
}

type SnapshotCache = {
  records: UnlocodeRecord[]
  summaries: UnlocodeCountrySummary[]
}

let snapshotPromise: Promise<SnapshotCache> | null = null

// Temporary rollback safety only. Keep this reproducible snapshot available
// until the canonical UN/LOCODE backend path is fully validated everywhere.

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const next = line[index + 1]

    if (character === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (character === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += character
  }

  values.push(current)
  return values
}

function valueOrNull(value: string | undefined) {
  return value && value.length > 0 ? value : null
}

async function loadSnapshot(): Promise<SnapshotCache> {
  const csvPath = path.resolve(
    process.cwd(),
    "../master_data/unlocode/snapshots/north-america-unlocode.csv"
  )
  const summaryPath = path.resolve(
    process.cwd(),
    "../master_data/unlocode/snapshots/north-america-summary.json"
  )

  const [csvContent, summaryContent] = await Promise.all([
    readFile(csvPath, "utf8"),
    readFile(summaryPath, "utf8"),
  ])

  const lines = csvContent.trim().split("\n")
  const [, ...rows] = lines
  const records = rows.map((line, index) => {
    const [
      country_code,
      location_code,
      unlocode,
      country_name,
      name,
      name_without_diacritics,
      subdivision_code,
      function_classifier,
      status,
      change_indicator,
      date_code,
      iata_code,
      coordinates,
      remarks,
      source_page_url,
    ] = parseCsvLine(line)

    return {
      id: `${unlocode}-${index + 1}`,
      country_code,
      location_code,
      unlocode,
      country_name,
      name,
      name_without_diacritics: valueOrNull(name_without_diacritics),
      subdivision_code: valueOrNull(subdivision_code),
      function_classifier: valueOrNull(function_classifier),
      status: valueOrNull(status),
      change_indicator: valueOrNull(change_indicator),
      date_code: valueOrNull(date_code),
      iata_code: valueOrNull(iata_code),
      coordinates: valueOrNull(coordinates),
      remarks: valueOrNull(remarks),
      source_page_url,
    } satisfies UnlocodeRecord
  })

  const summary = JSON.parse(summaryContent) as {
    countries: Array<{ country_code: string; row_count: number }>
  }

  return {
    records,
    summaries: summary.countries,
  }
}

async function getSnapshot(): Promise<SnapshotCache> {
  if (!snapshotPromise) {
    snapshotPromise = loadSnapshot()
  }

  return snapshotPromise
}

export async function queryUnlocodeSnapshot(
  params: UnlocodeSearchParams = {}
): Promise<SnapshotUnlocodeSearchResult> {
  const snapshot = await getSnapshot()
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100)
  const page = Math.max(params.page ?? 1, 1)
  const query = params.query?.trim().toLowerCase() ?? ""
  const countryCode =
    params.countryCode && params.countryCode !== "all"
      ? params.countryCode.toUpperCase()
      : null

  const filtered = snapshot.records.filter((record) => {
    const matchesCountry = !countryCode || record.country_code === countryCode

    if (!matchesCountry) {
      return false
    }

    if (!query) {
      return true
    }

    return [
      record.unlocode,
      record.name,
      record.name_without_diacritics,
      record.country_name,
      record.subdivision_code,
      record.iata_code,
      record.coordinates,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  return {
    items,
    total: filtered.length,
    page,
    pageSize,
    mode: "snapshot",
    availableCountries: snapshot.summaries.map((entry) => entry.country_code),
    countrySummaries: snapshot.summaries,
  }
}
