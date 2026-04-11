'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { cn, getInitials, getAvatarColor, timeAgo, SPIN_LABELS } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { useAdmin } from '@/lib/admin-context'
import { Users, Trash2 } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ContactsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { selectedTenantId, role } = useAdmin()
  const [search, setSearch] = useState('')
  const tenantParam = role === 'admin' && selectedTenantId ? `&tenantId=${selectedTenantId}` : ''
  const { data: contacts = [], isLoading, mutate } = useSWR(
    `/api/contacts${search ? `?search=${encodeURIComponent(search)}${tenantParam}` : (tenantParam ? `?${tenantParam.slice(1)}` : '')}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  async function deleteContact(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Excluir este contato? Todos os deals e atividades relacionados serão removidos.')) return
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast('Contato excluído', 'info')
      mutate()
    } else {
      toast('Erro ao excluir contato', 'error')
    }
  }

  return (
    <>
      <Topbar
        title="Contatos"
        subtitle={`${contacts.length} contatos`}
        onSearch={setSearch}
      />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-14 w-full max-w-4xl mx-6 rounded-md" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Users className="w-12 h-12 text-dim opacity-20" />
            <div className="text-sm text-fg font-medium">Nenhum contato ainda</div>
            <div className="text-xs text-dim font-light text-center max-w-[260px]">
              {search ? 'Nenhum resultado para essa busca.' : 'Seus contatos aparecerão aqui quando leads entrarem pelo pipeline ou forem adicionados manualmente.'}
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[.04]">
                <th className="label-mono text-left px-6 py-3">Nome</th>
                <th className="label-mono text-left px-6 py-3">Telefone</th>
                <th className="label-mono text-left px-6 py-3">Empresa</th>
                <th className="label-mono text-left px-6 py-3">Origem</th>
                <th className="label-mono text-left px-6 py-3">Agente</th>
                <th className="label-mono text-left px-6 py-3">Atualizado</th>
                <th className="label-mono px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact: any, i: number) => (
                <tr
                  key={contact.id}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  className="group border-b border-white/[.04] hover:bg-surface-3 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0', getAvatarColor(i))}>
                        {getInitials(contact.name)}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-fg">{contact.name}</div>
                        {contact.email && <div className="text-[11px] text-dim">{contact.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[13px] text-fg font-mono">{contact.phone || '—'}</td>
                  <td className="px-6 py-3 text-[13px] text-dim">{contact.company || '—'}</td>
                  <td className="px-6 py-3">
                    <span className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-sm uppercase bg-white/[.05] border border-white/[.08] text-dim">
                      {contact.source || 'manual'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {contact.agentData ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-sm uppercase bg-gold-subtle border border-gold/20 text-gold">
                          SPIN {contact.agentData.crm || '?'}
                        </span>
                        {contact.agentData.ultimamsgFrom && (
                          <span className="text-[10px] text-dim">
                            via {contact.agentData.ultimamsgFrom}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-dim text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-[11px] text-dim">{timeAgo(contact.updatedAt)}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={(e) => deleteContact(e, contact.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-stage-red/10 text-dim hover:text-stage-red transition-all"
                      title="Excluir contato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
