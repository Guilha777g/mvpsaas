import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, tenants } from '@/lib/db/schema'
import { comparePassword, signJWT } from '@/lib/auth'
import { getAdminCredentials, isAdminConfigured, signAdminJWT } from '@/lib/auth/admin'
import { loginSchema } from '@/lib/validations'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { email, password } = parsed.data

    // Check admin login via ENV first
    if (isAdminConfigured()) {
      const admin = getAdminCredentials()
      if (email === admin.email && password === admin.password) {
        const token = await signAdminJWT()
        const cookieStore = await cookies()
        cookieStore.set('session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
        return NextResponse.json({ success: true })
      }
    }

    // Find user by email (any tenant)
    const userRows = await db.select({
      user: users,
      tenant: tenants,
    })
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.email, email))
      .limit(1)

    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 })
    }

    const { user, tenant } = userRows[0]

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 })
    }

    // Update last login
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id))

    const token = await signJWT({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role || 'member',
      name: tenant.name,
      email: user.email,
    })

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 })
  }
}
