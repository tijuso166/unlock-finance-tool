import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const proposals = await prisma.categoryProposal.findMany({
    where: { status: 'open' },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(proposals)
}
