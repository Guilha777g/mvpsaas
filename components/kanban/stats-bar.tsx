'use client'

import { formatCurrencyShort } from '@/lib/utils'

interface StatsBarProps {
  deals: any[]
}

export function StatsBar({ deals }: StatsBarProps) {
  const total = deals.reduce((s: number, d: any) => s + parseFloat(d.value || '0'), 0)
  const openDeals = deals.filter((d: any) => d.status === 'open')
  const wonDeals = deals.filter((d: any) => d.status === 'won')
  const wonValue = wonDeals.reduce((s: number, d: any) => s + parseFloat(d.value || '0'), 0)
  const conversionRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0

  const stats = [
    { label: 'Total no pipeline', value: formatCurrencyShort(total), sub: `${openDeals.length} leads ativos`, highlight: true },
    { label: 'Em proposta', value: String(deals.filter((d: any) => d.status === 'open').length), sub: 'aguardando resposta', up: true },
    { label: 'Ganhos', value: String(wonDeals.length), sub: `${formatCurrencyShort(wonValue)} fechados` },
    { label: 'Taxa de conversão', value: `${conversionRate}%`, sub: 'do pipeline total', highlight: true },
  ]

  return (
    <div className="flex border-b border-white/[.04] flex-shrink-0 bg-surface-2">
      {stats.map((stat, i) => (
        <div key={i} className="flex-1 px-6 py-3.5 border-r border-white/[.04] last:border-r-0 flex flex-col gap-1">
          <span className="label-mono">{stat.label}</span>
          <div className={`title-serif text-[22px] leading-none ${stat.highlight ? 'text-gold-light' : 'text-fg'}`}>
            {stat.value}
          </div>
          <span className={`text-[10px] font-light ${stat.up ? 'text-stage-green' : 'text-dim'}`}>
            {stat.sub}
          </span>
        </div>
      ))}
    </div>
  )
}
