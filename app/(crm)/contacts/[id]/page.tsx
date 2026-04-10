'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { cn, formatCurrency, formatDateTime, timeAgo, formatShortDateTime, getInitials, getAvatarColor, SPIN_LABELS } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Trash2, Pencil, X } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(`/api/contacts/${id}`, fetcher)
  const [note, setNote] = useState('')
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const { toast } = useToast()

  async function deleteContact() {
    if (!confirm('Excluir este contato? Todos os deals e atividades relacionados serão removidos.')) return
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('Contato excluído', 'info')
      router.push('/contacts')
    } else {
      toast('Erro ao excluir contato', 'error')
    }
  }

  async function deleteActivity(activityId: string) {
    const res = await fetch(`/api/activities/${activityId}`, { method: 'DELETE' })
    if (res.ok) {
      toast('Atividade removida', 'info')
      mutate()
    } else {
      toast('Erro ao remover atividade', 'error')
    }
  }

  async function updateActivity(activityId: string) {
    if (!editContent.trim()) return
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent }),
    })
    if (res.ok) {
      toast('Atividade atualizada', 'success')
      setEditingActivityId(null)
      mutate()
    } else {
      toast('Erro ao atualizar', 'error')
    }
  }

  if (isLoading) {
    return (
      <>
        <Topbar title="Contato" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center text-dim">Carregando...</div>
      </>
    )
  }

  if (!data?.contact) {
    return (
      <>
        <Topbar title="Contato" subtitle="Não encontrado" />
        <div className="flex-1 flex items-center justify-center text-dim">Contato não encontrado</div>
      </>
    )
  }

  const { contact, deals, activities, agentData } = data

  async function addNote() {
    if (!note.trim()) return
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: id, type: 'note', content: note }),
    })
    setNote('')
    mutate()
    toast('Nota registrada', 'success')
  }

  return (
    <>
      <Topbar
        title={contact.name}
        subtitle={contact.company || contact.phone || ''}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={deleteContact}
              className="flex items-center gap-1.5 font-mono text-[9px] tracking-[.14em] uppercase px-3.5 py-2 rounded-[3px] border border-stage-red/20 text-stage-red hover:bg-stage-red/10 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Excluir
            </button>
            <button
              onClick={() => router.back()}
              className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] border border-white/[.08] text-dim hover:text-fg transition-all"
            >
              Voltar
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 grid grid-cols-3 gap-6">
          {/* Left - Info */}
          <div className="col-span-2 space-y-6">
            {/* Details */}
            <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
              <h3 className="label-mono text-gold mb-4">Detalhes</h3>
              <div className="space-y-3">
                {[
                  ['Nome', contact.name],
                  ['WhatsApp', contact.phone],
                  ['Email', contact.email],
                  ['Empresa', contact.company],
                  ['Origem', contact.source],
                  ['Criado em', formatDateTime(contact.createdAt)],
                ].map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center py-1">
                    <span className="text-[11px] text-dim font-light">{key}</span>
                    <span className="text-xs font-medium text-fg">{val || '—'}</span>
                  </div>
                ))}
                {contact.tags?.length > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[11px] text-dim font-light">Tags</span>
                    <div className="flex gap-1">
                      {contact.tags.map((tag: string) => (
                        <span key={tag} className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-sm uppercase bg-white/[.05] border border-white/[.08] text-dim">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deals */}
            {deals?.length > 0 && (
              <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
                <h3 className="label-mono text-gold mb-4">Negociações</h3>
                <div className="space-y-2">
                  {deals.map((d: any) => (
                    <div key={d.deal.id} className="flex items-center justify-between py-2 border-b border-white/[.04] last:border-0">
                      <div>
                        <div className="text-sm text-fg">{d.deal.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-sm uppercase"
                            style={{
                              background: `${d.stage.color}22`,
                              color: d.stage.color,
                              border: `1px solid ${d.stage.color}44`,
                            }}
                          >
                            {d.stage.name}
                          </span>
                          <span className="text-[10px] text-dim">{d.deal.status}</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm text-gold">{formatCurrency(d.deal.value || '0')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
              <h3 className="label-mono text-gold mb-4">Atividade</h3>
              <div className="flex gap-2 mb-4">
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                  placeholder="Registrar atividade..."
                  className="flex-1 bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-xs text-fg placeholder:text-dim"
                />
                <button
                  onClick={addNote}
                  className="bg-gold-subtle border border-gold/25 text-gold rounded px-3 text-sm hover:bg-gold/20 transition-all"
                >
                  &rarr;
                </button>
              </div>
              <div className="space-y-0">
                {activities?.length === 0 && (
                  <div className="text-xs text-dim font-light py-2">Nenhuma atividade ainda.</div>
                )}
                {activities?.map((a: any) => (
                  <div key={a.id} className="group/activity py-2.5 border-b border-white/[.04] last:border-0">
                    {editingActivityId === a.id ? (
                      <div className="flex gap-2">
                        <input
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') updateActivity(a.id)
                            if (e.key === 'Escape') setEditingActivityId(null)
                          }}
                          className="flex-1 bg-surface-3 border border-gold/30 rounded px-2.5 py-1.5 text-xs text-fg"
                          autoFocus
                        />
                        <button onClick={() => updateActivity(a.id)} className="text-[10px] text-gold hover:text-gold-light transition-colors">Salvar</button>
                        <button onClick={() => setEditingActivityId(null)} className="text-[10px] text-dim hover:text-fg transition-colors">Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs text-fg font-light leading-relaxed flex-1">{a.content}</div>
                          <div className="flex items-center gap-1 opacity-30 group-hover/activity:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => { setEditingActivityId(a.id); setEditContent(a.content || '') }}
                              className="p-1 rounded hover:bg-white/[.05] text-dim hover:text-fg transition-all"
                              title="Editar"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteActivity(a.id)}
                              className="p-1 rounded hover:bg-stage-red/10 text-dim hover:text-stage-red transition-all"
                              title="Excluir"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="font-mono text-[9px] text-dim mt-1 flex items-center gap-1.5">
                          <span>{a.authorType === 'agent' ? 'Agente IA' : 'Equipe'}</span>
                          <span>&middot;</span>
                          <span>{timeAgo(a.createdAt)}</span>
                          <span>&middot;</span>
                          <span className="text-dim/60">{formatShortDateTime(a.createdAt)}</span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Agent Widget */}
          <div className="space-y-6">
            {agentData && (
              <div className="bg-surface-2 border border-gold/20 rounded-md p-5">
                <h3 className="label-mono text-gold mb-4">Agente IA</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-dim">Fase SPIN</span>
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded-sm bg-gold-subtle border border-gold/20 text-gold uppercase">
                      {agentData.crm ? `${agentData.crm} — ${SPIN_LABELS[agentData.crm]}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-dim">Última msg</span>
                    <span className="text-xs text-fg">{agentData.ultimamsgFrom || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-dim">Msg IA</span>
                    <span className="text-[10px] text-dim">{timeAgo(agentData.ultimamsgIa)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-dim">Msg Lead</span>
                    <span className="text-[10px] text-dim">{timeAgo(agentData.ultimamsgLead)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-dim">Msg Atendente</span>
                    <span className="text-[10px] text-dim">{timeAgo(agentData.ultimamsgAtendente)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-dim">Follow-ups</span>
                    <span className="text-xs font-mono text-fg">{agentData.followup ?? 0}</span>
                  </div>
                  {agentData.temporesposta && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-dim">Tempo resposta</span>
                      <span className="text-xs font-mono text-gold">{agentData.temporesposta}</span>
                    </div>
                  )}
                  {agentData.info && (
                    <div className="mt-3 p-2.5 bg-surface-3 rounded text-[11px] text-dim font-light leading-relaxed">
                      {agentData.info}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick info */}
            <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
              <h3 className="label-mono text-gold mb-4">Resumo</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-dim">Negociações</span>
                  <span className="text-xs text-fg font-mono">{deals?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-dim">Atividades</span>
                  <span className="text-xs text-fg font-mono">{activities?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-dim">Valor total</span>
                  <span className="text-xs text-gold font-mono">
                    {formatCurrency(deals?.reduce((s: number, d: any) => s + parseFloat(d.deal.value || '0'), 0) || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
