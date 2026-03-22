"use client"

import { useEffect, useState } from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { searchUnlocodes, type UnlocodeCountrySummary, type UnlocodeRecord, type UnlocodeSearchResult } from "@/lib/db"

const pageSize = 25

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center text-sm text-[#64748B]">
      {hasQuery
        ? "No UN/LOCODE rows match the current search."
        : "No UN/LOCODE data is available for the current filter."}
    </div>
  )
}

export function UnlocodeExplorer() {
  const [result, setResult] = useState<UnlocodeSearchResult | null>(null)
  const [query, setQuery] = useState("")
  const [countryCode, setCountryCode] = useState("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    searchUnlocodes({
      query,
      countryCode,
      page,
      pageSize,
    })
      .then((data) => {
        if (!cancelled) {
          setResult(data)
        }
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [query, countryCode, page])

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const summaries = result?.countrySummaries ?? []
  const countryOptions = result?.availableCountries ?? ["MX", "US", "CA"]
  const currentRangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const currentRangeEnd = Math.min(page * pageSize, total)
  const highlightedSummary: UnlocodeCountrySummary | undefined =
    countryCode === "all"
      ? undefined
      : summaries.find((entry) => entry.country_code === countryCode.toUpperCase())

  return (
    <PageContainer
      title="UN/LOCODE"
      description="Read-only lookup for UNECE trade and transport location codes."
      actions={
        <div className="rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#475569]">
          Source mode: {result?.mode ?? "loading"}
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
              Visible Results
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">{total.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#047857]">
              Active Countries
            </div>
            <div className="mt-2 text-2xl font-semibold text-[#111827]">
              {countryCode === "all" ? countryOptions.length : 1}
            </div>
          </div>
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#B45309]">
              Country Focus
            </div>
            <div className="mt-2 text-sm font-semibold text-[#111827]">
              {highlightedSummary
                ? `${highlightedSummary.country_code} · ${highlightedSummary.row_count.toLocaleString()} rows`
                : "MX, US, CA"}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#475569]">
              Current Window
            </div>
            <div className="mt-2 text-sm font-semibold text-[#111827]">
              {currentRangeStart.toLocaleString()}-{currentRangeEnd.toLocaleString()} of {total.toLocaleString()}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Lookup Explorer</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Search by UN/LOCODE, location name, subdivision, IATA, or coordinates.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-md border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                placeholder="Search code or location"
                value={query}
                onChange={(event) => {
                  setLoading(true)
                  setPage(1)
                  setQuery(event.target.value)
                }}
              />
              <select
                className="rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                value={countryCode}
                onChange={(event) => {
                  setLoading(true)
                  setPage(1)
                  setCountryCode(event.target.value)
                }}
              >
                <option value="all">All Countries</option>
                {countryOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {summaries.map((entry) => {
              const active = countryCode === entry.country_code
              return (
                <button
                  key={entry.country_code}
                  type="button"
                  onClick={() => {
                    setLoading(true)
                    setPage(1)
                    setCountryCode(active ? "all" : entry.country_code)
                  }}
                  className={[
                    "rounded-full border px-3 py-1 font-medium transition-colors",
                    active
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                      : "border-[#E5E7EB] bg-white text-[#475569] hover:border-[#BFDBFE] hover:text-[#1D4ED8]",
                  ].join(" ")}
                >
                  {entry.country_code} · {entry.row_count.toLocaleString()}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-10 text-center text-sm text-[#6B7280]">
              Loading UN/LOCODE data...
            </div>
          ) : items.length === 0 ? (
            <EmptyState hasQuery={Boolean(query.trim())} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
              <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
                <thead className="bg-[#F8FAFC] text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">UN/LOCODE</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Subdivision</th>
                    <th className="px-4 py-3">Functions</th>
                    <th className="px-4 py-3">IATA</th>
                    <th className="px-4 py-3">Coordinates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {items.map((item: UnlocodeRecord) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-semibold text-[#111827]">{item.unlocode}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#111827]">{item.name}</div>
                        <div className="mt-1 text-xs text-[#6B7280]">
                          {item.name_without_diacritics || "No alternate name"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">
                        {item.country_code} · {item.country_name}
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{item.subdivision_code || "N/A"}</td>
                      <td className="px-4 py-3 text-[#475569]">{item.function_classifier || "N/A"}</td>
                      <td className="px-4 py-3 text-[#475569]">{item.iata_code || "N/A"}</td>
                      <td className="px-4 py-3 text-[#475569]">{item.coordinates || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  setPage((current) => Math.max(1, current - 1))
                }}
                disabled={page <= 1}
                className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#374151] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  setPage((current) => Math.min(totalPages, current + 1))
                }}
                disabled={page >= totalPages}
                className="rounded-md border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#374151] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
