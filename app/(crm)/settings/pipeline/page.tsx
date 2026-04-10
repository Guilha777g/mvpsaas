'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/topbar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PipelineSettingsPage() {
  const router = useRouter()
  const { data: stages = [], mutate } = useSWR('/api/pipeline/stages', fetcher)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#C9A84C')
  const [newType, setNewType] = useState<'open' | 'won' | 'lost'>('open')

  async function addStage() {
    if (!newName.trim()) return

    const maxPos = stages.reduce((m: number, s: any) => Math.max(m, s.position), 0)

    await fetch('/api/pipeline/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        color: newColor,
        position: maxPos + 1,
        stageType: newType,
      }),
    })

    setNewName('')
    setAdding(false)
    mutate()
  }

  async function deleteStage(id: string) {
    if (!confirm('Remover esta etapa? Deals nela precisarão ser movidos.')) return

    await fetch(`/api/pipeline/stages/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <>
      <Topbar
        title="Pipeline"
        subtitle="Gerenciar etapas do Kanban"
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
        <div className="max-w-2xl mx-auto space-y-3">
          {stages.map((stage: any) => (
            <div
              key={stage.id}
              className="bg-surface-2 border border-white/[.04] rounded-md p-4 flex items-center gap-4"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: stage.color }}
              />
              <div className="flex-1">
                <div className="text-sm text-fg font-medium">{stage.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {stage.isSystem && (
                    <span className="font-mono text-[8px] tracking-wider px-2 py-0.5 rounded-sm uppercase bg-gold-subtle border border-gold/20 text-gold">
                      SPIN {stage.spinValue}
                    </span>
                  )}
                  <span className="font-mono text-[8px] tracking-wider text-dim uppercase">
                    {stage.stageType === 'won' ? 'Ganho' : stage.stageType === 'lost' ? 'Perdido' : 'Aberto'}
                  </span>
                  <span className="font-mono text-[8px] tracking-wider text-dim">
                    Posição {stage.position}
                  </span>
                </div>
              </div>

              {stage.isSystem ? (
                <span className="text-[10px] text-dim font-mono">Fixo (agente)</span>
              ) : (
                <button
                  onClick={() => deleteStage(stage.id)}
                  className="text-[10px] text-stage-red hover:text-stage-red/80 font-mono transition-colors"
                >
                  Remover
                </button>
              )}
            </div>
          ))}

          {/* Add new stage */}
          {adding ? (
            <div className="bg-surface-2 border border-gold/20 rounded-md p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-mono block mb-1">Nome</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Nome da etapa"
                    className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-sm text-fg placeholder:text-dim"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label-mono block mb-1">Cor</label>
                  <input
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    className="w-full h-[38px] bg-surface-3 border border-white/[.07] rounded cursor-pointer"
                  />
                </div>
                <div className="col-span-2">
                  <label className="label-mono block mb-1">Tipo</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as 'open' | 'won' | 'lost')}
                    className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-sm text-fg"
                  >
                    <option value="open">Aberto (em andamento)</option>
                    <option value="won">Ganho (fechamento positivo)</option>
                    <option value="lost">Perdido (fechamento negativo)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setAdding(false)}
                  className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] border border-white/[.08] text-dim"
                >
                  Cancelar
                </button>
                <button
                  onClick={addStage}
                  className="font-mono text-[9px] tracking-[.14em] uppercase px-4 py-2 rounded-[3px] bg-gold border border-gold text-bg font-semibold hover:bg-gold-light transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full bg-surface-2 border border-dashed border-white/[.08] rounded-md p-4 flex items-center justify-center gap-2 text-dim text-sm hover:border-gold/30 hover:text-fg transition-all"
            >
              + Adicionar etapa personalizada
            </button>
          )}
        </div>
      </div>
    </>
  )
}
