import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals, contacts, activities, pipelineStages, pipelines, agentLeads } from '@/lib/db/schema'
import { eq, and, count, sum, desc, gte, inArray } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'
import { isAdmin } from '@/lib/auth/admin'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const admin = isAdmin(session)
    const selectedTenant = new URL(req.url).searchParams.get('tenantId')
    const allTenants = admin && !selectedTenant
    const tid = admin ? selectedTenant : session.tenantId

    // Get pipeline (for stage breakdown — use first default pipeline, or skip for allTenants)
    let pipeline = null
    if (!allTenants) {
      const [p] = await db.select()
        .from(pipelines)
        .where(and(eq(pipelines.tenantId, tid!), eq(pipelines.isDefault, true)))
        .limit(1)
      pipeline = p
      if (!pipeline) {
        return NextResponse.json({ stats: {}, stageStats: [], recentActivity: [] })
      }
    }

    // Total deals
    const allDeals = allTenants
      ? await db.select().from(deals)
      : await db.select().from(deals).where(eq(deals.tenantId, tid!))

    const openDeals = allDeals.filter(d => d.status === 'open')
    const wonDeals = allDeals.filter(d => d.status === 'won')
    const lostDeals = allDeals.filter(d => d.status === 'lost')

    const totalPipelineValue = openDeals.reduce((s, d) => s + parseFloat(d.value || '0'), 0)
    const wonValue = wonDeals.reduce((s, d) => s + parseFloat(d.value || '0'), 0)

    const conversionRate = allDeals.length > 0
      ? Math.round((wonDeals.length / allDeals.length) * 100)
      : 0

    // Stage breakdown
    let stageStats: any[] = []
    if (allTenants) {
      // Admin "Todos": agregar stages de todos os pipelines default
      const allPipelines = await db.select()
        .from(pipelines)
        .where(eq(pipelines.isDefault, true))

      const allStages = allPipelines.length > 0
        ? await db.select()
            .from(pipelineStages)
            .where(inArray(pipelineStages.pipelineId, allPipelines.map(p => p.id)))
            .orderBy(pipelineStages.position)
        : []

      // Agrupar stages por nome (tenants diferentes têm mesmos nomes SPIN)
      const grouped: Record<string, { name: string; color: string; count: number; value: number; ids: string[] }> = {}
      for (const stage of allStages) {
        const key = stage.name
        if (!grouped[key]) {
          grouped[key] = { name: stage.name, color: stage.color || '#C9A84C', count: 0, value: 0, ids: [] }
        }
        grouped[key].ids.push(stage.id)
      }
      for (const g of Object.values(grouped)) {
        const stageDeals = allDeals.filter(d => g.ids.includes(d.stageId))
        g.count = stageDeals.length
        g.value = stageDeals.reduce((s, d) => s + parseFloat(d.value || '0'), 0)
      }
      stageStats = Object.values(grouped).map(g => ({
        id: g.ids[0],
        name: g.name,
        color: g.color,
        count: g.count,
        value: g.value,
      }))
    } else {
      const stages = await db.select()
        .from(pipelineStages)
        .where(eq(pipelineStages.pipelineId, pipeline!.id))
        .orderBy(pipelineStages.position)

      stageStats = stages.map(stage => {
        const stageDeals = allDeals.filter(d => d.stageId === stage.id)
        return {
          id: stage.id,
          name: stage.name,
          color: stage.color,
          isSystem: stage.isSystem,
          spinValue: stage.spinValue,
          count: stageDeals.length,
          value: stageDeals.reduce((s, d) => s + parseFloat(d.value || '0'), 0),
        }
      })
    }

    // Total contacts
    const contactRows = allTenants
      ? await db.select().from(contacts)
      : await db.select().from(contacts).where(eq(contacts.tenantId, tid!))

    // Recent activity with contact/deal context
    const recentActivityRaw = allTenants
      ? await db.select({
          id: activities.id,
          type: activities.type,
          content: activities.content,
          authorType: activities.authorType,
          createdAt: activities.createdAt,
          contactId: activities.contactId,
          dealId: activities.dealId,
          contactName: contacts.name,
          dealTitle: deals.title,
        })
          .from(activities)
          .leftJoin(contacts, eq(activities.contactId, contacts.id))
          .leftJoin(deals, eq(activities.dealId, deals.id))
          .orderBy(desc(activities.createdAt))
          .limit(10)
      : await db.select({
          id: activities.id,
          type: activities.type,
          content: activities.content,
          authorType: activities.authorType,
          createdAt: activities.createdAt,
          contactId: activities.contactId,
          dealId: activities.dealId,
          contactName: contacts.name,
          dealTitle: deals.title,
        })
          .from(activities)
          .leftJoin(contacts, eq(activities.contactId, contacts.id))
          .leftJoin(deals, eq(activities.dealId, deals.id))
          .where(eq(activities.tenantId, tid!))
          .orderBy(desc(activities.createdAt))
          .limit(10)

    // Agent stats
    const agentRows = allTenants
      ? await db.select().from(agentLeads)
      : await db.select().from(agentLeads).where(eq(agentLeads.tenantId, tid!))

    const agentActive = agentRows.filter(a => {
      if (!a.ultimamsgIa) return false
      const diff = Date.now() - new Date(a.ultimamsgIa).getTime()
      return diff < 24 * 60 * 60 * 1000
    }).length

    return NextResponse.json({
      stats: {
        totalDeals: allDeals.length,
        openDeals: openDeals.length,
        totalPipelineValue,
        wonDeals: wonDeals.length,
        wonValue,
        lostDeals: lostDeals.length,
        conversionRate,
        totalContacts: contactRows.length,
        agentActive,
        agentTotal: agentRows.length,
      },
      stageStats,
      recentActivity: recentActivityRaw,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}
