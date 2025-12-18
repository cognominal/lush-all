import crypto from 'node:crypto'

function base64UrlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export function randomBase64Url(bytes: number): string {
  return base64UrlEncode(crypto.randomBytes(bytes))
}

export function pkceChallengeS256(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return base64UrlEncode(hash)
}

