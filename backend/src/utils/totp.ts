import crypto from 'node:crypto';

/**
 * RFC 6238 TOTP, RFC 4226 HOTP. Pure Node — no external dep.
 *
 * Authenticator apps (Google Authenticator, 1Password, Authy, Microsoft
 * Authenticator) all use the same defaults: SHA-1, 6 digits, 30s step. We
 * follow that exactly so the secret + otpauth URI we emit drops into any of
 * them via QR.
 *
 * The secret itself is a 20-byte (160-bit) random buffer encoded as base32 —
 * RFC 3548 base32 alphabet, padding stripped, which is what authenticator apps
 * expect. We accept the same encoding back when verifying.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(byteLen = 20): string {
  const buf = crypto.randomBytes(byteLen);
  return base32Encode(buf);
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s
    .toUpperCase()
    .replace(/=+$/, '')
    .replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx < 0) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  // 8-byte big-endian counter
  const c = Buffer.alloc(8);
  c.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  c.writeUInt32BE(counter % 0x100000000, 4);
  const hmac = crypto.createHmac('sha1', secret).update(c).digest();
  // Dynamic truncation per RFC 4226 §5.3.
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return String(code % mod).padStart(digits, '0');
}

export function generateTotp(secretBase32: string, time = Date.now(), step = 30): string {
  const counter = Math.floor(time / 1000 / step);
  return hotp(base32Decode(secretBase32), counter);
}

/**
 * Verify a 6-digit code against the current 30s window plus ±1 step (so users
 * have ~90 seconds of leeway for clock skew and slow typing). Returns true on
 * a match in any of the three windows.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  time = Date.now(),
  step = 30
): boolean {
  const cleaned = (code ?? '').replace(/\D/g, '');
  if (cleaned.length !== 6) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(time / 1000 / step);
  for (let drift = -1; drift <= 1; drift++) {
    const candidate = hotp(secret, counter + drift);
    // Constant-time compare to avoid timing leaks. Both strings are 6 digits so
    // length never differs, but be defensive.
    if (
      candidate.length === cleaned.length &&
      crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(cleaned))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Build the otpauth:// URI that authenticator apps consume. The user's email
 * goes in the label, "LearnHub" in the issuer; the secret is base32. Frontend
 * passes this through a QR-rendering library.
 */
export function buildOtpauthUri(
  email: string,
  secretBase32: string,
  issuer = 'LearnHub'
): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Single-use 8-character recovery codes — base32 alphabet for readability. */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buf = crypto.randomBytes(5);
    codes.push(base32Encode(buf).slice(0, 10));
  }
  return codes;
}

export function hashRecoveryCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code.toUpperCase().replace(/\s+/g, ''))
    .digest('hex');
}
