import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals, contacts, pipelineStages, pipelines, agentLeads } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'
import { createDealSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

    // Get default pipeline
    const [pipeline] = await db.select()
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, session.tenantId), eq(pipelines.isDefault, true)))
      .limit(1)

    if (!pipeline) {
      return NextResponse.json({ deals: [], stages: [] })
    }

    // Get stages + deals in parallel
    const [stages, dealsData] = await Promise.all([
      db.select()
        .from(pipelineStages)
        .where(eq(pipelineStages.pipelineId, pipeline.id))
        .orderBy(pipelineStages.position),

      db.select({
        deal: deals,
        contact: contacts,
      })
        .from(deals)
        .innerJoin(contacts, eq(deals.contactId, contacts.id))
        .where(eq(deals.tenantId, session.tenantId))
        .orderBy(desc(deals.updatedAt))
        .limit(limit),
    ])

    // Get agent data only for phones that exist in the deals result set
    const phoneNumbers = [...new Set(
      dealsData.map(d => d.contact.phone).filter(Boolean) as string[]
    )]
    let agentData: Record<string, typeof agentLeads.$inferSelect> = {}

    if (phoneNumbers.length > 0) {
      const agentRows = await db.select()
        .from(agentLeads)
        .where(and(
          eq(agentLeads.tenantId, session.tenantId),
          inArray(agentLeads.number, phoneNumbers)
        ))

      for (const row of agentRows) {
        if (row.number) {
          agentData[row.number] = row
        }
      }
    }

    // Combine data
    const enrichedDeals = dealsData.map(({ deal, contact }) => ({
      ...deal,
      contact,
      agentData: contact.phone ? agentData[contact.phone] || null : null,
    }))

    return NextResponse.json({
      deals: enrichedDeals,
      stages,
      pipeline,
    })
  } catch (error) {
    console.error('GET deals error:', error)
    return NextResponse.json({ error: 'Erro ao carregar deals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const parsed = createDealSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    let contactId = data.contactId

    // Create contact if not provided
    if (!contactId && data.contactName) {
      const [contact] = await db.insert(contacts).values({
        tenantId: session.tenantId,
        name: data.contactName,
        phone: data.contactPhone || null,
        company: data.contactCompany || null,
        tags: data.tags || [],
        source: 'manual',
      }).returning()
      contactId = contact.id
    }

    if (!contactId) {
      return NextResponse.json({ error: 'Contato obrigatório' }, { status: 400 })
    }

    const [deal] = await db.insert(deals).values({
      tenantId: session.tenantId,
      contactId,
      pipelineId: (await db.select().from(pipelines).where(and(eq(pipelines.tenantId, session.tenantId), eq(pipelines.isDefault, true))).limit(1))[0].id,
      stageId: data.stageId,
      title: data.title,
      value: data.value.toString(),
      status: 'open',
    }).returning()

    return NextResponse.json(deal, { status: 201 })
  } catch (error) {
    console.error('POST deal error:', error)
    return NextResponse.json({ error: 'Erro ao criar deal' }, { status: 500 })
  }
}
