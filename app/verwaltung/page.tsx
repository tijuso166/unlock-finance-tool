import { requireTreasurer } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import TicketList from '@/components/TicketList'
import Link from 'next/link'
import { prisma } from '@/lib/db'

export const metadata = {
  title: 'Verwaltung – Festival Finance',
}

export default async function VerwaltungPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  await requireTreasurer()

  const initialStatus = searchParams.status === 'pending' ? 'pending' : 'all'
  const festivalYear = parseInt(process.env.FESTIVAL_YEAR || '2025')
  const [incomeList, proposalCount] = await Promise.all([
    prisma.income.findMany({
      where: { festivalYear },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.categoryProposal.count({ where: { status: 'open' } }),
  ])

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar role="treasurer" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Verwaltung</h1>
            <p className="text-gray-400 text-sm mt-1">Kassenwart-Bereich · Festivaljahr {festivalYear}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/verwaltung/kategorien"
              className="relative px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm transition-colors"
            >
              Kategorien
              {proposalCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-gray-950 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {proposalCount}
                </span>
              )}
            </Link>
            <a
              href={`${basePath}/verwaltung/export?type=expenses`}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm transition-colors"
            >
              CSV Ausgaben ↓
            </a>
            <a
              href={`${basePath}/verwaltung/export?type=income`}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm transition-colors"
            >
              CSV Einnahmen ↓
            </a>
          </div>
        </div>

        {/* Expense Ticket List */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Ausgaben</h2>
          <TicketList initialStatus={initialStatus} />
        </section>

        {/* Income List */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Einnahmen</h2>
          <IncomeList incomes={incomeList} basePath={basePath} />
        </section>
      </div>
    </div>
  )
}

function IncomeList({
  incomes,
  basePath,
}: {
  incomes: Array<{
    id: string
    description: string
    category: string
    incomeDate: Date
    amountEur: unknown
    comment: string | null
    createdAt: Date
  }>
  basePath: string
}) {
  if (!incomes.length) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center text-gray-500">
        Keine Einnahmen vorhanden.
      </div>
    )
  }

  function formatEur(amount: unknown) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(amount))
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('de-DE')
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Datum</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Beschreibung</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Kategorie</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">Betrag</th>
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Kommentar</th>
            </tr>
          </thead>
          <tbody>
            {incomes.map((income) => (
              <tr key={income.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{formatDate(income.incomeDate)}</td>
                <td className="px-4 py-3 text-gray-200 max-w-48 truncate">{income.description}</td>
                <td className="px-4 py-3 text-gray-400">{income.category}</td>
                <td className="px-4 py-3 text-right font-mono font-medium text-green-400 whitespace-nowrap">
                  {formatEur(income.amountEur)}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{income.comment || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
