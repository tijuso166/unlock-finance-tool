import { requireAuth } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import OverviewDashboard from '@/components/OverviewDashboard'
import Link from 'next/link'

export const metadata = {
  title: 'Übersicht – Festival Finance',
}

export default async function DashboardPage() {
  const session = await requireAuth()

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar role={session.role!} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Finanzübersicht</h1>
            <p className="text-gray-400 text-sm mt-1">
              Festival {process.env.FESTIVAL_YEAR} · Echtzeit-Daten
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/ausgabe-einreichen"
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-medium rounded-xl text-sm transition-colors"
            >
              + Ausgabe
            </Link>
            <Link
              href="/einnahme-einreichen"
              className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl text-sm transition-colors"
            >
              + Einnahme
            </Link>
          </div>
        </div>

        <OverviewDashboard role={session.role!} />
      </div>
    </div>
  )
}
