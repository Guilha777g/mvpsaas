'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { X, Save, Trash2, Pencil, Send } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { timeAgo } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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
  const [tab, setTab] = useState<'dados' | 'atividades'>('dados')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    value: '',
    stageId: '',
  })

  // Activity state
  const [newNote, setNewNote] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const contactId = deal?.contact?.id
  const { data: activitiesData, mutate: mutateActivities } = useSWR(
    contactId ? `/api/activities?contactId=${contactId}` : null,
    fetcher
  )

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

      mutateActivities()
      onUpdated()
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
    mutateActivities()
    onUpdated()
    toast('Alteração desfeita', 'info')
  }

  // Activity handlers
  async function handleAddNote() {
    if (!newNote.trim()) return
    setSendingNote(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: deal.contact.id,
          dealId: deal.id,
          type: 'note',
          content: newNote.trim(),
        }),
      })
      if (res.ok) {
        setNewNote('')
        mutateActivities()
      }
    } finally {
      setSendingNote(false)
    }
  }

  async function handleDeleteActivity(id: string) {
    const res = await fetch(`/api/activities/${id}`, { method: 'DELETE' })
    if (res.ok) {
      mutateActivities()
      toast('Atividade excluída', 'info')
    }
  }

  async function handleEditActivity(id: string) {
    if (!editContent.trim()) return
    const res = await fetch(`/api/activities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    })
    if (res.ok) {
      setEditingId(null)
      setEditContent('')
      mutateActivities()
      toast('Atividade editada', 'success')
    }
  }

  function getActivityLabel(type: string) {
    switch (type) {
      case 'agent_update': return 'Agente IA'
      case 'stage_change': return 'Pipeline'
      case 'handoff': return 'Handoff'
      case 'lead_edit': return 'Edição'
      default: return 'Nota'
    }
  }

  const activities = activitiesData || []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="relative h-full w-[400px] bg-surface-2 border-l border-white/[.06] shadow-2xl flex flex-col animate-slideInRight"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[.06]">
          <div className="label-mono text-gold">{deal.contact?.name || 'Lead'}</div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/[.06] text-dim hover:text-fg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[.06]">
          <button
            onClick={() => setTab('dados')}
            className={`flex-1 py-2.5 font-mono text-[9px] tracking-[.14em] uppercase transition-all ${
              tab === 'dados'
                ? 'text-gold border-b-2 border-gold'
                : 'text-dim hover:text-fg'
            }`}
          >
            Dados
          </button>
          <button
            onClick={() => setTab('atividades')}
            className={`flex-1 py-2.5 font-mono text-[9px] tracking-[.14em] uppercase transition-all ${
              tab === 'atividades'
                ? 'text-gold border-b-2 border-gold'
                : 'text-dim hover:text-fg'
            }`}
          >
            Atividades {activities.length > 0 && `(${activities.length})`}
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'dados' ? (
          <>
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
          </>
        ) : (
          <>
            {/* Add note */}
            <div className="p-4 border-b border-white/[.06]">
              <div className="flex gap-2">
                <input
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  placeholder="Adicionar nota..."
                  className="flex-1 bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-xs text-fg placeholder:text-dim focus:border-gold/30 outline-none transition-colors"
                />
                <button
                  onClick={handleAddNote}
                  disabled={sendingNote || !newNote.trim()}
                  className="px-3 py-2 bg-gold border border-gold text-bg rounded-[3px] hover:bg-gold-light transition-colors disabled:opacity-40"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Activities list */}
            <div className="flex-1 overflow-auto">
              {activities.length === 0 ? (
                <div className="text-xs text-dim font-light py-8 text-center">Nenhuma atividade ainda</div>
              ) : (
                <div className="divide-y divide-white/[.04]">
                  {activities.map((a: any) => (
                    <div key={a.id} className="px-4 py-3 group hover:bg-surface-3/50 transition-colors">
                      {editingId === a.id ? (
                        <div className="flex gap-2">
                          <input
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleEditActivity(a.id)
                              if (e.key === 'Escape') { setEditingId(null); setEditContent('') }
                            }}
                            autoFocus
                            className="flex-1 bg-surface-3 border border-gold/30 rounded px-2 py-1.5 text-xs text-fg outline-none"
                          />
                          <button
                            onClick={() => handleEditActivity(a.id)}
                            className="text-[10px] text-gold font-mono"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditContent('') }}
                            className="text-[10px] text-dim font-mono"
                          >
                            Esc
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-fg font-light leading-relaxed">{a.content}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[9px] text-dim">{getActivityLabel(a.type)}</span>
                                <span className="text-[9px] text-dim/60">{timeAgo(a.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {a.authorType === 'user' && (
                                <>
                                  <button
                                    onClick={() => { setEditingId(a.id); setEditContent(a.content) }}
                                    className="p-1 rounded hover:bg-white/[.06] text-dim hover:text-fg transition-all"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteActivity(a.id)}
                                    className="p-1 rounded hover:bg-stage-red/10 text-dim hover:text-stage-red transition-all"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
