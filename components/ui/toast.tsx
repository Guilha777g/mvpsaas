'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: number
  message: string
  variant: ToastVariant
  action?: ToastAction
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'info', action?: ToastAction) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, variant, action }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, action ? 8000 : 3000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: typeof CheckCircle; color: string }> = {
    success: { bg: 'bg-stage-green/10', border: 'border-stage-green/25', icon: CheckCircle, color: 'text-stage-green' },
    error: { bg: 'bg-stage-red/10', border: 'border-stage-red/25', icon: XCircle, color: 'text-stage-red' },
    info: { bg: 'bg-gold-subtle', border: 'border-gold/25', icon: Info, color: 'text-gold' },
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const v = variantStyles[t.variant]
          const Icon = v.icon
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-md border shadow-lg animate-slideInRight min-w-[280px]',
                v.bg, v.border
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', v.color)} />
              <span className="text-xs text-fg font-light flex-1">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => { t.action!.onClick(); removeToast(t.id) }}
                  className={cn('font-mono text-[9px] tracking-[.12em] uppercase px-2.5 py-1 rounded border flex-shrink-0 transition-all', v.color, 'border-current opacity-70 hover:opacity-100')}
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                className="text-dim hover:text-fg transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
