// Verifies Supabase Auth access tokens. Newer projects sign them with asymmetric keys published as
// JWKS; older ones use the project's shared JWT secret (HS256). Either way the "sub" claim is the
// user id the data is stored under.

import { createRemoteJWKSet, jwtVerify, type JWTVerifyOptions } from 'jose'

export interface AuthUser {
  id: string
  email?: string
}

export type Verify = (token: string) => Promise<AuthUser>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function supabaseVerifier(opts: { supabaseUrl?: string; jwtSecret?: string }): Verify {
  const base = opts.supabaseUrl?.replace(/\/+$/, '')
  const checks: JWTVerifyOptions = { audience: 'authenticated', ...(base ? { issuer: `${base}/auth/v1` } : {}) }
  let key: Parameters<typeof jwtVerify>[1]
  if (opts.jwtSecret) {
    key = new TextEncoder().encode(opts.jwtSecret)
    checks.algorithms = ['HS256']
  } else if (base) {
    key = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`))
  } else {
    throw new Error('Set SUPABASE_URL (JWKS) or SUPABASE_JWT_SECRET to verify access tokens')
  }
  return async (token) => {
    const { payload } = await jwtVerify(token, key as never, checks)
    if (typeof payload.sub !== 'string' || !UUID.test(payload.sub)) throw new Error('token has no user id')
    return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined }
  }
}
