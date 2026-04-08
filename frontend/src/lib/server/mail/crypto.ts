import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto"

function getMailEncryptionSecret() {
  const secret = process.env.MAIL_ENCRYPTION_KEY?.trim()

  if (!secret) {
    throw new Error("Missing MAIL_ENCRYPTION_KEY.")
  }

  return secret
}

function deriveKey() {
  return createHash("sha256").update(getMailEncryptionSecret()).digest()
}

export function encryptMailSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`
}

export function decryptMailSecret(value: string) {
  const [ivPart, tagPart, payloadPart] = value.split(".")

  if (!ivPart || !tagPart || !payloadPart) {
    throw new Error("Invalid encrypted mail secret.")
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(),
    Buffer.from(ivPart, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadPart, "base64url")),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

export function signMailOAuthState(mailboxId: string, issuedAt = Date.now()) {
  const payload = `${mailboxId}.${issuedAt}`
  const signature = createHmac("sha256", deriveKey()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function verifyMailOAuthState(state: string) {
  const [mailboxId, issuedAtRaw, signature] = state.split(".")

  if (!mailboxId || !issuedAtRaw || !signature) {
    throw new Error("Invalid OAuth state.")
  }

  const payload = `${mailboxId}.${issuedAtRaw}`
  const expectedSignature = createHmac("sha256", deriveKey()).update(payload).digest("base64url")

  if (signature !== expectedSignature) {
    throw new Error("OAuth state verification failed.")
  }

  const issuedAt = Number(issuedAtRaw)

  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 1000 * 60 * 15) {
    throw new Error("OAuth state expired.")
  }

  return {
    mailboxId,
    issuedAt,
  }
}
