export function toNumberOrNull(value: string) {
  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function calculateCbm({
  pieceCount,
  widthCm,
  lengthCm,
  heightCm,
}: {
  pieceCount: number | null
  widthCm: number | null
  lengthCm: number | null
  heightCm: number | null
}) {
  if (
    pieceCount == null ||
    widthCm == null ||
    lengthCm == null ||
    heightCm == null ||
    pieceCount <= 0 ||
    widthCm <= 0 ||
    lengthCm <= 0 ||
    heightCm <= 0
  ) {
    return null
  }

  return (pieceCount * widthCm * lengthCm * heightCm) / 1_000_000
}

export function calculateVolumetricWeightKg({
  pieceCount,
  widthCm,
  lengthCm,
  heightCm,
  divisor = 5000,
}: {
  pieceCount: number | null
  widthCm: number | null
  lengthCm: number | null
  heightCm: number | null
  divisor?: number
}) {
  if (
    pieceCount == null ||
    widthCm == null ||
    lengthCm == null ||
    heightCm == null ||
    pieceCount <= 0 ||
    widthCm <= 0 ||
    lengthCm <= 0 ||
    heightCm <= 0
  ) {
    return null
  }

  return (pieceCount * widthCm * lengthCm * heightCm) / divisor
}

export function estimateFreightClass({
  pieceCount,
  widthCm,
  lengthCm,
  heightCm,
  weightKg,
}: {
  pieceCount: number | null
  widthCm: number | null
  lengthCm: number | null
  heightCm: number | null
  weightKg: number | null
}) {
  const cbm = calculateCbm({
    pieceCount,
    widthCm,
    lengthCm,
    heightCm,
  })

  if (cbm == null || weightKg == null || weightKg <= 0) {
    return null
  }

  const cubicFeet = cbm * 35.3147
  const pounds = weightKg * 2.20462
  const density = pounds / cubicFeet

  if (!Number.isFinite(density) || density <= 0) {
    return null
  }

  if (density < 1) return "400"
  if (density < 2) return "300"
  if (density < 4) return "250"
  if (density < 6) return "175"
  if (density < 8) return "125"
  if (density < 10) return "100"
  if (density < 12) return "92.5"
  if (density < 15) return "85"
  if (density < 22.5) return "70"
  if (density < 30) return "65"
  if (density < 35) return "60"
  if (density < 50) return "55"
  return "50"
}

export function estimateFreightClassFromTotals({
  totalCbm,
  totalWeightKg,
}: {
  totalCbm: number | null
  totalWeightKg: number | null
}) {
  if (totalCbm == null || totalWeightKg == null || totalCbm <= 0 || totalWeightKg <= 0) {
    return null
  }

  const cubicFeet = totalCbm * 35.3147
  const pounds = totalWeightKg * 2.20462
  const density = pounds / cubicFeet

  if (!Number.isFinite(density) || density <= 0) {
    return null
  }

  if (density < 1) return "400"
  if (density < 2) return "300"
  if (density < 4) return "250"
  if (density < 6) return "175"
  if (density < 8) return "125"
  if (density < 10) return "100"
  if (density < 12) return "92.5"
  if (density < 15) return "85"
  if (density < 22.5) return "70"
  if (density < 30) return "65"
  if (density < 35) return "60"
  if (density < 50) return "55"
  return "50"
}

export function normalizeWhatsAppLink(phone: string | null | undefined) {
  const digits = String(phone ?? "").replace(/\D/g, "")
  if (!digits) {
    return null
  }

  if (digits.length === 10) {
    return `https://api.whatsapp.com/send?phone=52${digits}`
  }

  if (digits.startsWith("00")) {
    return `https://api.whatsapp.com/send?phone=${digits.slice(2)}`
  }

  return `https://api.whatsapp.com/send?phone=${digits}`
}
