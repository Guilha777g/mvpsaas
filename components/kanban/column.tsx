'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn, formatCurrencyShort } from '@/lib/utils'
import { Inbox } from 'lucide-react'
import { DealCard } from './deal-card'

interface Stage {
  id: string
  name: string
  color: string | null
  isSystem: boolean | null
  spinValue: number | null
}

interface ColumnProps {
  stage: Stage
  deals: any[]
  index: number
  onDealClick: (dealId: string) => void
  onDealDelete: (dealId: string) => void
  onAddDeal: (stageId: string) => void
}

export function KanbanColumn({ stage, deals, index, onDealClick, onDealDelete, onAddDeal }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const totalValue = deals.reduce((s: number, d: any) => s + parseFloat(d.value || '0'), 0)

  return (
    <div
      className="flex-shrink-0 w-[250px] flex flex-col animate-fadeUp"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 rounded-t-md border"
        style={{
          background: `${stage.color}11`,
          borderColor: `${stage.color}44`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
            style={{ background: stage.color || '#C9A84C' }}
          />
          <span className="font-mono text-[9px] tracking-[.16em] uppercase font-normal" style={{ color: `${stage.color}cc` }}>
            {stage.name}
          </span>
          <span className="font-mono text-[9px] text-dim">{deals.length}</span>
        </div>
        {totalValue > 0 && (
          <span className="font-mono text-[9px] text-dim">{formatCurrencyShort(totalValue)}</span>
        )}
      </div>

      {/* Body */}
      <div
        ref={setNodeRef}
        className={cn(
          'bg-surface-2 border border-white/[.04] border-t-0 rounded-b-md p-2.5 min-h-[200px] flex flex-col gap-2 flex-1 transition-colors',
          isOver && 'border-gold/30 bg-gold/[.03]'
        )}
      >
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Inbox className="w-8 h-8 text-dim opacity-20" />
              <div className="text-[11px] text-dim text-center font-light">Nenhum lead nesta etapa</div>
            </div>
          )}
          {deals.map((deal: any, i: number) => (
            <DealCard
              key={deal.id}
              deal={deal}
              index={i}
              onClick={() => onDealClick(deal.id)}
              onDelete={() => onDealDelete(deal.id)}
            />
          ))}
        </SortableContext>

        <button
          onClick={() => onAddDeal(stage.id)}
          className="flex items-center gap-[7px] px-2.5 py-2 rounded text-xs text-dim font-light transition-all border border-dashed border-transparent hover:bg-surface-3 hover:border-white/[.06] hover:text-fg mt-0.5"
        >
          <span className="text-sm text-dim">+</span> Adicionar lead
        </button>
      </div>
    </div>
  )
}
