'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'

interface DealDetailPanelProps {
  dealId: string
  deals: any[]
  stages: any[]
  onClose: () => void
  onUpdated: () => void
}

export function DealDetailPanel({ dealId, deals, stages, onClose, onUpdated }: DealDetailPanelProps) {
  const deal = deals.find(d => d.id === dealId)
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    value: '',
    stageId: '',
    status: '',
  })

  useEffect(() => {
    if (deal) {
      setForm({
        title: deal.title || '',
        value: deal.value || '0',
        stageId: deal.stageId || '',
        status: deal.status || 'open',
      })
    }
  }, [dealId, deal])

  if (!deal) return null

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          value: form.value,
          stageId: form.stageId,
          status: form.status,
        }),
      })
      if (res.ok) {
        toast('Lead atualizado', 'success')
        onUpdated()
        onClose()
      } else {
        toast('Erro ao atualizar lead', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="relative h-full w-[360px] bg-surface-2 border-l border-white/[.06] shadow-2xl flex flex-col animate-slideInRight"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[.06]">
          <div>
            <div className="label-mono text-gold">Editar Lead</div>
            <div className="text-[11px] text-dim font-light mt-0.5">{deal.contact?.name}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/[.06] text-dim hover:text-fg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="label-mono text-[9px]">Título</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-xs text-fg placeholder:text-dim focus:border-gold/30 outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="label-mono text-[9px]">Valor (R$)</label>
            <input
              type="number"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-xs text-fg font-mono placeholder:text-dim focus:border-gold/30 outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="label-mono text-[9px]">Etapa</label>
            <select
              value={form.stageId}
              onChange={e => setForm(f => ({ ...f, stageId: e.target.value }))}
              className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-xs text-fg focus:border-gold/30 outline-none transition-colors"
            >
              {stages.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label-mono text-[9px]">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-xs text-fg focus:border-gold/30 outline-none transition-colors"
            >
              <option value="open">Aberto</option>
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
            </select>
          </div>

          {/* Contact info (read-only) */}
          <div className="pt-2 border-t border-white/[.04] space-y-2">
            <div className="label-mono text-[9px] text-dim mb-2">Contato</div>
            {[
              ['Nome', deal.contact?.name],
              ['Telefone', deal.contact?.phone],
              ['Empresa', deal.contact?.company],
            ].map(([label, val]) => val && (
              <div key={label} className="flex justify-between items-center">
                <span className="text-[11px] text-dim">{label}</span>
                <span className="text-xs text-fg font-light">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[.06] flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gold border border-gold text-bg font-mono text-[9px] tracking-[.14em] uppercase py-2.5 rounded-[3px] hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={onClose}
            className="px-4 font-mono text-[9px] tracking-[.14em] uppercase py-2.5 rounded-[3px] border border-white/[.08] text-dim hover:text-fg transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
