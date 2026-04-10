'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code') || ''

  const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: codeFromUrl })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao registrar')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label-mono block mb-1.5">Código de convite</label>
        <input
          type="text"
          value={form.inviteCode}
          onChange={e => update('inviteCode', e.target.value.toUpperCase())}
          placeholder="Ex: A1B2C3D4"
          className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2.5 text-sm text-fg placeholder:text-dim font-mono tracking-wider uppercase"
          required
        />
      </div>
      <div>
        <label className="label-mono block mb-1.5">Seu nome</label>
        <input
          type="text"
          value={form.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Nome completo"
          className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2.5 text-sm text-fg placeholder:text-dim"
          required
        />
      </div>
      <div>
        <label className="label-mono block mb-1.5">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={e => update('email', e.target.value)}
          placeholder="seu@email.com"
          className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2.5 text-sm text-fg placeholder:text-dim"
          required
        />
      </div>
      <div>
        <label className="label-mono block mb-1.5">Senha</label>
        <input
          type="password"
          value={form.password}
          onChange={e => update('password', e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2.5 text-sm text-fg placeholder:text-dim"
          required
          minLength={6}
        />
      </div>

      {error && (
        <div className="text-stage-red text-xs font-mono">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full font-mono text-[9px] tracking-[.14em] uppercase bg-gold border border-gold text-bg font-semibold py-2.5 rounded-[3px] hover:bg-gold-light transition-colors disabled:opacity-50"
      >
        {loading ? 'Criando...' : 'Criar conta'}
      </button>

      <p className="text-center text-xs text-dim">
        Já tem conta?{' '}
        <a href="/login" className="text-gold hover:text-gold-light transition-colors">
          Entrar
        </a>
      </p>
    </form>
  )
}
