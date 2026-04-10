'use client'

import { Topbar } from '@/components/layout/topbar'

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Relatórios" subtitle="Métricas e performance" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface-2 border border-white/[.04] rounded-md p-8 text-center">
            <div className="text-2xl mb-3 opacity-30">&#8599;</div>
            <div className="text-sm text-fg mb-1">Relatórios avançados</div>
            <div className="text-xs text-dim font-light">
              Em breve: funil detalhado, performance do agente, tempo médio de conversão, receita por período.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
