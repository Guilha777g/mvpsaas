'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Kanban, Users, CheckSquare, TrendingUp, Settings, type LucideIcon } from 'lucide-react'

type NavItem = { href: string; icon: LucideIcon; label: string } | { separator: true }

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { href: '/contacts', icon: Users, label: 'Contatos' },
  { href: '/tasks', icon: CheckSquare, label: 'Tarefas' },
  { separator: true },
  { href: '/reports', icon: TrendingUp, label: 'Relatórios' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
]

interface SidebarProps {
  tenantName: string
  dealCount: number
}

export function Sidebar({ tenantName, dealCount }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <aside className="w-[220px] flex-shrink-0 bg-surface-1 border-r border-white/[.04] flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5 border-b border-white/[.04]">
        <div className="font-mono text-[10px] tracking-[.22em] text-gold uppercase mb-1">CRM</div>
        <div className="font-serif text-xl font-light tracking-wide text-fg">
          Elyon <em className="italic text-gold-light">Nexus</em>
        </div>
      </div>

      {/* Client */}
      <div className="px-6 py-4 border-b border-white/[.04]">
        <div className="font-mono text-[10px] tracking-[.18em] text-dim uppercase mb-1.5">Cliente</div>
        <div className="text-[13px] font-medium text-fg flex items-center gap-1.5">
          <span className="truncate">{tenantName}</span>
          <span className="font-mono text-[10px] bg-gold-subtle border border-gold/20 text-gold px-1.5 py-0.5 rounded-sm tracking-widest flex-shrink-0">
            ATIVO
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {navItems.map((item, i) => {
          if ('separator' in item) {
            return <div key={i} className="h-px bg-white/[.04] my-1.5" />
          }

          const active = pathname === item.href || pathname.startsWith(item.href + '/')

          const Icon = item.icon
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded text-[12.5px] font-normal transition-all border border-transparent text-left w-full',
                active
                  ? 'bg-surface-3 text-fg border-white/[.05]'
                  : 'text-dim hover:bg-surface-3 hover:text-fg'
              )}
            >
              <Icon className={cn('w-[16px] h-[16px] flex-shrink-0', active ? 'text-gold' : 'text-dim')} />
              {item.label}
              {item.href === '/pipeline' && dealCount > 0 && (
                <span className="ml-auto badge-gold">{dealCount}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/[.04]">
        <div className="font-mono text-[10px] tracking-[.16em] text-gold/30 uppercase">
          Powered by Elyon Nexus
        </div>
      </div>
    </aside>
  )
}
