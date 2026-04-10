import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { requireSession } from '@/lib/auth/middleware'
import { isAdmin } from '@/lib/auth/admin'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await requireSession()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const allTenants = await db.select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      plan: tenants.plan,
      createdAt: tenants.createdAt,
    })
      .from(tenants)
      .orderBy(desc(tenants.createdAt))

    return NextResponse.json(allTenants)
  } catch (error) {
    console.error('GET tenants error:', error)
    return NextResponse.json({ error: 'Erro ao listar tenants' }, { status: 500 })
  }
}
