#!/usr/bin/env node

import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")
const require = createRequire(path.join(repoRoot, "frontend", "package.json"))
const { createClient } = require("@supabase/supabase-js")
const frontendEnvPath = path.join(repoRoot, "frontend", ".env.local")
const outputDir = path.join(repoRoot, "supabase", "seeds", "generated")
const outputPath = path.join(outputDir, "prod_operational_master_data.sql")

function parseEnv(raw) {
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue
    const idx = line.indexOf("=")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function sqlLiteral(value) {
  if (value == null) return "null"
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null"
  if (typeof value === "boolean") return value ? "true" : "false"
  return `'${String(value).replace(/'/g, "''")}'`
}

function chunk(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

async function fetchAll({ client, table, columns, orderBy, chunkSize = 1000 }) {
  const rows = []
  let from = 0
  for (;;) {
    let query = client.from(table).select(columns).range(from, from + chunkSize - 1)
    for (const order of orderBy) {
      query = query.order(order.column, { ascending: order.ascending })
    }
    const { data, error } = await query
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < chunkSize) break
    from += chunkSize
  }
  return rows
}

function buildExchangeRatesSql(rows) {
  const cols = [
    "rate_date",
    "base_currency",
    "quote_currency",
    "rate_value",
    "source",
    "source_series_code",
    "created_at",
    "updated_at",
  ]
  const chunks = chunk(rows, 500)
  return chunks
    .map((group) => {
      const values = group
        .map((row) =>
          `(${cols.map((col) => sqlLiteral(row[col])).join(", ")})`
        )
        .join(",\n")
      return `insert into public.exchange_rates (${cols.join(", ")})
values
${values}
on conflict (rate_date, base_currency, quote_currency, source) do update
set
  rate_value = excluded.rate_value,
  source_series_code = excluded.source_series_code,
  updated_at = excluded.updated_at;`
    })
    .join("\n\n")
}

function buildUnlocodesSql(rows, sourceCodeById) {
  const valueCols = [
    "id",
    "source_code",
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
    "search_text",
    "source_page_url",
    "created_at",
    "updated_at",
  ]
  const chunks = chunk(rows, 500)
  return chunks
    .map((group) => {
      const values = group
        .map((row) => {
          const sourceCode = sourceCodeById.get(row.source_id)
          if (!sourceCode) {
            throw new Error(`Missing source code mapping for unlocode ${row.unlocode}`)
          }
          const payload = {
            ...row,
            source_code: sourceCode,
          }
          return `(${valueCols.map((col) => sqlLiteral(payload[col])).join(", ")})`
        })
        .join(",\n")
      return `insert into public.unlocodes (
  id,
  source_id,
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
  search_text,
  source_page_url,
  created_at,
  updated_at
)
select
  v.id::uuid,
  src.id,
  v.country_code,
  v.location_code,
  v.unlocode,
  v.country_name,
  v.name,
  v.name_without_diacritics,
  v.subdivision_code,
  v.function_classifier,
  v.status,
  v.change_indicator,
  v.date_code,
  v.iata_code,
  v.coordinates,
  v.remarks,
  v.search_text,
  v.source_page_url,
  v.created_at::timestamptz,
  v.updated_at::timestamptz
from (
  values
${values}
) as v(${valueCols.join(", ")})
join public.external_data_sources src
  on src.code = v.source_code
on conflict (unlocode) do update
set
  source_id = excluded.source_id,
  country_code = excluded.country_code,
  location_code = excluded.location_code,
  country_name = excluded.country_name,
  name = excluded.name,
  name_without_diacritics = excluded.name_without_diacritics,
  subdivision_code = excluded.subdivision_code,
  function_classifier = excluded.function_classifier,
  status = excluded.status,
  change_indicator = excluded.change_indicator,
  date_code = excluded.date_code,
  iata_code = excluded.iata_code,
  coordinates = excluded.coordinates,
  remarks = excluded.remarks,
  search_text = excluded.search_text,
  source_page_url = excluded.source_page_url,
  updated_at = excluded.updated_at;`
    })
    .join("\n\n")
}

async function main() {
  const envRaw = await fs.readFile(frontendEnvPath, "utf8")
  const env = parseEnv(envRaw)
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("frontend/.env.local must contain NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  }

  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const [sources, exchangeRates, unlocodes] = await Promise.all([
    fetchAll({
      client,
      table: "external_data_sources",
      columns: "id,code",
      orderBy: [{ column: "code", ascending: true }],
      chunkSize: 100,
    }),
    fetchAll({
      client,
      table: "exchange_rates",
      columns: "rate_date,base_currency,quote_currency,rate_value,source,source_series_code,created_at,updated_at",
      orderBy: [
        { column: "rate_date", ascending: true },
        { column: "base_currency", ascending: true },
        { column: "quote_currency", ascending: true },
        { column: "source", ascending: true },
      ],
      chunkSize: 500,
    }),
    fetchAll({
      client,
      table: "unlocodes",
      columns:
        "id,source_id,country_code,location_code,unlocode,country_name,name,name_without_diacritics,subdivision_code,function_classifier,status,change_indicator,date_code,iata_code,coordinates,remarks,search_text,source_page_url,created_at,updated_at",
      orderBy: [
        { column: "country_code", ascending: true },
        { column: "location_code", ascending: true },
      ],
      chunkSize: 1000,
    }),
  ])

  const sourceCodeById = new Map(sources.map((row) => [row.id, row.code]))

  await fs.mkdir(outputDir, { recursive: true })
  const sql = `-- Generated from DEV/TRAIN approved operational master data.
-- Do not hand-edit. Regenerate with scripts/build-prod-operational-master-data-seed.mjs.
-- Source: ${env.NEXT_PUBLIC_SUPABASE_URL}

begin;

${buildExchangeRatesSql(exchangeRates)}

${buildUnlocodesSql(unlocodes, sourceCodeById)}

commit;
`
  await fs.writeFile(outputPath, sql, "utf8")
  console.log(
    JSON.stringify(
      {
        outputPath,
        exchange_rates: exchangeRates.length,
        unlocodes: unlocodes.length,
        external_data_sources: sources.length,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
