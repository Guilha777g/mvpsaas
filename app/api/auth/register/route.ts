import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tenants, users, pipelines, pipelineStages, inviteCodes } from '@/lib/db/schema'
import { hashPassword, signJWT } from '@/lib/auth'
import { registerWithInviteSchema } from '@/lib/validations'
import { cookies } from 'next/headers'
import { eq, and, gt, sql } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerWithInviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { name, email, password, inviteCode } = parsed.data

    // Validate invite code
    const [invite] = await db.select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, inviteCode.toUpperCase()))
      .limit(1)

    if (!invite) {
      return NextResponse.json({ error: 'Código de convite inválido' }, { status: 403 })
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return NextResponse.json({ error: 'Código de convite expirado' }, { status: 403 })
    }

    if (invite.usedCount! >= invite.maxUses!) {
      return NextResponse.json({ error: 'Código de convite já utilizado' }, { status: 403 })
    }

    if (invite.email && invite.email !== email) {
      return NextResponse.json({ error: 'Este convite é destinado a outro email' }, { status: 403 })
    }

    // Use tenant name from invite
    const tenantName = invite.tenantName
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

    // Mark invite code as used
    await db.update(inviteCodes)
      .set({ usedCount: sql`${inviteCodes.usedCount} + 1` })
      .where(eq(inviteCodes.id, invite.id))

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
      maxAge: 60 * 60 * 24 * 7,
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
