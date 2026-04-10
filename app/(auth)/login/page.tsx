'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao fazer login')
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
        <label className="label-mono block mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2.5 text-sm text-fg placeholder:text-dim"
          required
        />
      </div>
      <div>
        <label className="label-mono block mb-1.5">Senha</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2.5 text-sm text-fg placeholder:text-dim"
          required
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
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-xs text-dim">
        Primeiro acesso?{' '}
        <a href="/register" className="text-gold hover:text-gold-light transition-colors">
          Criar conta
        </a>
      </p>
    </form>
  )
}
