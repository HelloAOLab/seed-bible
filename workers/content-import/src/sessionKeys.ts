function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * The user id inside a CasualOS session key
 * (`vSK1.<userId>.<sessionId>.<secret>.<expiry>`, each part base64), or null
 * when it isn't one. This only reads the key; whether it's still valid is
 * CasualOS's call (see `authenticate` in `api.ts`).
 */
export function sessionKeyUserId(key: string): string | null {
  if (!key.startsWith("vSK1.")) {
    return null;
  }
  const parts = key.slice("vSK1.".length).split(".");
  if (parts.length !== 4 || parts.some((part) => part.length === 0)) {
    return null;
  }
  try {
    return new TextDecoder().decode(fromBase64(parts[0]!)) || null;
  } catch {
    return null;
  }
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const raw = fromBase64(secret);
  if (raw.length !== 32) {
    throw new Error("SESSION_KEY_SECRET must be base64 of 32 bytes.");
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypts a session key for storage while its import runs (AES-GCM, a fresh
 * random IV each time). The result is `iv.ciphertext`, both base64.
 */
export async function encryptSessionKey(
  sessionKey: string,
  secret: string
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(sessionKey)
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(sealed))}`;
}

export async function decryptSessionKey(
  stored: string,
  secret: string
): Promise<string> {
  const [iv, sealed] = stored.split(".");
  if (!iv || !sealed) {
    throw new Error("Stored session key is malformed.");
  }
  const opened = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    await encryptionKey(secret),
    fromBase64(sealed)
  );
  return new TextDecoder().decode(opened);
}

/** A key for caching who a session key belongs to, without keeping the key itself. */
export async function sessionKeyFingerprint(
  sessionKey: string
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(sessionKey)
  );
  return toBase64(new Uint8Array(digest));
}
