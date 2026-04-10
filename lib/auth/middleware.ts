import { cookies } from 'next/headers'
import { verifyJWT, type JWTPayload } from './index'

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  try {
    return await verifyJWT(token)
  } catch {
    return null
  }
}

export async function requireSession(): Promise<JWTPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
