import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activities } from '@/lib/db/schema'
import { eq, and, desc, or, isNull } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'
import { createActivitySchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(req.url)
    const dealId = searchParams.get('dealId')
    const contactId = searchParams.get('contactId')

    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const conditions = [eq(activities.tenantId, session.tenantId)]

    if (!includeDeleted) conditions.push(isNull(activities.deletedAt))
    if (dealId) conditions.push(eq(activities.dealId, dealId))
    if (contactId) conditions.push(eq(activities.contactId, contactId))

    const result = await db.select()
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.createdAt))
      .limit(50)

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET activities error:', error)
    return NextResponse.json({ error: 'Erro ao carregar atividades' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const parsed = createActivitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const [activity] = await db.insert(activities).values({
      tenantId: session.tenantId,
      dealId: parsed.data.dealId || null,
      contactId: parsed.data.contactId || null,
      type: parsed.data.type,
      content: parsed.data.content,
      authorType: 'user',
      authorId: session.userId,
    }).returning()

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error('POST activity error:', error)
    return NextResponse.json({ error: 'Erro ao criar atividade' }, { status: 500 })
  }
}
