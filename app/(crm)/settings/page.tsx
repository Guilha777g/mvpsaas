'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Topbar } from '@/components/layout/topbar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSWR('/api/auth/me', fetcher)

  const allSections = [
    { href: '/settings/pipeline', icon: '⬡', title: 'Pipeline', desc: 'Gerenciar etapas do Kanban', adminOnly: false },
    { href: '/settings/team', icon: '◎', title: 'Equipe', desc: 'Convidar e gerenciar membros', adminOnly: false },
    { href: '/settings/agent', icon: '◈', title: 'Agente IA', desc: 'Configurar integração n8n', adminOnly: true },
  ]

  const sections = allSections.filter(s => !s.adminOnly || session?.role === 'owner')

  return (
    <>
      <Topbar title="Configurações" subtitle="Gerenciar CRM" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {sections.map(s => (
            <button
              key={s.href}
              onClick={() => router.push(s.href)}
              className="w-full bg-surface-2 border border-white/[.04] rounded-md p-5 flex items-center gap-4 hover:border-gold/20 transition-all text-left"
            >
              <span className="text-xl text-gold">{s.icon}</span>
              <div>
                <div className="text-sm font-medium text-fg">{s.title}</div>
                <div className="text-xs text-dim font-light">{s.desc}</div>
              </div>
              <span className="ml-auto text-dim">&rsaquo;</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
