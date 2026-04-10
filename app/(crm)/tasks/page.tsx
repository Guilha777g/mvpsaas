'use client'

import { Topbar } from '@/components/layout/topbar'

export default function TasksPage() {
  return (
    <>
      <Topbar title="Tarefas" subtitle="Follow-ups e lembretes" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface-2 border border-white/[.04] rounded-md p-8 text-center">
            <div className="text-2xl mb-3 opacity-30">&#9744;</div>
            <div className="text-sm text-fg mb-1">Gestão de tarefas</div>
            <div className="text-xs text-dim font-light">
              Em breve: criar follow-ups, lembretes com data de vencimento, atribuir a membros da equipe.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
