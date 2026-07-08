import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const templates = await prisma.recurringExpense.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(templates)
}
