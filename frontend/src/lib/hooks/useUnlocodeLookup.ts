"use client"

import { useEffect, useState } from "react"
import { searchUnlocodes, type UnlocodeRecord } from "@/lib/db"
import { useDebouncedValue } from "./useDebouncedValue"

export function useUnlocodeLookup(query: string, pageSize = 6) {
  const debouncedQuery = useDebouncedValue(query, 250)
  const [results, setResults] = useState<UnlocodeRecord[]>([])
  const normalizedQuery = debouncedQuery.trim()
  const normalizedInput = query.trim()

  useEffect(() => {
    let cancelled = false

    if (normalizedQuery.length < 2) {
      return
    }

    searchUnlocodes({
      query: normalizedQuery,
      pageSize,
    })
      .then((response) => {
        if (!cancelled) {
          setResults(response.items)
        }
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          setResults([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [normalizedQuery, pageSize])

  return {
    results: normalizedQuery.length < 2 ? [] : results,
    loading: normalizedInput.length >= 2 && normalizedInput !== normalizedQuery,
  }
}
