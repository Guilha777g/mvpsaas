import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tenants, users, pipelines, pipelineStages } from '@/lib/db/schema'
import { hashPassword, signJWT } from '@/lib/auth'
import { registerSchema } from '@/lib/validations'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { name, email, password, tenantName } = parsed.data

    const slug = tenantName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Create tenant
    const [tenant] = await db.insert(tenants).values({
      name: tenantName,
      slug: slug + '-' + Date.now().toString(36),
    }).returning()

    // Create default pipeline with SPIN stages
    const [pipeline] = await db.insert(pipelines).values({
      tenantId: tenant.id,
      name: 'Pipeline Principal',
      isDefault: true,
    }).returning()

    // SPIN stages (system) + default custom stages
    await db.insert(pipelineStages).values([
      { pipelineId: pipeline.id, tenantId: tenant.id, name: 'Situação', color: '#7ec97e', position: 0, isSystem: true, spinValue: 1, stageType: 'open' },
      { pipelineId: pipeline.id, tenantId: tenant.id, name: 'Problema', color: '#8090d0', position: 1, isSystem: true, spinValue: 2, stageType: 'open' },
      { pipelineId: pipeline.id, tenantId: tenant.id, name: 'Implicação', color: '#C9A84C', position: 2, isSystem: true, spinValue: 3, stageType: 'open' },
      { pipelineId: pipeline.id, tenantId: tenant.id, name: 'Necessidade', color: '#E8C96A', position: 3, isSystem: true, spinValue: 4, stageType: 'open' },
      { pipelineId: pipeline.id, tenantId: tenant.id, name: 'Proposta', color: '#C9A84C', position: 4, isSystem: false, stageType: 'open' },
      { pipelineId: pipeline.id, tenantId: tenant.id, name: 'Negociação', color: '#a0b0e0', position: 5, isSystem: false, stageType: 'open' },
      { pipelineId: pipeline.id, tenantId: tenant.id, name: 'Ganho', color: '#E8C96A', position: 6, isSystem: false, stageType: 'won' },
      { pipelineId: pipeline.id, tenantId: tenant.id, name: 'Perdido', color: '#c06060', position: 7, isSystem: false, stageType: 'lost' },
    ])

    // Create owner user
    const passwordHash = await hashPassword(password)
    const [user] = await db.insert(users).values({
      tenantId: tenant.id,
      name,
      email,
      passwordHash,
      role: 'owner',
    }).returning()

    // Sign JWT
    const token = await signJWT({
      userId: user.id,
      tenantId: tenant.id,
      role: 'owner',
      name: tenant.name,
      email,
    })

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
  }
}
