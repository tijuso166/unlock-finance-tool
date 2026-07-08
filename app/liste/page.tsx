import { requireAuth } from '@/lib/auth'
import NavBar from '@/components/NavBar'
import EntryListView from '@/components/EntryListView'

export const metadata = {
  title: 'Liste – Festival Finance',
}

export default async function ListePage() {
  const session = await requireAuth()

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar role={session.role!} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Alle Einträge</h1>
          <p className="text-gray-400 text-sm mt-1">
            Übersicht aller Ausgaben und Einnahmen – nur lesend.
          </p>
        </div>
        <EntryListView />
      </div>
    </div>
  )
}
