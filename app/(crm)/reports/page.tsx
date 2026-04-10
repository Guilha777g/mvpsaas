'use client'

import { Topbar } from '@/components/layout/topbar'
import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Relatórios" subtitle="Métricas e performance" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface-2 border border-white/[.04] rounded-md p-10 flex flex-col items-center text-center">
            <BarChart3 className="w-12 h-12 text-dim opacity-20 mb-4" />
            <div className="text-sm text-fg font-medium mb-1">Relatórios avançados</div>
            <div className="text-xs text-dim font-light max-w-[300px]">
              Em breve: funil detalhado, performance do agente, tempo médio de conversão, receita por período.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
