import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals, contacts, pipelineStages, pipelines, agentLeads, tenants } from '@/lib/db/schema'
import { eq, and, desc, inArray, SQL } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'
import { isAdmin } from '@/lib/auth/admin'
import { createDealSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const admin = isAdmin(session)
    const selectedTenant = new URL(req.url).searchParams.get('tenantId')
    const allTenants = admin && !selectedTenant
    const tid = admin ? selectedTenant : session.tenantId

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

    // Get pipelines + stages
    let stages: any[] = []
    // Map original stageId → consolidated stageId (for allTenants mode)
    let stageIdMap: Record<string, string> = {}
    if (allTenants) {
      const allPipelines = await db.select().from(pipelines).where(eq(pipelines.isDefault, true))
      if (allPipelines.length > 0) {
        const allStages = await db.select()
          .from(pipelineStages)
          .where(inArray(pipelineStages.pipelineId, allPipelines.map(p => p.id)))
          .orderBy(pipelineStages.position)
        // Deduplicate by name and build remap
        const seen = new Map<string, any>()
        for (const s of allStages) {
          if (!seen.has(s.name)) {
            seen.set(s.name, s)
          }
          // Map all stage IDs with this name to the canonical one
          stageIdMap[s.id] = seen.get(s.name).id
        }
        stages = Array.from(seen.values())
      }
    } else {
      const [pipeline] = await db.select()
        .from(pipelines)
        .where(and(eq(pipelines.tenantId, tid!), eq(pipelines.isDefault, true)))
        .limit(1)

      if (!pipeline) {
        return NextResponse.json({ deals: [], stages: [] })
      }

      stages = await db.select()
        .from(pipelineStages)
        .where(eq(pipelineStages.pipelineId, pipeline.id))
        .orderBy(pipelineStages.position)
    }

    // Get deals
    const dealsQuery = db.select({
      deal: deals,
      contact: contacts,
    })
      .from(deals)
      .innerJoin(contacts, eq(deals.contactId, contacts.id))
      .orderBy(desc(deals.updatedAt))
      .limit(limit)

    const dealsData = allTenants
      ? await dealsQuery
      : await db.select({ deal: deals, contact: contacts })
          .from(deals)
          .innerJoin(contacts, eq(deals.contactId, contacts.id))
          .where(eq(deals.tenantId, tid!))
          .orderBy(desc(deals.updatedAt))
          .limit(limit)

    // Get agent data only for phones that exist in the deals result set
    const phoneNumbers = Array.from(new Set(
      dealsData.map(d => d.contact.phone).filter(Boolean) as string[]
    ))
    let agentData: Record<string, typeof agentLeads.$inferSelect> = {}

    if (phoneNumbers.length > 0) {
      const agentRows = allTenants
        ? await db.select().from(agentLeads).where(inArray(agentLeads.number, phoneNumbers))
        : await db.select().from(agentLeads).where(and(
            eq(agentLeads.tenantId, tid!),
            inArray(agentLeads.number, phoneNumbers)
          ))

      for (const row of agentRows) {
        if (row.number) {
          agentData[row.number] = row
        }
      }
    }

    // Get tenant names for admin "Todos" mode
    let tenantNames: Record<string, string> = {}
    if (allTenants) {
      const tenantRows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants)
      for (const t of tenantRows) tenantNames[t.id] = t.name
    }

    // Combine data
    const enrichedDeals = dealsData.map(({ deal, contact }) => ({
      ...deal,
      // Remap stageId to consolidated stage for "Todos" mode
      stageId: allTenants && stageIdMap[deal.stageId] ? stageIdMap[deal.stageId] : deal.stageId,
      contact,
      agentData: contact.phone ? agentData[contact.phone] || null : null,
      tenantName: allTenants ? (tenantNames[deal.tenantId] || null) : null,
    }))

    return NextResponse.json({
      deals: enrichedDeals,
      stages,
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
