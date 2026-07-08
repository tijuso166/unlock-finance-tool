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

  if (body.description !== undefined) data.description = body.description
  if (body.category !== undefined) {
    data.category = body.category
    const category = await prisma.category.findUnique({
      where: { name_type: { name: body.category, type: 'income' } },
      include: { parent: true },
    })
    if (category?.parent) data.categoryParent = category.parent.name
  }
  if (body.incomeDate !== undefined) data.incomeDate = new Date(body.incomeDate)
  if (body.amountEur !== undefined) data.amountEur = parseFloat(body.amountEur)
  if (body.comment !== undefined) data.comment = body.comment || null

  const income = await prisma.income.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(income)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.income.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
