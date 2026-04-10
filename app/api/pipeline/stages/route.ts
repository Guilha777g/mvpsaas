import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pipelineStages, pipelines } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'
import { createStageSchema } from '@/lib/validations'

export async function GET() {
  try {
    const session = await requireSession()

    const [pipeline] = await db.select()
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, session.tenantId), eq(pipelines.isDefault, true)))
      .limit(1)

    if (!pipeline) {
      return NextResponse.json([])
    }

    const stages = await db.select()
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipeline.id))
      .orderBy(pipelineStages.position)

    return NextResponse.json(stages)
  } catch (error) {
    console.error('GET stages error:', error)
    return NextResponse.json({ error: 'Erro ao carregar stages' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const parsed = createStageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const [pipeline] = await db.select()
      .from(pipelines)
      .where(and(eq(pipelines.tenantId, session.tenantId), eq(pipelines.isDefault, true)))
      .limit(1)

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline não encontrado' }, { status: 404 })
    }

    const [stage] = await db.insert(pipelineStages).values({
      pipelineId: pipeline.id,
      tenantId: session.tenantId,
      name: parsed.data.name,
      color: parsed.data.color,
      position: parsed.data.position,
      isSystem: false,
      stageType: parsed.data.stageType,
    }).returning()

    return NextResponse.json(stage, { status: 201 })
  } catch (error) {
    console.error('POST stage error:', error)
    return NextResponse.json({ error: 'Erro ao criar stage' }, { status: 500 })
  }
}
