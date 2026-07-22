import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('de-DE')
}

function formatAmount(amount: unknown): string {
  if (amount === null || amount === undefined) return ''
  return Number(amount).toFixed(2).replace('.', ',')
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'expenses'
  const festivalYear = parseInt(process.env.FESTIVAL_YEAR || '2025')

  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility

  if (type === 'expenses') {
    const expenses = await prisma.expense.findMany({
      where: { festivalYear },
      orderBy: [{ category: 'asc' }, { purchaseDate: 'asc' }],
    })

    const headers = [
      'ID', 'Erstellt am', 'Gekauft von', 'Beschreibung', 'Kategorie',
      'Kaufdatum', 'Betrag (EUR)', 'Erstattung notwendig', 'IBAN',
      'Status', 'Erstattet am', 'Kommentar', 'Kassennotiz', 'Festivaljahr',
    ]
    let csv = BOM + headers.join(';') + '\n'

    const statusLabels: Record<string, string> = {
      pending: 'Ausstehend',
      reimbursed: 'Erstattet',
      paid: 'Bezahlt',
    }

    for (const e of expenses) {
      const row = [
        e.id,
        formatDate(e.createdAt),
        e.purchasedBy,
        e.itemDescription,
        e.category,
        formatDate(e.purchaseDate),
        formatAmount(e.amountEur),
        e.reimbursementNeeded ? 'Ja' : 'Nein',
        e.iban,
        statusLabels[e.status] || e.status,
        formatDate(e.reimbursedAt),
        e.comment,
        e.treasurerNote,
        e.festivalYear,
      ].map(escapeCsv)
      csv += row.join(';') + '\n'
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ausgaben-${festivalYear}.csv"`,
      },
    })
  }

  if (type === 'income') {
    const incomes = await prisma.income.findMany({
      where: { festivalYear },
      orderBy: [{ category: 'asc' }, { incomeDate: 'asc' }],
    })

    const headers = [
      'ID', 'Erstellt am', 'Beschreibung', 'Kategorie',
      'Datum', 'Betrag (EUR)', 'Kommentar', 'Festivaljahr',
    ]
    let csv = BOM + headers.join(';') + '\n'

    for (const i of incomes) {
      const row = [
        i.id,
        formatDate(i.createdAt),
        i.description,
        i.category,
        formatDate(i.incomeDate),
        formatAmount(i.amountEur),
        i.comment,
        i.festivalYear,
      ].map(escapeCsv)
      csv += row.join(';') + '\n'
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="einnahmen-${festivalYear}.csv"`,
      },
    })
  }

  return NextResponse.json({ error: 'Ungültiger Typ. Verwende ?type=expenses oder ?type=income' }, { status: 400 })
}
