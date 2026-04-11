'use client'

import { createContext, useContext } from 'react'

interface AdminContextValue {
  role?: string
  selectedTenantId: string | null
}

const AdminContext = createContext<AdminContextValue>({ selectedTenantId: null })

export function AdminProvider({ children, role, selectedTenantId }: { children: React.ReactNode; role?: string; selectedTenantId: string | null }) {
  return (
    <AdminContext.Provider value={{ role, selectedTenantId }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}
