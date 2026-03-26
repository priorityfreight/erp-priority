type SupportedCurrency = "USD" | "EUR"

export type BanxicoExchangeRateRow = {
  rateDate: string
  baseCurrency: SupportedCurrency
  quoteCurrency: "MXN"
  rateValue: number
  source: "BANXICO"
  sourceSeriesCode: "FIX" | "EURO"
}

function formatBanxicoDate(value: Date) {
  const day = String(value.getDate()).padStart(2, "0")
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const year = value.getFullYear()
  return `${day}/${month}/${year}`
}

function toIsoDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) {
    return null
  }

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&oacute;/gi, "o")
    .replace(/&aacute;/gi, "a")
    .replace(/&eacute;/gi, "e")
    .replace(/&iacute;/gi, "i")
    .replace(/&uacute;/gi, "u")
    .replace(/&ntilde;/gi, "n")
    .replace(/&amp;/gi, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractBanxicoCells(html: string) {
  return Array.from(html.matchAll(/<td class="renglon(?:Par|Non)">([\s\S]*?)<\/td>/gi)).map(
    (match) => stripHtml(match[1] || "")
  )
}

function parseBanxicoSeries(
  html: string,
  currency: SupportedCurrency,
  seriesCode: "FIX" | "EURO"
) {
  const cells = extractBanxicoCells(html)
  const dates = cells.filter((value) => /^\d{2}\/\d{2}\/\d{4}$/.test(value))

  if (dates.length === 0) {
    throw new Error(`Banxico did not return any ${currency} dates.`)
  }

  const values = cells.filter((value) => /^(?:\d+(?:\.\d+)?|N\/E)$/i.test(value))
  const relevantValues = values.slice(-dates.length)

  if (relevantValues.length !== dates.length) {
    throw new Error(
      `Banxico ${currency} response is incomplete. Expected ${dates.length} rates and got ${relevantValues.length}.`
    )
  }

  return dates
    .map((dateValue, index) => {
      const rateText = relevantValues[index]
      const rateDate = toIsoDate(dateValue)
      if (!rateDate || /^N\/E$/i.test(rateText)) {
        return null
      }

      return {
        rateDate,
        baseCurrency: currency,
        quoteCurrency: "MXN" as const,
        rateValue: Number(rateText),
        source: "BANXICO" as const,
        sourceSeriesCode: seriesCode,
      }
    })
    .filter((row): row is BanxicoExchangeRateRow => row != null && Number.isFinite(row.rateValue))
}

async function fetchBanxicoHtml(url: string, body: URLSearchParams) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Banxico request failed with status ${response.status}`)
  }

  return response.text()
}

export async function fetchBanxicoExchangeRates(params?: {
  startDate?: Date
  endDate?: Date
}) {
  const endDate = params?.endDate ?? new Date()
  const startDate =
    params?.startDate ??
    new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 7)

  const formattedStart = formatBanxicoDate(startDate)
  const formattedEnd = formatBanxicoDate(endDate)

  const [usdHtml, eurHtml] = await Promise.all([
    fetchBanxicoHtml(
      "https://www.banxico.org.mx/tipcamb/tipCamIHAction.do",
      new URLSearchParams({
        idioma: "sp",
        fechaInicial: formattedStart,
        fechaFinal: formattedEnd,
        salida: "HTML",
      })
    ),
    fetchBanxicoHtml(
      "https://www.banxico.org.mx/tipcamb/otrasDivHistAction.do",
      new URLSearchParams({
        idioma: "sp",
        fechaInicial: formattedStart,
        fechaFinal: formattedEnd,
        seriesSeleccionadas: "EURO",
        salida: "HTML",
      })
    ),
  ])

  return [
    ...parseBanxicoSeries(usdHtml, "USD", "FIX"),
    ...parseBanxicoSeries(eurHtml, "EUR", "EURO"),
  ].sort((left, right) => left.rateDate.localeCompare(right.rateDate))
}
