import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

interface CategoryTotal {
  name: string
  total: number
}

interface OberTotal extends CategoryTotal {
  children: CategoryTotal[]
}

function groupByOber(items: { category: string; categoryParent: string; amountEur: unknown }[]): OberTotal[] {
  const obers = new Map<string, Map<string, number>>()

  for (const item of items) {
    const parent = item.categoryParent || 'Sonstiges'
    if (!obers.has(parent)) obers.set(parent, new Map())
    const children = obers.get(parent)!
    children.set(item.category, (children.get(item.category) || 0) + Number(item.amountEur))
  }

  return Array.from(obers.entries())
    .map(([name, children]) => ({
      name,
      total: Array.from(children.values()).reduce((a, b) => a + b, 0),
      children: Array.from(children.entries())
        .map(([childName, total]) => ({ name: childName, total }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total)
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const festivalYear = parseInt(process.env.FESTIVAL_YEAR || '2025')

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({ where: { festivalYear } }),
    prisma.income.findMany({ where: { festivalYear } }),
  ])

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amountEur), 0)
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amountEur), 0)
  const netBalance = totalIncome - totalExpenses

  const pendingExpenses = expenses.filter((e) => e.status === 'pending')
  const pendingCount = pendingExpenses.length
  const pendingAmount = pendingExpenses.reduce((sum, e) => sum + Number(e.amountEur), 0)

  return NextResponse.json({
    totalExpenses,
    totalIncome,
    netBalance,
    pendingCount,
    pendingAmount,
    festivalYear,
    incomeByOber: groupByOber(incomes),
    expenseByOber: groupByOber(expenses),
  })
}
