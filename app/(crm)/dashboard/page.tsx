'use client'

import useSWR from 'swr'
import { Topbar } from '@/components/layout/topbar'
import { formatCurrencyShort, timeAgo } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function DashboardPage() {
  const { data, isLoading } = useSWR('/api/dashboard', fetcher, { refreshInterval: 30000 })

  const stats = data?.stats || {}
  const stageStats = data?.stageStats || []
  const recentActivity = data?.recentActivity || []

  const cards = [
    { label: 'Total no Pipeline', value: formatCurrencyShort(stats.totalPipelineValue || 0), sub: `${stats.openDeals || 0} deals abertos`, gold: true },
    { label: 'Contatos', value: String(stats.totalContacts || 0), sub: 'cadastrados' },
    { label: 'Ganhos', value: String(stats.wonDeals || 0), sub: formatCurrencyShort(stats.wonValue || 0) + ' fechados' },
    { label: 'Taxa de Conversão', value: `${stats.conversionRate || 0}%`, sub: 'do pipeline total', gold: true },
    { label: 'Perdidos', value: String(stats.lostDeals || 0), sub: 'não convertidos' },
    { label: 'Agente IA', value: String(stats.agentActive || 0), sub: `de ${stats.agentTotal || 0} leads — ativos 24h`, gold: true },
  ]

  return (
    <>
      <Topbar title="Dashboard" subtitle="Visão geral do CRM" />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-dim text-sm">Carregando...</div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3.5">
              {cards.map((card, i) => (
                <div key={i} className="bg-surface-2 border border-white/[.04] rounded-md p-5 flex flex-col gap-1.5">
                  <span className="label-mono">{card.label}</span>
                  <div className={`title-serif text-2xl leading-none ${card.gold ? 'text-gold-light' : 'text-fg'}`}>
                    {card.value}
                  </div>
                  <span className="text-[10px] text-dim font-light">{card.sub}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Pipeline Funnel */}
              <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
                <h3 className="label-mono text-gold mb-4">Funil do Pipeline</h3>
                <div className="space-y-2">
                  {stageStats.map((stage: any) => {
                    const maxCount = Math.max(...stageStats.map((s: any) => s.count), 1)
                    const width = Math.max((stage.count / maxCount) * 100, 4)

                    return (
                      <div key={stage.id} className="flex items-center gap-3">
                        <span className="text-[11px] text-dim w-24 truncate">{stage.name}</span>
                        <div className="flex-1 h-6 bg-surface-3 rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm flex items-center px-2 transition-all"
                            style={{
                              width: `${width}%`,
                              background: `${stage.color}33`,
                              borderRight: `2px solid ${stage.color}`,
                            }}
                          >
                            <span className="font-mono text-[9px] text-fg">{stage.count}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-dim w-16 text-right">
                          {formatCurrencyShort(stage.value)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
                <h3 className="label-mono text-gold mb-4">Atividade Recente</h3>
                <div className="space-y-0">
                  {recentActivity.length === 0 && (
                    <div className="text-xs text-dim font-light py-4 text-center">Nenhuma atividade ainda</div>
                  )}
                  {recentActivity.map((a: any) => (
                    <div key={a.id} className="py-2 border-b border-white/[.04] last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs text-fg font-light leading-relaxed">{a.content}</div>
                          <div className="font-mono text-[9px] text-dim mt-0.5">
                            {a.type === 'agent_update' ? 'Agente IA' :
                             a.type === 'stage_change' ? 'Pipeline' :
                             a.type === 'handoff' ? 'Handoff' : 'Nota'}
                          </div>
                        </div>
                        <span className="text-[10px] text-dim flex-shrink-0">{timeAgo(a.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
