'use client'

import { useRouter } from 'next/navigation'

interface TopbarProps {
  title: string
  subtitle: string
  onSearch?: (value: string) => void
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, onSearch, actions }: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="h-[60px] border-b border-white/[.04] flex items-center justify-between px-7 flex-shrink-0 bg-surface-1">
      <div className="flex flex-col gap-px">
        <h1 className="title-serif text-lg">{title}</h1>
        <div className="font-mono text-[9px] tracking-[.16em] text-dim uppercase">{subtitle}</div>
      </div>

      <div className="flex items-center gap-2.5">
        {onSearch && (
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-dim pointer-events-none">
              ⌕
            </span>
            <input
              type="text"
              placeholder="Buscar..."
              onChange={e => onSearch(e.target.value)}
              className="bg-surface-3 border border-white/[.06] rounded px-3 py-[7px] pl-8 text-xs text-fg w-[200px] font-sans placeholder:text-dim"
            />
          </div>
        )}
        {actions}
        <button
          onClick={handleLogout}
          className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] bg-transparent border border-white/[.08] text-dim hover:border-white/[.18] hover:text-fg transition-all"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
