export type ContactStatusValue = "activo" | "ya_no_trabaja"

export function normalizeWhatsAppLink(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) {
    return null
  }

  let normalized = digits

  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2)
  }

  if (normalized.length === 10) {
    normalized = `52${normalized}`
  }

  if (normalized.startsWith("521") && normalized.length === 13) {
    normalized = `52${normalized.slice(3)}`
  }

  if (normalized.length < 12) {
    return null
  }

  return `https://api.whatsapp.com/send?phone=${normalized}`
}

export function isValidEmail(value: string) {
  if (!value.trim()) {
    return true
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isValidLinkedInUrl(value: string) {
  if (!value.trim()) {
    return true
  }

  try {
    const url = new URL(value.trim())
    return url.hostname.includes("linkedin.com")
  } catch {
    return false
  }
}

export function normalizeContactStatus(value: string | null | undefined): ContactStatusValue {
  return value === "ya_no_trabaja" ? "ya_no_trabaja" : "activo"
}
