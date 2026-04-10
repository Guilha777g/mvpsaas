'use client'

import { Topbar } from '@/components/layout/topbar'
import { CheckSquare } from 'lucide-react'

export default function TasksPage() {
  return (
    <>
      <Topbar title="Tarefas" subtitle="Follow-ups e lembretes" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface-2 border border-white/[.04] rounded-md p-10 flex flex-col items-center text-center">
            <CheckSquare className="w-12 h-12 text-dim opacity-20 mb-4" />
            <div className="text-sm text-fg font-medium mb-1">Gestão de tarefas</div>
            <div className="text-xs text-dim font-light max-w-[300px]">
              Em breve: criar follow-ups, lembretes com data de vencimento, atribuir a membros da equipe.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
