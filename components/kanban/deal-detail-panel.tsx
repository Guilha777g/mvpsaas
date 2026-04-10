'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

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
    name: '',
    phone: '',
    email: '',
    company: '',
    value: '',
    stageId: '',
  })

  useEffect(() => {
    if (deal) {
      setForm({
        name: deal.contact?.name || '',
        phone: deal.contact?.phone || '',
        email: deal.contact?.email || '',
        company: deal.contact?.company || '',
        value: deal.value || '0',
        stageId: deal.stageId || '',
      })
    }
  }, [dealId, deal])

  if (!deal) return null

  function field(key: keyof typeof form, label: string, placeholder = '') {
    return (
      <div className="space-y-1.5">
        <label className="label-mono text-[9px]">{label}</label>
        <input
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-xs text-fg placeholder:text-dim focus:border-gold/30 outline-none transition-colors"
        />
      </div>
    )
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast('Nome é obrigatório', 'error')
      return
    }
    setSaving(true)

    // Snapshot dos valores anteriores para undo
    const previous = {
      contact: {
        name: deal.contact?.name || '',
        phone: deal.contact?.phone || null,
        email: deal.contact?.email || null,
        company: deal.contact?.company || null,
      },
      deal: {
        value: deal.value || '0',
        stageId: deal.stageId || '',
      },
    }

    // Detectar campos alterados para o log
    const changed: string[] = []
    if (form.name.trim() !== previous.contact.name) changed.push('Nome')
    if ((form.phone.trim() || null) !== previous.contact.phone) changed.push('WhatsApp')
    if ((form.email.trim() || null) !== previous.contact.email) changed.push('Email')
    if ((form.company.trim() || null) !== previous.contact.company) changed.push('Empresa')
    if (form.value !== previous.deal.value) changed.push('Valor')
    if (form.stageId !== previous.deal.stageId) {
      const stageName = stages.find((s: any) => s.id === form.stageId)?.name
      changed.push(`Etapa → ${stageName || form.stageId}`)
    }

    try {
      const [contactRes, dealRes] = await Promise.all([
        fetch(`/api/contacts/${deal.contact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            company: form.company.trim() || null,
          }),
        }),
        fetch(`/api/deals/${dealId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: parseFloat(form.value) || 0,
            stageId: form.stageId,
          }),
        }),
      ])

      if (!contactRes.ok || !dealRes.ok) {
        toast('Erro ao atualizar lead', 'error')
        return
      }

      // Registrar atividade
      const activityContent = changed.length > 0
        ? `Lead editado: ${changed.join(', ')}`
        : 'Lead editado'

      let activityId: string | null = null
      const activityRes = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: deal.contact.id,
          type: 'lead_edit',
          content: activityContent,
          authorType: 'user',
        }),
      })
      if (activityRes.ok) {
        const activity = await activityRes.json()
        activityId = activity.id
      }

      onUpdated()
      onClose()

      // Toast com undo
      toast('Lead atualizado', 'success', {
        label: 'Desfazer',
        onClick: () => revert(previous, activityId),
      })
    } finally {
      setSaving(false)
    }
  }

  async function revert(
    previous: { contact: { name: string; phone: string | null; email: string | null; company: string | null }; deal: { value: string; stageId: string } },
    activityId: string | null
  ) {
    const ops: Promise<any>[] = [
      fetch(`/api/contacts/${deal.contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previous.contact),
      }),
      fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: parseFloat(previous.deal.value) || 0,
          stageId: previous.deal.stageId,
        }),
      }),
    ]

    if (activityId) {
      ops.push(fetch(`/api/activities/${activityId}`, { method: 'DELETE' }))
    }

    await Promise.all(ops)
    onUpdated()
    toast('Alteração desfeita', 'info')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="relative h-full w-[360px] bg-surface-2 border-l border-white/[.06] shadow-2xl flex flex-col animate-slideInRight"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[.06]">
          <div className="label-mono text-gold">Editar Lead</div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/[.06] text-dim hover:text-fg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {field('name', 'Nome', 'Nome completo')}
          {field('phone', 'WhatsApp', '(61) 9 0000-0000')}
          {field('email', 'Email', 'email@exemplo.com')}
          {field('company', 'Empresa', 'Nome da empresa')}

          <div className="space-y-1.5">
            <label className="label-mono text-[9px]">Valor estimado</label>
            <input
              type="number"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              placeholder="0"
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
