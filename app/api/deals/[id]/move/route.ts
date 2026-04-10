import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals, activities, pipelineStages } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'
import { moveDealSchema } from '@/lib/validations'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await req.json()
    const parsed = moveDealSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    // Get current deal
    const [deal] = await db.select()
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, session.tenantId)))

    if (!deal) {
      return NextResponse.json({ error: 'Deal não encontrado' }, { status: 404 })
    }

    // Get target stage
    const [targetStage] = await db.select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, parsed.data.stageId))

    if (!targetStage) {
      return NextResponse.json({ error: 'Stage não encontrada' }, { status: 404 })
    }

    // Get source stage name for activity log
    const [sourceStage] = await db.select()
      .from(pipelineStages)
      .where(eq(pipelineStages.id, deal.stageId))

    // Update deal
    const updateData: Record<string, unknown> = {
      stageId: parsed.data.stageId,
      updatedAt: new Date(),
    }

    if (targetStage.stageType === 'won') {
      updateData.status = 'won'
      updateData.closedAt = new Date()
    } else if (targetStage.stageType === 'lost') {
      updateData.status = 'lost'
      updateData.closedAt = new Date()
      updateData.lostReason = parsed.data.lostReason || null
    } else {
      updateData.status = 'open'
      updateData.closedAt = null
    }

    const [updated] = await db.update(deals)
      .set(updateData)
      .where(eq(deals.id, id))
      .returning()

    // Log activity
    await db.insert(activities).values({
      tenantId: session.tenantId,
      dealId: id,
      contactId: deal.contactId,
      type: 'stage_change',
      content: `Movido de "${sourceStage?.name}" para "${targetStage.name}"`,
      metadata: {
        fromStage: sourceStage?.name,
        toStage: targetStage.name,
        fromStageId: deal.stageId,
        toStageId: targetStage.id,
      },
      authorType: 'user',
      authorId: session.userId,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Move deal error:', error)
    return NextResponse.json({ error: 'Erro ao mover deal' }, { status: 500 })
  }
}
