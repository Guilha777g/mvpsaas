'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Topbar } from '@/components/layout/topbar'
import { StatsBar } from '@/components/kanban/stats-bar'
import { KanbanBoard } from '@/components/kanban/board'
import { AddDealModal } from '@/components/kanban/add-deal-modal'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PipelinePage() {
  const { data, mutate, isLoading } = useSWR('/api/deals', fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const deals = data?.deals || []
  const stages = data?.stages || []

  const filteredDeals = search
    ? deals.filter((d: any) =>
        `${d.contact?.name} ${d.contact?.company}`.toLowerCase().includes(search.toLowerCase())
      )
    : deals

  const today = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  return (
    <>
      <Topbar
        title="Pipeline de Leads"
        subtitle={`${deals.length} leads · atualizado hoje, ${today}`}
        onSearch={setSearch}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] border border-white/[.08] text-dim hover:border-white/[.18] hover:text-fg transition-all"
            >
              + Lead
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] bg-gold border border-gold text-bg font-semibold hover:bg-gold-light transition-colors"
            >
              Novo lead
            </button>
          </div>
        }
      />

      <StatsBar deals={deals} />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-dim text-sm font-light">Carregando pipeline...</div>
        </div>
      ) : (
        <KanbanBoard
          initialDeals={filteredDeals}
          stages={stages}
          onRefresh={() => mutate()}
        />
      )}

      {modalOpen && stages.length > 0 && (
        <AddDealModal
          stageId={stages[0].id}
          stages={stages}
          onClose={() => setModalOpen(false)}
          onCreated={() => { setModalOpen(false); mutate() }}
        />
      )}
    </>
  )
}
