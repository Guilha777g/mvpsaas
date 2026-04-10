import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pipelineStages } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await req.json()

    // Check if system stage
    const [stage] = await db.select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, id), eq(pipelineStages.tenantId, session.tenantId)))

    if (!stage) {
      return NextResponse.json({ error: 'Stage não encontrada' }, { status: 404 })
    }

    if (stage.isSystem) {
      return NextResponse.json({ error: 'Não é possível editar stages SPIN (controladas pelo agente)' }, { status: 403 })
    }

    const [updated] = await db.update(pipelineStages)
      .set(body)
      .where(eq(pipelineStages.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH stage error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const [stage] = await db.select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, id), eq(pipelineStages.tenantId, session.tenantId)))

    if (!stage) {
      return NextResponse.json({ error: 'Stage não encontrada' }, { status: 404 })
    }

    if (stage.isSystem) {
      return NextResponse.json({ error: 'Não é possível remover stages SPIN' }, { status: 403 })
    }

    await db.delete(pipelineStages).where(eq(pipelineStages.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE stage error:', error)
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
  }
}
