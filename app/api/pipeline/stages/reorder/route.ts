import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pipelineStages, pipelines } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'
import { reorderStagesSchema } from '@/lib/validations'

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const parsed = reorderStagesSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // Get default pipeline
    const [pipeline] = await db.select()
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, session.tenantId), eq(pipelines.isDefault, true)))
      .limit(1)

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline não encontrado' }, { status: 404 })
    }

    // Load all current stages for this pipeline
    const currentStages = await db.select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipeline.id))

    const stageMap = new Map(currentStages.map(s => [s.id, s]))

    // Validate: all IDs in request belong to this pipeline
    for (const item of parsed.data.stages) {
      const stage = stageMap.get(item.id)
      if (!stage) {
        return NextResponse.json({ error: `Stage ${item.id} não encontrada neste pipeline` }, { status: 400 })
      }
    }

    // Validate SPIN constraints: system stages must keep relative order
    const systemStages = parsed.data.stages
      .filter(item => stageMap.get(item.id)?.isSystem)
      .sort((a, b) => a.position - b.position)

    for (let i = 1; i < systemStages.length; i++) {
      const prevSpin = stageMap.get(systemStages[i - 1].id)?.spinValue ?? 0
      const currSpin = stageMap.get(systemStages[i].id)?.spinValue ?? 0
      if (currSpin <= prevSpin) {
        return NextResponse.json({
          error: 'Etapas SPIN devem manter a ordem: Situação → Problema → Implicação → Necessidade'
        }, { status: 400 })
      }
    }

    // Validate: system stages must be contiguous (no custom stages between them)
    const allByPosition = [...parsed.data.stages].sort((a, b) => a.position - b.position)
    let firstSystemIdx = -1
    let lastSystemIdx = -1
    for (let i = 0; i < allByPosition.length; i++) {
      if (stageMap.get(allByPosition[i].id)?.isSystem) {
        if (firstSystemIdx === -1) firstSystemIdx = i
        lastSystemIdx = i
      }
    }
    if (firstSystemIdx !== -1) {
      for (let i = firstSystemIdx; i <= lastSystemIdx; i++) {
        if (!stageMap.get(allByPosition[i].id)?.isSystem) {
          return NextResponse.json({
            error: 'Não é possível inserir etapas entre as etapas SPIN do agente'
          }, { status: 400 })
        }
      }
    }

    // Apply position updates
    const updates = parsed.data.stages.map(item =>
      db.update(pipelineStages)
        .set({ position: item.position })
        .where(and(
          eq(pipelineStages.id, item.id),
          eq(pipelineStages.tenantId, session.tenantId)
        ))
    )

    await Promise.all(updates)

    // Return updated stages
    const updatedStages = await db.select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipeline.id))
      .orderBy(pipelineStages.position)

    return NextResponse.json(updatedStages)
  } catch (error) {
    console.error('PATCH reorder stages error:', error)
    return NextResponse.json({ error: 'Erro ao reordenar etapas' }, { status: 500 })
  }
}
