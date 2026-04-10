'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Topbar } from '@/components/layout/topbar'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Stage {
  id: string
  name: string
  color: string | null
  position: number
  isSystem: boolean | null
  spinValue: number | null
  stageType: string | null
}

function SortableStageItem({
  stage,
  onDelete,
}: {
  stage: Stage
  onDelete: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id, disabled: !!stage.isSystem })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-surface-2 border border-white/[.04] rounded-md p-4 flex items-center gap-4"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={`flex flex-col gap-[3px] cursor-grab active:cursor-grabbing px-1 ${
          stage.isSystem ? 'opacity-20 cursor-not-allowed' : 'opacity-50 hover:opacity-100'
        }`}
        title={stage.isSystem ? 'Etapas SPIN não podem ser movidas' : 'Arrastar para reordenar'}
      >
        <div className="w-3 h-[2px] bg-dim rounded-full" />
        <div className="w-3 h-[2px] bg-dim rounded-full" />
        <div className="w-3 h-[2px] bg-dim rounded-full" />
      </div>

      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ background: stage.color || '#C9A84C' }}
      />
      <div className="flex-1">
        <div className="text-sm text-fg font-medium">{stage.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {stage.isSystem && (
            <span className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-sm uppercase bg-gold-subtle border border-gold/20 text-gold">
              SPIN {stage.spinValue}
            </span>
          )}
          <span className="font-mono text-[10px] tracking-wider text-dim uppercase">
            {stage.stageType === 'won' ? 'Ganho' : stage.stageType === 'lost' ? 'Perdido' : 'Aberto'}
          </span>
          <span className="font-mono text-[10px] tracking-wider text-dim">
            Posição {stage.position}
          </span>
        </div>
      </div>

      {stage.isSystem ? (
        <span className="text-[10px] text-dim font-mono">Fixo (agente)</span>
      ) : (
        <button
          onClick={() => onDelete(stage.id)}
          className="text-[10px] text-stage-red hover:text-stage-red/80 font-mono transition-colors"
        >
          Remover
        </button>
      )}
    </div>
  )
}

export default function PipelineSettingsPage() {
  const router = useRouter()
  const { data: stages = [], mutate } = useSWR<Stage[]>('/api/pipeline/stages', fetcher)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#C9A84C')
  const [newType, setNewType] = useState<'open' | 'won' | 'lost'>('open')
  const [newPosition, setNewPosition] = useState<number>(-1)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  // Build position options for new stage (only non-SPIN insertion points)
  const positionOptions = (() => {
    const options: { label: string; value: number }[] = []
    const systemStages = sortedStages.filter(s => s.isSystem)
    const lastSystemPos = systemStages.length > 0
      ? Math.max(...systemStages.map(s => s.position))
      : -1

    // Before SPIN block (position 0)
    if (systemStages.length > 0) {
      options.push({ label: `Antes de "${systemStages[0].name}" (SPIN)`, value: 0 })
    }

    // After SPIN block
    options.push({
      label: lastSystemPos >= 0
        ? `Depois do bloco SPIN (posição ${lastSystemPos + 1})`
        : 'Início do pipeline',
      value: lastSystemPos + 1,
    })

    // Between each custom stage
    const customStages = sortedStages.filter(s => !s.isSystem && s.position > lastSystemPos)
    for (const cs of customStages) {
      options.push({
        label: `Depois de "${cs.name}"`,
        value: cs.position + 1,
      })
    }

    // Deduplicate by value
    const seen = new Set<number>()
    return options.filter(o => {
      if (seen.has(o.value)) return false
      seen.add(o.value)
      return true
    })
  })()

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedStages.findIndex(s => s.id === active.id)
    const newIndex = sortedStages.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Don't allow dragging system stages
    if (sortedStages[oldIndex].isSystem) return

    const reordered = arrayMove(sortedStages, oldIndex, newIndex)

    // Validate: system stages must stay contiguous and in order
    const systemPositions: number[] = []
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].isSystem) systemPositions.push(i)
    }
    if (systemPositions.length > 1) {
      for (let i = 1; i < systemPositions.length; i++) {
        if (systemPositions[i] !== systemPositions[i - 1] + 1) return // would break contiguity
      }
    }

    // Build reorder payload
    const payload = reordered.map((s, i) => ({ id: s.id, position: i }))

    // Optimistic update
    mutate(reordered.map((s, i) => ({ ...s, position: i })), false)

    try {
      const res = await fetch('/api/pipeline/stages/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: payload }),
      })

      if (!res.ok) {
        mutate() // revert
      }
    } catch {
      mutate() // revert
    }
  }

  async function addStage() {
    if (!newName.trim()) return

    const position = newPosition >= 0 ? newPosition : (
      stages.length > 0
        ? Math.max(...stages.map(s => s.position)) + 1
        : 0
    )

    await fetch('/api/pipeline/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        color: newColor,
        position,
        stageType: newType,
      }),
    })

    setNewName('')
    setNewPosition(-1)
    setAdding(false)
    mutate()
    toast('Etapa adicionada', 'success')
  }

  async function deleteStage(id: string) {
    if (!confirm('Remover esta etapa? Deals nela precisarão ser movidos.')) return
    await fetch(`/api/pipeline/stages/${id}`, { method: 'DELETE' })
    mutate()
    toast('Etapa removida', 'info')
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
          {/* Info */}
          <div className="text-[11px] text-dim font-light mb-2 px-1">
            Arraste as etapas para reordenar. Etapas SPIN (agente IA) são um bloco fixo.
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sortedStages.map((stage) => (
                <SortableStageItem
                  key={stage.id}
                  stage={stage}
                  onDelete={deleteStage}
                />
              ))}
            </SortableContext>
          </DndContext>

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
                <div>
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
                <div>
                  <label className="label-mono block mb-1">Posição</label>
                  <select
                    value={newPosition}
                    onChange={e => setNewPosition(parseInt(e.target.value))}
                    className="w-full bg-surface-3 border border-white/[.07] rounded px-3 py-2 text-sm text-fg"
                  >
                    <option value={-1}>Final do pipeline</option>
                    {positionOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
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
