'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const CategoryPieChart = dynamic(() => import('./CategoryPieChart'), { ssr: false })

interface CategoryChild {
  name: string
  total: number
}

interface CategoryOber extends CategoryChild {
  children: CategoryChild[]
}

interface OverviewData {
  totalExpenses: number
  totalIncome: number
  netBalance: number
  pendingCount: number
  pendingAmount: number
  incomeByOber: CategoryOber[]
  expenseByOber: CategoryOber[]
  festivalYear: number
}

interface OverviewDashboardProps {
  role: 'member' | 'treasurer'
}

const INCOME_COLORS = ['#10b981', '#22c55e', '#84cc16', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']
const EXPENSE_COLORS = ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4']

function formatEur(amount: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export default function OverviewDashboard({ role }: OverviewDashboardProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const router = useRouter()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/api/overview`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastRefresh(new Date())
      }
    } catch {
      // silent fail on background refresh
    } finally {
      setLoading(false)
    }
  }, [basePath])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-pulse">Lade Übersicht …</div>
      </div>
    )
  }

  if (!data) return null

  const isPositive = data.netBalance >= 0

  const pendingContent = (
    <>
      <span className="text-2xl">🟡</span>
      <div>
        <div className="font-medium text-amber-300">
          {data.pendingCount} ausstehende Erstattung{data.pendingCount !== 1 ? 'en' : ''}
        </div>
        <div className="text-sm text-amber-400/70">
          Gesamt: {formatEur(data.pendingAmount)}
        </div>
      </div>
      <span className="ml-auto text-amber-400 text-sm whitespace-nowrap">Zur Verwaltung →</span>
    </>
  )

  return (
    <div className="space-y-6">
      {/* Hero Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Einnahmen</div>
          <div className="text-2xl font-bold text-green-400">{formatEur(data.totalIncome)}</div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Ausgaben</div>
          <div className="text-2xl font-bold text-red-400">{formatEur(data.totalExpenses)}</div>
        </div>
        <div className={`rounded-2xl p-5 border ${isPositive ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Saldo</div>
          <div className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatEur(data.netBalance)}
          </div>
        </div>
      </div>

      {/* Pending Reimbursements – treasurer only, hidden entirely for members */}
      {role === 'treasurer' && data.pendingCount > 0 && (
        <button
          type="button"
          onClick={() => router.push('/verwaltung?status=pending')}
          className="w-full text-left bg-amber-900/20 border border-amber-700/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-amber-900/30 hover:border-amber-600 transition-colors"
        >
          {pendingContent}
        </button>
      )}

      {/* Pie Charts: Einnahmen & Ausgaben nach Oberkategorie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryPieChart
          title="Einnahmen nach Kategorie"
          data={data.incomeByOber}
          colors={INCOME_COLORS}
          emptyMessage="Noch keine Einnahmen erfasst"
        />
        <CategoryPieChart
          title="Ausgaben nach Kategorie"
          data={data.expenseByOber}
          colors={EXPENSE_COLORS}
          emptyMessage="Noch keine Ausgaben erfasst"
        />
      </div>

      {/* Auto-refresh indicator */}
      <p className="text-center text-gray-600 text-xs">
        Automatische Aktualisierung alle 60 Sekunden · Zuletzt: {lastRefresh.toLocaleTimeString('de-DE')}
      </p>
    </div>
  )
}
