import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deals, contacts, activities, pipelineStages, pipelines, agentLeads } from '@/lib/db/schema'
import { eq, and, count, sum, desc, gte } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'

export async function GET() {
  try {
    const session = await requireSession()
    const tid = session.tenantId

    // Get pipeline
    const [pipeline] = await db.select()
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, tid), eq(pipelines.isDefault, true)))
      .limit(1)

    if (!pipeline) {
      return NextResponse.json({ stats: {}, stageStats: [], recentActivity: [] })
    }

    // Total deals
    const allDeals = await db.select()
      .from(deals)
      .where(eq(deals.tenantId, tid))

    const openDeals = allDeals.filter(d => d.status === 'open')
    const wonDeals = allDeals.filter(d => d.status === 'won')
    const lostDeals = allDeals.filter(d => d.status === 'lost')

    const totalPipelineValue = openDeals.reduce((s, d) => s + parseFloat(d.value || '0'), 0)
    const wonValue = wonDeals.reduce((s, d) => s + parseFloat(d.value || '0'), 0)

    const conversionRate = allDeals.length > 0
      ? Math.round((wonDeals.length / allDeals.length) * 100)
      : 0

    // Stage breakdown
    const stages = await db.select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipeline.id))
      .orderBy(pipelineStages.position)

    const stageStats = stages.map(stage => {
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

    // Total contacts
    const contactRows = await db.select()
      .from(contacts)
      .where(eq(contacts.tenantId, tid))

    // Recent activity
    const recentActivity = await db.select()
      .from(activities)
      .where(eq(activities.tenantId, tid))
      .orderBy(desc(activities.createdAt))
      .limit(10)

    // Agent stats
    const agentRows = await db.select()
      .from(agentLeads)
      .where(eq(agentLeads.tenantId, tid))

    const agentActive = agentRows.filter(a => {
      if (!a.ultimamsgIa) return false
      const diff = Date.now() - new Date(a.ultimamsgIa).getTime()
      return diff < 24 * 60 * 60 * 1000 // Active in last 24h
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
      recentActivity,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}
