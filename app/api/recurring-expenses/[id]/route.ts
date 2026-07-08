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
  if (body.isActive !== undefined) data.isActive = body.isActive

  const template = await prisma.recurringExpense.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(template)
}
