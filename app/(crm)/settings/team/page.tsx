'use client'

import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'

export default function TeamSettingsPage() {
  const router = useRouter()

  return (
    <>
      <Topbar
        title="Equipe"
        subtitle="Gerenciar membros"
        actions={
          <button
            onClick={() => router.back()}
            className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] border border-white/[.08] text-dim hover:text-fg transition-all"
          >
            Voltar
          </button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface-2 border border-white/[.04] rounded-md p-8 text-center">
            <div className="text-2xl mb-3 opacity-30">◎</div>
            <div className="text-sm text-fg mb-1">Gestão de equipe</div>
            <div className="text-xs text-dim font-light">
              Em breve: convidar membros por email, gerenciar permissões (owner, admin, membro).
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
