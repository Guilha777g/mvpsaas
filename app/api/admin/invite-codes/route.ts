import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { inviteCodes } from '@/lib/db/schema'
import { requireSession } from '@/lib/auth/middleware'
import { isAdmin } from '@/lib/auth/admin'
import { createInviteCodeSchema } from '@/lib/validations'
import { desc } from 'drizzle-orm'
import crypto from 'crypto'

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

export async function GET() {
  try {
    const session = await requireSession()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const codes = await db.select()
      .from(inviteCodes)
      .orderBy(desc(inviteCodes.createdAt))

    return NextResponse.json(codes)
  } catch (error) {
    console.error('GET invite codes error:', error)
    return NextResponse.json({ error: 'Erro ao listar convites' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createInviteCodeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays)

    const [invite] = await db.insert(inviteCodes).values({
      code: generateCode(),
      tenantName: parsed.data.tenantName,
      email: parsed.data.email,
      maxUses: parsed.data.maxUses,
      expiresAt,
    }).returning()

    return NextResponse.json(invite, { status: 201 })
  } catch (error) {
    console.error('POST invite code error:', error)
    return NextResponse.json({ error: 'Erro ao criar convite' }, { status: 500 })
  }
}
