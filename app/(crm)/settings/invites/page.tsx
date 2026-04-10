'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { Topbar } from '@/components/layout/topbar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function InvitesPage() {
  const router = useRouter()
  const { data: session, isLoading: sessionLoading } = useSWR('/api/auth/me', fetcher)
  const { data: invites, isLoading: invitesLoading } = useSWR(
    session?.role === 'admin' ? '/api/admin/invite-codes' : null,
    fetcher
  )

  const [tenantName, setTenantName] = useState('')
  const [email, setEmail] = useState('')
  const [maxUses, setMaxUses] = useState(1)
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  if (!sessionLoading && session?.role !== 'admin') {
    router.replace('/settings')
    return null
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantName, email: email.trim() || undefined, maxUses, expiresInDays }),
      })
      if (res.ok) {
        setTenantName('')
        setEmail('')
        setMaxUses(1)
        setExpiresInDays(30)
        mutate('/api/admin/invite-codes')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `Erro ${res.status}`)
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function getStatus(invite: { expiresAt: string; usedCount: number; maxUses: number }) {
    if (new Date(invite.expiresAt) < new Date()) return { label: 'Expirado', color: 'text-red-400' }
    if (invite.usedCount >= invite.maxUses) return { label: 'Esgotado', color: 'text-dim' }
    return { label: 'Ativo', color: 'text-emerald-400' }
  }

  return (
    <>
      <Topbar
        title="Convites"
        subtitle="Gerenciar códigos de convite"
        actions={
          <button
            onClick={() => router.back()}
            className="text-xs text-dim hover:text-fg transition-colors font-mono"
          >
            ← Voltar
          </button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Create Form */}
          <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
            <h3 className="label-mono text-gold mb-4">Criar Convite</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-dim uppercase tracking-wider mb-1">Nome do Tenant *</label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                  placeholder="Ex: Empresa ABC"
                  className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-sm text-fg placeholder:text-dim/50 focus:border-gold/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-dim uppercase tracking-wider mb-1">Email (opcional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-sm text-fg placeholder:text-dim/50 focus:border-gold/30 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-mono text-dim uppercase tracking-wider mb-1">Usos máximos</label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    min={1}
                    className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-sm text-fg focus:border-gold/30 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-mono text-dim uppercase tracking-wider mb-1">Validade (dias)</label>
                  <input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-sm text-fg focus:border-gold/30 focus:outline-none"
                  />
                </div>
              </div>
              {error && (
                <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || !tenantName}
                className="w-full bg-gold/10 border border-gold/20 text-gold text-xs font-mono uppercase tracking-wider py-2.5 rounded hover:bg-gold/15 transition-all disabled:opacity-40"
              >
                {submitting ? 'Criando...' : 'Criar Convite'}
              </button>
            </form>
          </div>

          {/* Invites List */}
          <div className="bg-surface-2 border border-white/[.04] rounded-md p-5">
            <h3 className="label-mono text-gold mb-4">Convites Existentes</h3>
            {invitesLoading ? (
              <p className="text-xs text-dim">Carregando...</p>
            ) : !invites?.length ? (
              <p className="text-xs text-dim">Nenhum convite criado ainda.</p>
            ) : (
              <div className="space-y-2">
                {invites.map((inv: { id: string; code: string; tenantName: string; email: string | null; maxUses: number; usedCount: number; expiresAt: string }) => {
                  const status = getStatus(inv)
                  return (
                    <div key={inv.id} className="bg-surface-3 border border-white/[.07] rounded p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gold">{inv.code}</span>
                          <span className={`text-[10px] font-mono ${status.color}`}>{status.label}</span>
                        </div>
                        <div className="text-[11px] text-dim mt-0.5">
                          {inv.tenantName} {inv.email && `· ${inv.email}`} · {inv.usedCount}/{inv.maxUses} usos
                        </div>
                      </div>
                      <button
                        onClick={() => copyCode(inv.code)}
                        className="text-[10px] font-mono text-dim hover:text-gold transition-colors px-2 py-1 border border-white/[.07] rounded"
                      >
                        {copied === inv.code ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
