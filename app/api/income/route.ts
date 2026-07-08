import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { ReceiptUploadError, saveReceiptFile, validateReceiptFile } from '@/lib/uploads'

const incomeSchema = z.object({
  description: z.string().min(1, 'Beschreibung erforderlich'),
  category: z.string().min(1, 'Kategorie erforderlich'),
  categoryParent: z.string().min(1, 'Oberkategorie erforderlich'),
  categoryProposal: z.string().optional(),
  categoryProposalScope: z.enum(['ober', 'unter']).optional(),
  categoryProposalParent: z.string().optional(),
  categoryProposalBy: z.string().optional(),
  receivedFrom: z.string().min(1, 'Erhalten von ist erforderlich'),
  incomeDate: z.string(),
  amountEur: z.number().positive('Betrag muss positiv sein'),
  comment: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const person = searchParams.get('person')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const festivalYear = parseInt(process.env.FESTIVAL_YEAR || '2025')

  const where: Record<string, unknown> = { festivalYear }
  if (category) where.category = category
  if (person) where.receivedFrom = { contains: person, mode: 'insensitive' }
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo + 'T23:59:59')
    where.incomeDate = dateFilter
  }

  const incomes = await prisma.income.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(incomes)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const raw = {
    description: formData.get('description') as string,
    category: formData.get('category') as string,
    categoryParent: formData.get('categoryParent') as string,
    categoryProposal: (formData.get('categoryProposal') as string) || undefined,
    categoryProposalScope: (formData.get('categoryProposalScope') as string) || undefined,
    categoryProposalParent: (formData.get('categoryProposalParent') as string) || undefined,
    categoryProposalBy: (formData.get('categoryProposalBy') as string) || undefined,
    receivedFrom: formData.get('receivedFrom') as string,
    incomeDate: formData.get('incomeDate') as string,
    amountEur: parseFloat(formData.get('amountEur') as string),
    comment: (formData.get('comment') as string) || undefined,
  }

  const parsed = incomeSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.errors },
      { status: 400 }
    )
  }

  const receiptFile = formData.get('receipt')
  const hasReceipt = receiptFile instanceof File && receiptFile.size > 0
  if (hasReceipt) {
    try {
      validateReceiptFile(receiptFile as File)
    } catch (err) {
      const message = err instanceof ReceiptUploadError ? err.message : 'Beleg konnte nicht verarbeitet werden.'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const data = parsed.data
  const festivalYear = parseInt(process.env.FESTIVAL_YEAR || '2025')

  let income = await prisma.income.create({
    data: {
      description: data.description,
      category: data.category,
      categoryParent: data.categoryParent,
      receivedFrom: data.receivedFrom,
      incomeDate: new Date(data.incomeDate),
      amountEur: data.amountEur,
      comment: data.comment || null,
      festivalYear,
    },
  })

  if (hasReceipt) {
    try {
      const receiptPath = await saveReceiptFile(receiptFile as File, 'income', income.id)
      income = await prisma.income.update({ where: { id: income.id }, data: { receiptPath } })
    } catch (err) {
      console.error('Beleg konnte nicht gespeichert werden:', err)
    }
  }

  // Handle optional category proposal
  if (data.categoryProposal?.trim()) {
    const scope = data.categoryProposalScope === 'unter' ? 'unter' : 'ober'
    await prisma.categoryProposal.create({
      data: {
        proposedName: data.categoryProposal.trim(),
        proposalScope: scope,
        parentCategoryName: scope === 'unter' ? data.categoryProposalParent?.trim() || null : null,
        categoryType: 'income',
        proposedBy: data.categoryProposalBy?.trim() || data.receivedFrom,
      },
    })
  }

  return NextResponse.json(income, { status: 201 })
}
