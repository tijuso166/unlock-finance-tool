import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expense = await prisma.expense.findUnique({ where: { id: params.id } })
  if (!expense) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  return NextResponse.json(expense)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { markReimbursed, ...updateFields } = body

  const data: Record<string, unknown> = {}

  if (updateFields.itemDescription !== undefined) data.itemDescription = updateFields.itemDescription
  if (updateFields.category !== undefined) {
    data.category = updateFields.category
    // Keep categoryParent in sync with the selected Unter-category
    const category = await prisma.category.findUnique({
      where: { name_type: { name: updateFields.category, type: 'expense' } },
      include: { parent: true },
    })
    if (category?.parent) data.categoryParent = category.parent.name
  }
  if (updateFields.purchasedBy !== undefined) data.purchasedBy = updateFields.purchasedBy
  if (updateFields.amountEur !== undefined) data.amountEur = parseFloat(updateFields.amountEur)
  if (updateFields.reimbursementMethod !== undefined) data.reimbursementMethod = updateFields.reimbursementMethod
  if (updateFields.paypalAddress !== undefined) data.paypalAddress = updateFields.paypalAddress || null
  if (updateFields.iban !== undefined) data.iban = updateFields.iban || null
  if (updateFields.comment !== undefined) data.comment = updateFields.comment || null
  if (updateFields.treasurerNote !== undefined) data.treasurerNote = updateFields.treasurerNote || null
  if (updateFields.purchaseDate !== undefined) data.purchaseDate = new Date(updateFields.purchaseDate)

  if (markReimbursed === true) {
    data.status = 'reimbursed'
    data.reimbursedAt = new Date()
  } else if (updateFields.status === 'pending') {
    data.status = 'pending'
    data.reimbursedAt = null
  }

  const expense = await prisma.expense.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(expense)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.expense.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
