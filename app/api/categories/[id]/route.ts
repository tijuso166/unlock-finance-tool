import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name.trim()
  if (body.isActive !== undefined) data.isActive = body.isActive

  try {
    const category = await prisma.category.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: 'Kategorie existiert bereits oder ungültig' }, { status: 409 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Soft delete – keeps historical data intact. If this is an Ober-category,
  // its Unter-categories are deactivated with it so they disappear together.
  await prisma.$transaction([
    prisma.category.updateMany({ where: { parentId: params.id }, data: { isActive: false } }),
    prisma.category.update({ where: { id: params.id }, data: { isActive: false } }),
  ])

  return NextResponse.json({ success: true })
}
