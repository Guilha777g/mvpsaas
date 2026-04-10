import { signJWT, type JWTPayload } from './index'

export function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL || '',
    password: process.env.ADMIN_PASSWORD || '',
  }
}

export function isAdminConfigured(): boolean {
  const { email, password } = getAdminCredentials()
  return Boolean(email && password)
}

export function isAdmin(session: JWTPayload | null): boolean {
  return session?.role === 'admin'
}

export async function signAdminJWT(): Promise<string> {
  return signJWT({
    userId: 'admin',
    tenantId: 'admin',
    role: 'admin',
    name: 'Administrador',
    email: getAdminCredentials().email,
  })
}
