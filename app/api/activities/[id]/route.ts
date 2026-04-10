import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activities } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const [deleted] = await db.delete(activities)
      .where(and(eq(activities.id, id), eq(activities.tenantId, session.tenantId)))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: 'Atividade não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE activity error:', error)
    return NextResponse.json({ error: 'Erro ao excluir atividade' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await req.json()

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })
    }

    const [updated] = await db.update(activities)
      .set({ content: body.content.trim() })
      .where(and(eq(activities.id, id), eq(activities.tenantId, session.tenantId)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Atividade não encontrada' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH activity error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar atividade' }, { status: 500 })
  }
}
