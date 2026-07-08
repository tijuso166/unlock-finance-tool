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

  const { action } = await request.json()

  if (action === 'accept') {
    const proposal = await prisma.categoryProposal.findUnique({ where: { id: params.id } })
    if (!proposal) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

    // Resolve the member's chosen Oberkategorie by name (only relevant for
    // "unter"-scoped proposals); falls back to a new Oberkategorie if it no
    // longer exists.
    let parentId: string | null = null
    if (proposal.proposalScope === 'unter' && proposal.parentCategoryName) {
      const parent = await prisma.category.findUnique({
        where: { name_type: { name: proposal.parentCategoryName, type: proposal.categoryType } },
      })
      if (parent && !parent.parentId) parentId = parent.id
    }

    try {
      await prisma.category.create({
        data: { name: proposal.proposedName, type: proposal.categoryType, parentId },
      })
    } catch {
      // Category already exists – still mark as reviewed
    }

    await prisma.categoryProposal.update({
      where: { id: params.id },
      data: { status: 'reviewed' },
    })
    return NextResponse.json({ success: true, action: 'accepted' })
  }

  if (action === 'decline') {
    await prisma.categoryProposal.update({
      where: { id: params.id },
      data: { status: 'reviewed' },
    })
    return NextResponse.json({ success: true, action: 'declined' })
  }

  return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
}
