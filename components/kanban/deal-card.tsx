'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, formatCurrency, timeAgo, getInitials, getAvatarColor, SPIN_LABELS } from '@/lib/utils'

interface DealCardProps {
  deal: {
    id: string
    title: string
    value: string | null
    status: string | null
    updatedAt: string | Date | null
    contact: {
      id: string
      name: string
      company: string | null
      phone: string | null
      tags: string[] | null
    }
    agentData?: {
      crm: number | null
      ultimamsgFrom: string | null
      followup: number | null
      ultimamsgIa: string | Date | null
    } | null
  }
  index: number
  onClick: () => void
  onDelete: () => void
}

export function DealCard({ deal, index, onClick, onDelete }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const initials = getInitials(deal.contact.name)
  const avatarColor = getAvatarColor(index)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group bg-surface-3 border border-white/[.05] rounded-[5px] p-3.5 cursor-grab select-none transition-all',
        'hover:border-gold/20 hover:shadow-[0_4px_16px_rgba(0,0,0,.3)]',
        'active:cursor-grabbing active:scale-[.98]',
        isDragging && 'opacity-40 scale-[.97]'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-[13px] font-medium text-fg leading-tight">{deal.contact.name}</div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-[22px] h-[22px] bg-surface-4 border border-white/[.07] rounded-[3px] flex items-center justify-center text-[11px] text-dim hover:bg-stage-red/20 hover:border-stage-red/30 hover:text-stage-red transition-all opacity-0 group-hover:opacity-100"
            title="Remover"
          >
            x
          </button>
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0', avatarColor)}>
            {initials}
          </div>
        </div>
      </div>

      {/* Company */}
      {deal.contact.company && (
        <div className="text-[11px] text-dim font-light mb-2">{deal.contact.company}</div>
      )}

      {/* Tags */}
      <div className="flex gap-1 flex-wrap mb-2.5">
        {deal.agentData && (
          <span className="font-mono text-[10px] tracking-wider px-[7px] py-[2px] rounded-sm uppercase bg-gold-subtle border border-gold/20 text-gold">
            Agente IA
          </span>
        )}
        {deal.agentData?.crm && (
          <span className="font-mono text-[10px] tracking-wider px-[7px] py-[2px] rounded-sm uppercase bg-stage-blue/10 border border-stage-blue/20 text-stage-blue">
            SPIN {deal.agentData.crm}
          </span>
        )}
        {deal.contact.tags?.slice(0, 2).map(tag => (
          <span key={tag} className="font-mono text-[10px] tracking-wider px-[7px] py-[2px] rounded-sm uppercase bg-white/[.05] border border-white/[.08] text-dim">
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[.05]">
        <span className="font-mono text-[11px] text-gold">
          {formatCurrency(deal.value || '0')}
        </span>
        <span className="text-[10px] text-dim font-light">
          {timeAgo(deal.updatedAt)}
        </span>
      </div>
    </div>
  )
}
