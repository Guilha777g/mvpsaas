'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { X } from 'lucide-react'

interface AddDealModalProps {
  stageId: string
  stages: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}

export function AddDealModal({ stageId, stages, onClose, onCreated }: AddDealModalProps) {
  const [form, setForm] = useState({
    contactName: '',
    contactCompany: '',
    contactPhone: '',
    value: '',
    stageId: stageId,
    tags: [] as string[],
    obs: '',
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.contactName.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.contactName,
          contactName: form.contactName,
          contactPhone: form.contactPhone || undefined,
          contactCompany: form.contactCompany || undefined,
          value: parseFloat(form.value.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
          stageId: form.stageId,
          tags: form.tags,
        }),
      })

      if (res.ok) {
        toast('Lead adicionado com sucesso', 'success')
        onCreated()
      } else {
        toast('Erro ao adicionar lead', 'error')
      }
    } catch {
      toast('Erro ao adicionar lead', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-[4px] z-[100] flex items-center justify-center animate-fadeIn"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface-2 border border-white/[.07] rounded-lg w-[440px] p-7 shadow-[0_24px_64px_rgba(0,0,0,.6)] animate-scaleIn">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <h2 className="title-serif text-[22px]">
            Novo <em className="italic text-gold-light">Lead</em>
          </h2>
          <button onClick={onClose} className="text-dim hover:text-fg transition-colors p-1 rounded hover:bg-white/[.05]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="grid grid-cols-2 gap-3.5 mb-3.5">
          <div className="flex flex-col gap-1">
            <label className="label-mono">Nome</label>
            <input
              value={form.contactName}
              onChange={e => update('contactName', e.target.value)}
              placeholder="Nome completo"
              className="bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-[13px] text-fg placeholder:text-dim"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-mono">Empresa</label>
            <input
              value={form.contactCompany}
              onChange={e => update('contactCompany', e.target.value)}
              placeholder="Nome da empresa"
              className="bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-[13px] text-fg placeholder:text-dim"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-mono">WhatsApp</label>
            <input
              value={form.contactPhone}
              onChange={e => update('contactPhone', e.target.value)}
              placeholder="(61) 9 0000-0000"
              className="bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-[13px] text-fg placeholder:text-dim"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="label-mono">Valor estimado</label>
            <input
              value={form.value}
              onChange={e => update('value', e.target.value)}
              placeholder="R$ 0,00"
              className="bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-[13px] text-fg placeholder:text-dim"
            />
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <label className="label-mono">Etapa</label>
            <select
              value={form.stageId}
              onChange={e => update('stageId', e.target.value)}
              className="bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-[13px] text-fg appearance-none cursor-pointer"
            >
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 justify-end pt-4 border-t border-white/[.05] mt-1.5">
          <button
            onClick={onClose}
            className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] border border-white/[.08] text-dim hover:border-white/[.18] hover:text-fg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.contactName.trim()}
            className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] bg-gold border border-gold text-bg font-semibold hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Adicionar Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
