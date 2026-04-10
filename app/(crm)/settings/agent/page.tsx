'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Topbar } from '@/components/layout/topbar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AgentSettingsPage() {
  const router = useRouter()
  const { data: session, isLoading: sessionLoading } = useSWR('/api/auth/me', fetcher)
  const { data: tenantsList } = useSWR(
    session?.role === 'admin' ? '/api/admin/tenants' : null,
    fetcher
  )
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)

  if (!sessionLoading && session && session.role !== 'admin') {
    router.replace('/settings')
    return null
  }

  const selectedTenant = tenantsList?.find((t: { id: string }) => t.id === selectedTenantId)
  const displayTenantId = selectedTenant?.id || 'Selecione um cliente'

  return (
    <>
      <Topbar
        title="Agente IA"
        subtitle="Configurar integração n8n por cliente"
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
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Tenant Selector */}
          <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
            <h3 className="label-mono text-gold mb-3">Selecionar Cliente</h3>
            <select
              value={selectedTenantId || ''}
              onChange={(e) => setSelectedTenantId(e.target.value || null)}
              className="w-full bg-surface-3 border border-white/[.07] rounded px-4 py-2.5 text-sm text-fg font-mono appearance-none cursor-pointer focus:border-gold/30 focus:outline-none transition-all"
            >
              <option value="">— Selecione um cliente —</option>
              {tenantsList?.map((t: { id: string; name: string; slug: string }) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>

          {selectedTenant && (
            <>
              {/* Tenant ID */}
              <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
                <h3 className="label-mono text-gold mb-3">Tenant ID — {selectedTenant.name}</h3>
                <p className="text-xs text-dim font-light mb-3">
                  Use este ID no agente n8n ao inserir na tabela <code className="font-mono text-gold/80">agent_leads</code>.
                </p>
                <div className="bg-surface-3 border border-white/[.07] rounded px-4 py-3 font-mono text-sm text-gold break-all select-all">
                  {displayTenantId}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
                <h3 className="label-mono text-gold mb-3">Como conectar o agente n8n</h3>
                <div className="space-y-3 text-xs text-dim font-light leading-relaxed">
                  <div className="flex gap-3">
                    <span className="text-gold font-mono flex-shrink-0">1.</span>
                    <span>
                      No workflow n8n, ao fazer INSERT/UPDATE na tabela <code className="font-mono text-fg">agent_leads</code>,
                      adicione o campo <code className="font-mono text-gold">tenant_id</code> com o valor acima.
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gold font-mono flex-shrink-0">2.</span>
                    <span>
                      O CRM detecta automaticamente novos leads via trigger no PostgreSQL.
                      Nenhuma configuração adicional necessária.
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gold font-mono flex-shrink-0">3.</span>
                    <span>
                      O campo <code className="font-mono text-fg">crm</code> (1-4) mapeia para as etapas SPIN no Kanban:
                      1=Situação, 2=Problema, 3=Implicação, 4=Necessidade.
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gold font-mono flex-shrink-0">4.</span>
                    <span>
                      Campos de follow-up (<code className="font-mono text-fg">ultimamsg_*</code>,{' '}
                      <code className="font-mono text-fg">followup</code>) são exibidos no widget do agente na página do contato.
                    </span>
                  </div>
                </div>
              </div>

              {/* SQL Example */}
              <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
                <h3 className="label-mono text-gold mb-3">Exemplo SQL para o n8n</h3>
                <pre className="bg-surface-3 border border-white/[.07] rounded p-4 text-xs text-fg font-mono overflow-x-auto leading-relaxed">
{`INSERT INTO agent_leads (
  tenant_id, id_wp, number, info, crm,
  ultimamsg_ia, ultimamsg_from, followup
) VALUES (
  '${displayTenantId}',
  '{{ $json.id_wp }}',
  '{{ $json.number }}',
  '{{ $json.info }}',
  {{ $json.crm }},
  NOW(),
  'ia',
  {{ $json.followup }}
);`}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
