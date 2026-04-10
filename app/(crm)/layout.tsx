import { getSession } from '@/lib/auth/middleware'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { deals, tenants } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { CrmLayoutClient } from './crm-layout-client'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isAdmin = session.role === 'admin'

  let dealCount = 0
  let tenantsList: { id: string; name: string; slug: string }[] = []

  try {
    if (isAdmin) {
      tenantsList = await db.select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
      }).from(tenants)
    } else {
      const result = await db.select()
        .from(deals)
        .where(and(eq(deals.tenantId, session.tenantId), eq(deals.status, 'open')))
      dealCount = result.length
    }
  } catch {
    // DB not yet initialized
  }

  return (
    <CrmLayoutClient
      tenantName={isAdmin ? 'Administrador' : session.name}
      dealCount={dealCount}
      role={session.role}
      tenants={isAdmin ? tenantsList : undefined}
    >
      {children}
    </CrmLayoutClient>
  )
}
