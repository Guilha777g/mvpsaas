import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contacts, deals, activities, agentLeads, pipelineStages } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const [contact] = await db.select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, session.tenantId)))

    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
    }

    // Get deals
    const contactDeals = await db.select({
      deal: deals,
      stage: pipelineStages,
    })
      .from(deals)
      .innerJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
      .where(eq(deals.contactId, id))
      .orderBy(desc(deals.updatedAt))

    // Get activities
    const contactActivities = await db.select()
      .from(activities)
      .where(eq(activities.contactId, id))
      .orderBy(desc(activities.createdAt))
      .limit(30)

    // Get agent data
    let agentData = null
    if (contact.phone) {
      const [agent] = await db.select()
        .from(agentLeads)
        .where(and(
          eq(agentLeads.tenantId, session.tenantId),
          eq(agentLeads.number, contact.phone)
        ))
        .orderBy(desc(agentLeads.createdAt))
        .limit(1)
      agentData = agent || null
    }

    return NextResponse.json({
      contact,
      deals: contactDeals,
      activities: contactActivities,
      agentData,
    })
  } catch (error) {
    console.error('GET contact detail error:', error)
    return NextResponse.json({ error: 'Erro ao carregar contato' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const body = await req.json()

    const [updated] = await db.update(contacts)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, session.tenantId)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH contact error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}
