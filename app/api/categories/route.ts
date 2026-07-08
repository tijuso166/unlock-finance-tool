import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const includeInactive = searchParams.get('includeInactive') === 'true'
  const grouped = searchParams.get('grouped') === 'true'

  const where: Record<string, unknown> = {}
  if (!includeInactive) where.isActive = true
  if (type) where.type = type

  if (grouped) {
    const obers = await prisma.category.findMany({
      where: { ...where, parentId: null },
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(obers)
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ name: 'asc' }],
  })

  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, type, parentId } = await request.json()
  if (!name?.trim() || !type) {
    return NextResponse.json({ error: 'Name und Typ sind erforderlich' }, { status: 400 })
  }

  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } })
    if (!parent || parent.type !== type || parent.parentId) {
      return NextResponse.json({ error: 'Ungültige Oberkategorie' }, { status: 400 })
    }
  }

  try {
    const category = await prisma.category.create({
      data: { name: name.trim(), type, parentId: parentId || null },
    })
    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Kategorie existiert bereits' }, { status: 409 })
  }
}
