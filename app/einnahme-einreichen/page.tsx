import { requireAuth } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import IncomeForm from '@/components/IncomeForm'

export const metadata = {
  title: 'Einnahme eintragen – Festival Finance',
}

export default async function EinnahmeEinreichenPage() {
  const session = await requireAuth()

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar role={session.role!} />
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Einnahme eintragen</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Trage Einnahmen wie Ticketverkäufe, Fördergelder oder Merchandise ein.
          </p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <IncomeForm />
        </div>
      </div>
    </div>
  )
}
