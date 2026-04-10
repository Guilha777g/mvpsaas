import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await req.json()

    const [updated] = await db.update(deals)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(deals.id, id), eq(deals.tenantId, session.tenantId)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Deal não encontrado' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH deal error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    await db.delete(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, session.tenantId)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE deal error:', error)
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
  }
}
