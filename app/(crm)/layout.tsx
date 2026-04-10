import { getSession } from '@/lib/auth/middleware'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { deals } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { CrmLayoutClient } from './crm-layout-client'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  let dealCount = 0
  try {
    const result = await db.select()
      .from(deals)
      .where(and(eq(deals.tenantId, session.tenantId), eq(deals.status, 'open')))
    dealCount = result.length
  } catch {
    // DB not yet initialized
  }

  return (
    <CrmLayoutClient
      tenantName={session.name}
      dealCount={dealCount}
    >
      {children}
    </CrmLayoutClient>
  )
}
