'use client'

import { useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { ToastProvider } from '@/components/ui/toast'
import { AdminProvider } from '@/lib/admin-context'

interface Tenant {
  id: string
  name: string
  slug: string
}

interface CrmLayoutClientProps {
  children: React.ReactNode
  tenantName: string
  dealCount: number
  role?: string
  tenants?: Tenant[]
}

export function CrmLayoutClient({ children, tenantName, dealCount, role, tenants }: CrmLayoutClientProps) {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)

  const handleSelectTenant = useCallback((tenantId: string | null) => {
    setSelectedTenantId(tenantId)
  }, [])

  const displayName = role === 'admin'
    ? (tenants?.find(t => t.id === selectedTenantId)?.name || 'Administrador')
    : tenantName

  return (
    <AdminProvider role={role} selectedTenantId={selectedTenantId}>
      <ToastProvider>
        <div className="h-screen flex overflow-hidden">
          <Sidebar
            tenantName={displayName}
            dealCount={role === 'admin' && !selectedTenantId ? 0 : dealCount}
            role={role}
            tenants={tenants}
            selectedTenantId={selectedTenantId}
            onSelectTenant={handleSelectTenant}
          />
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </ToastProvider>
    </AdminProvider>
  )
}
