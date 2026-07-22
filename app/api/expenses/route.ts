import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'
import { z } from 'zod'
import { ReceiptUploadError, saveReceiptFile, validateReceiptFile } from '@/lib/uploads'

const baseExpenseFields = {
  itemDescription: z.string().min(1, 'Beschreibung erforderlich'),
  category: z.string().min(1, 'Kategorie erforderlich'),
  categoryParent: z.string().min(1, 'Oberkategorie erforderlich'),
  categoryProposal: z.string().optional(),
  categoryProposalScope: z.enum(['ober', 'unter']).optional(),
  categoryProposalParent: z.string().optional(),
  amountEur: z.number().positive('Betrag muss positiv sein'),
  reimbursementNeeded: z.boolean(),
  iban: z.string().optional(),
  purchasedBy: z.string().min(1, 'Name erforderlich'),
  paidTo: z.string().min(1, 'Empfänger erforderlich'),
  comment: z.string().optional(),
}

const oneTimeExpenseSchema = z.object({
  ...baseExpenseFields,
  isRecurring: z.literal(false),
  purchaseDate: z.string().min(1, 'Kaufdatum erforderlich'),
})

const recurringExpenseSchema = z.object({
  ...baseExpenseFields,
  isRecurring: z.literal(true),
  interval: z.enum(['monthly', 'quarterly', 'yearly']),
  startDate: z.string().min(1, 'Startdatum erforderlich'),
  endDate: z.string().optional(),
})

const expenseSchema = z
  .discriminatedUnion('isRecurring', [oneTimeExpenseSchema, recurringExpenseSchema])
  .superRefine((data, ctx) => {
    if (data.reimbursementNeeded && !data.iban?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'IBAN erforderlich', path: ['iban'] })
    }
  })

// IBAN and the treasurer's internal note are only for the treasurer's eyes –
// strip them for members before returning entries.
function maskSensitiveFields<T extends { iban?: string | null; treasurerNote?: string | null }>(
  expense: T,
  role: string | undefined
): T {
  if (role === 'treasurer') return expense
  return { ...expense, iban: null, treasurerNote: null }
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const person = searchParams.get('person')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const festivalYear = parseInt(process.env.FESTIVAL_YEAR || '2025')

  const where: Record<string, unknown> = { festivalYear }
  if (status && status !== 'all') where.status = status
  if (category) where.category = category
  if (person) where.purchasedBy = { contains: person, mode: 'insensitive' }
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo + 'T23:59:59')
    where.purchaseDate = dateFilter
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(expenses.map((e) => maskSensitiveFields(e, session.role)))
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const raw = {
    itemDescription: formData.get('itemDescription') as string,
    category: formData.get('category') as string,
    categoryParent: formData.get('categoryParent') as string,
    categoryProposal: (formData.get('categoryProposal') as string) || undefined,
    categoryProposalScope: (formData.get('categoryProposalScope') as string) || undefined,
    categoryProposalParent: (formData.get('categoryProposalParent') as string) || undefined,
    amountEur: parseFloat(formData.get('amountEur') as string),
    reimbursementNeeded: formData.get('reimbursementNeeded') === 'true',
    iban: (formData.get('iban') as string) || undefined,
    purchasedBy: formData.get('purchasedBy') as string,
    paidTo: formData.get('paidTo') as string,
    comment: (formData.get('comment') as string) || undefined,
    isRecurring: formData.get('isRecurring') === 'true',
    purchaseDate: (formData.get('purchaseDate') as string) || undefined,
    interval: (formData.get('interval') as string) || undefined,
    startDate: (formData.get('startDate') as string) || undefined,
    endDate: (formData.get('endDate') as string) || undefined,
  }

  const parsed = expenseSchema.safeParse(raw)
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
  // No reimbursement due means the association already paid directly – the
  // entry is settled on creation, no treasurer confirmation step needed.
  const initialStatus = data.reimbursementNeeded ? 'pending' : 'paid'

  let expense
  if (data.isRecurring) {
    const recurring = await prisma.recurringExpense.create({
      data: {
        description: data.itemDescription,
        category: data.category,
        categoryParent: data.categoryParent,
        amountEur: data.amountEur,
        paidTo: data.paidTo,
        reimbursementNeeded: data.reimbursementNeeded,
        iban: data.iban || null,
        purchasedBy: data.purchasedBy,
        comment: data.comment || null,
        interval: data.interval,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })

    // The template's startDate occurrence is generated immediately; the
    // scheduler (lib/recurringScheduler.ts) picks up every occurrence after that.
    expense = await prisma.expense.create({
      data: {
        itemDescription: data.itemDescription,
        category: data.category,
        categoryParent: data.categoryParent,
        paidTo: data.paidTo,
        purchaseDate: new Date(data.startDate),
        amountEur: data.amountEur,
        reimbursementNeeded: data.reimbursementNeeded,
        iban: data.iban || null,
        purchasedBy: data.purchasedBy,
        comment: data.comment || null,
        festivalYear,
        recurringExpenseId: recurring.id,
        status: initialStatus,
      },
    })
  } else {
    expense = await prisma.expense.create({
      data: {
        itemDescription: data.itemDescription,
        category: data.category,
        categoryParent: data.categoryParent,
        paidTo: data.paidTo,
        purchaseDate: new Date(data.purchaseDate),
        amountEur: data.amountEur,
        reimbursementNeeded: data.reimbursementNeeded,
        iban: data.iban || null,
        purchasedBy: data.purchasedBy,
        comment: data.comment || null,
        festivalYear,
        status: initialStatus,
      },
    })
  }

  if (hasReceipt) {
    try {
      const receiptPath = await saveReceiptFile(receiptFile as File, 'expenses', expense.id)
      expense = await prisma.expense.update({ where: { id: expense.id }, data: { receiptPath } })
    } catch (err) {
      // The entry itself is already saved – don't lose it over a receipt I/O hiccup.
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
        categoryType: 'expense',
        proposedBy: data.purchasedBy,
      },
    })
  }

  return NextResponse.json(expense, { status: 201 })
}
