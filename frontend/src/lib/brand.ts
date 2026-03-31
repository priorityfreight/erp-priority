export const brandIdentity = {
  appName: "Priority Freight Intelligence ERP",
  companyName: "Priority Freight Intelligence",
  description:
    "Corporate ERP for freight intelligence, CRM, pricing, quotations and operations.",
  tagline: "Smarter · Better · Faster",
} as const

export const brandAssets = {
  favicon: "/assets/favicon-transparent.png",
  shell: {
    mark: "/assets/logo_vSVG.svg",
    wordmarkLight: "/assets/logo_vSVG.svg",
    wordmarkDark: "/assets/logo_vSVG.svg",
  },
  documents: {
    customerQuotation: "/assets/logo-horizontal-transparent.png",
    providerPricingRequest: "/assets/logo-horizontal-dark-transparent.png",
  },
} as const

export function normalizePublicAssetPath(assetPath: string) {
  return assetPath.replace(/^\/+/, "")
}
