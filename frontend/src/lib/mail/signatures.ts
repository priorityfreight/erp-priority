export function normalizeSignatureImageUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim()
  if (!trimmedValue) {
    return null
  }

  try {
    const url = new URL(trimmedValue)
    if (!["http:", "https:"].includes(url.protocol)) {
      return null
    }

    const driveFileMatch = url.pathname.match(/^\/file\/d\/([^/]+)\/view$/)
    if (url.hostname === "drive.google.com" && driveFileMatch?.[1]) {
      return `https://drive.google.com/uc?export=view&id=${driveFileMatch[1]}`
    }

    const openId = url.searchParams.get("id")
    if (url.hostname === "drive.google.com" && url.pathname === "/open" && openId) {
      return `https://drive.google.com/uc?export=view&id=${openId}`
    }

    if (url.hostname === "drive.google.com" && url.pathname === "/uc" && openId) {
      url.searchParams.set("export", "view")
      return url.toString()
    }

    return url.toString()
  } catch {
    return null
  }
}

export function isProxyableSignatureImageUrl(value: string | null | undefined) {
  const normalizedUrl = normalizeSignatureImageUrl(value)
  if (!normalizedUrl) {
    return false
  }

  try {
    const url = new URL(normalizedUrl)
    return [
      "drive.google.com",
      "drive.usercontent.google.com",
      "lh3.googleusercontent.com",
    ].includes(url.hostname)
  } catch {
    return false
  }
}

export function getMailAppBaseUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "")
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`
  }

  return null
}

export function buildSignatureImageRenderUrl(
  value: string | null | undefined,
  options?: {
    appBaseUrl?: string | null
    forEmail?: boolean
  }
) {
  const normalizedUrl = normalizeSignatureImageUrl(value)
  if (!normalizedUrl) {
    return null
  }

  if (!isProxyableSignatureImageUrl(normalizedUrl)) {
    return normalizedUrl
  }

  const proxyPath = `/api/mail/signature-image?src=${encodeURIComponent(normalizedUrl)}`
  if (options?.forEmail) {
    const appBaseUrl = options.appBaseUrl?.trim().replace(/\/$/, "") || null
    return appBaseUrl ? `${appBaseUrl}${proxyPath}` : normalizedUrl
  }

  return proxyPath
}
