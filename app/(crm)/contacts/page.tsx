'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'
import { cn, getInitials, getAvatarColor, timeAgo, SPIN_LABELS } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function ContactsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { data: contacts = [], isLoading } = useSWR(
    `/api/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  return (
    <>
      <Topbar
        title="Contatos"
        subtitle={`${contacts.length} contatos`}
        onSearch={setSearch}
      />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-dim text-sm">Carregando...</div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="text-2xl opacity-30">&#9676;</div>
            <div className="text-dim text-sm font-light">Nenhum contato encontrado</div>
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
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact: any, i: number) => (
                <tr
                  key={contact.id}
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                  className="border-b border-white/[.04] hover:bg-surface-3 cursor-pointer transition-colors"
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
                    <span className="font-mono text-[8px] tracking-wider px-2 py-0.5 rounded-sm uppercase bg-white/[.05] border border-white/[.08] text-dim">
                      {contact.source || 'manual'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {contact.agentData ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[8px] tracking-wider px-2 py-0.5 rounded-sm uppercase bg-gold-subtle border border-gold/20 text-gold">
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
