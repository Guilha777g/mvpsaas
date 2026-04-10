'use client'

import { Sidebar } from '@/components/layout/sidebar'

interface CrmLayoutClientProps {
  children: React.ReactNode
  tenantName: string
  dealCount: number
}

export function CrmLayoutClient({ children, tenantName, dealCount }: CrmLayoutClientProps) {
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar tenantName={tenantName} dealCount={dealCount} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
