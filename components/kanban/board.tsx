'use client'

import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { KanbanColumn } from './column'
import { AddDealModal } from './add-deal-modal'
import { DealDetailPanel } from './deal-detail-panel'
import { useToast } from '@/components/ui/toast'

interface KanbanBoardProps {
  initialDeals: any[]
  stages: any[]
  hideAiStages?: boolean
  onRefresh: () => void
}

export function KanbanBoard({ initialDeals, stages, hideAiStages = false, onRefresh }: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals)
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalStageId, setModalStageId] = useState<string | null>(null)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY
      e.preventDefault()
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Filter stages
  const visibleStages = hideAiStages ? stages.filter((s: any) => !s.isSystem) : stages

  // Group deals by stage
  const dealsByStage: Record<string, any[]> = {}
  for (const stage of stages) {
    dealsByStage[stage.id] = deals.filter(d => d.stageId === stage.id)
  }

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const dealId = active.id as string
    const targetStageId = over.id as string

    // Check if dropped on a stage (column)
    const isStage = stages.some((s: any) => s.id === targetStageId)
    if (!isStage) return

    const deal = deals.find(d => d.id === dealId)
    if (!deal || deal.stageId === targetStageId) return

    // Optimistic update
    setDeals(prev => prev.map(d =>
      d.id === dealId ? { ...d, stageId: targetStageId } : d
    ))

    // API call
    try {
      const res = await fetch(`/api/deals/${dealId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: targetStageId }),
      })

      if (!res.ok) {
        // Revert on error
        setDeals(prev => prev.map(d =>
          d.id === dealId ? { ...d, stageId: deal.stageId } : d
        ))
      }
    } catch {
      setDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, stageId: deal.stageId } : d
      ))
    }
  }, [deals, stages])

  const handleDealClick = (dealId: string) => {
    setSelectedDealId(dealId)
  }

  const handleDealDelete = async (dealId: string) => {
    if (!confirm('Remover este lead do pipeline?')) return

    setDeals(prev => prev.filter(d => d.id !== dealId))

    try {
      await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
      toast('Lead removido', 'info')
    } catch {
      toast('Erro ao remover lead', 'error')
      onRefresh()
    }
  }

  const handleAddDeal = (stageId: string) => {
    setModalStageId(stageId)
    setModalOpen(true)
  }

  const handleDealCreated = () => {
    setModalOpen(false)
    onRefresh()
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-5 flex gap-3.5 items-start"
        >
          {visibleStages.map((stage: any, i: number) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage[stage.id] || []}
              index={i}
              onDealClick={handleDealClick}
              onDealDelete={handleDealDelete}
              onAddDeal={handleAddDeal}
            />
          ))}
        </div>
      </DndContext>

      {modalOpen && modalStageId && (
        <AddDealModal
          stageId={modalStageId}
          stages={stages}
          onClose={() => setModalOpen(false)}
          onCreated={handleDealCreated}
        />
      )}

      {selectedDealId && (
        <DealDetailPanel
          dealId={selectedDealId}
          deals={deals}
          stages={stages}
          onClose={() => setSelectedDealId(null)}
          onUpdated={() => { setSelectedDealId(null); onRefresh() }}
        />
      )}
    </>
  )
}
