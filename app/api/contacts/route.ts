import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contacts, deals, agentLeads } from '@/lib/db/schema'
import { eq, and, desc, ilike, or } from 'drizzle-orm'
import { requireSession } from '@/lib/auth/middleware'
import { createContactSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    let query = db.select()
      .from(contacts)
      .where(
        search
          ? and(
              eq(contacts.tenantId, session.tenantId),
              or(
                ilike(contacts.name, `%${search}%`),
                ilike(contacts.company, `%${search}%`),
                ilike(contacts.phone, `%${search}%`)
              )
            )
          : eq(contacts.tenantId, session.tenantId)
      )
      .orderBy(desc(contacts.updatedAt))
      .limit(100)

    const contactList = await query

    // Enrich with agent data
    const agentRows = await db.select()
      .from(agentLeads)
      .where(eq(agentLeads.tenantId, session.tenantId))

    const agentByPhone: Record<string, typeof agentLeads.$inferSelect> = {}
    for (const row of agentRows) {
      if (row.number) agentByPhone[row.number] = row
    }

    const enriched = contactList.map(c => ({
      ...c,
      agentData: c.phone ? agentByPhone[c.phone] || null : null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('GET contacts error:', error)
    return NextResponse.json({ error: 'Erro ao carregar contatos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const parsed = createContactSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const [contact] = await db.insert(contacts).values({
      tenantId: session.tenantId,
      ...parsed.data,
      tags: parsed.data.tags || [],
    }).returning()

    return NextResponse.json(contact, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'Contato com este telefone já existe' }, { status: 409 })
    }
    console.error('POST contact error:', error)
    return NextResponse.json({ error: 'Erro ao criar contato' }, { status: 500 })
  }
}
