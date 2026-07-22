'use client'

import { useState, useEffect, useCallback } from 'react'
import StatusBadge from './StatusBadge'

interface ExpenseEntry {
  id: string
  itemDescription: string
  category: string
  categoryParent: string
  purchaseDate: string
  amountEur: number
  purchasedBy: string
  paidTo: string
  status: string
  receiptPath: string | null
}

interface IncomeEntry {
  id: string
  description: string
  category: string
  categoryParent: string
  incomeDate: string
  amountEur: number
  receivedFrom: string
  receiptPath: string | null
}

interface Category {
  id: string
  name: string
  parentId: string | null
}

type Tab = 'expenses' | 'income'

function formatEur(amount: number | string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(amount))
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE')
}

export default function EntryListView() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  const [tab, setTab] = useState<Tab>('expenses')
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [incomes, setIncomes] = useState<IncomeEntry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // Reset category/status filter when switching tabs – the two entry types
  // have separate category trees and only expenses have a status.
  useEffect(() => {
    setFilterCategory('')
    setFilterStatus('all')
  }, [tab])

  useEffect(() => {
    const type = tab === 'expenses' ? 'expense' : 'income'
    fetch(`${basePath}/api/categories?type=${type}&includeInactive=true`)
      .then((r) => r.json())
      .then((all: Category[]) => setCategories(all.filter((c) => c.parentId)))
  }, [basePath, tab])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterCategory) params.set('category', filterCategory)
    if (filterPerson) params.set('person', filterPerson)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)

    if (tab === 'expenses') {
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const res = await fetch(`${basePath}/api/expenses?${params}`)
      if (res.ok) setExpenses(await res.json())
    } else {
      const res = await fetch(`${basePath}/api/income?${params}`)
      if (res.ok) setIncomes(await res.json())
    }
    setLoading(false)
  }, [basePath, tab, filterStatus, filterCategory, filterPerson, filterDateFrom, filterDateTo])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const inputClass =
    'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500'

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('expenses')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'expenses' ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Ausgaben
        </button>
        <button
          onClick={() => setTab('income')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === 'income' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Einnahmen
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Filter</h3>
        <div className={`grid grid-cols-2 gap-3 ${tab === 'expenses' ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {tab === 'expenses' && (
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputClass}>
              <option value="all">Alle Status</option>
              <option value="pending">Ausstehend</option>
              <option value="reimbursed">Erstattet</option>
              <option value="paid">Bezahlt</option>
            </select>
          )}
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={inputClass}>
            <option value="">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder={tab === 'expenses' ? 'Person suchen …' : 'Erhalten von …'}
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            className={inputClass}
          />
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={inputClass} />
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Lade …</div>
        ) : tab === 'expenses' ? (
          expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Keine Ausgaben gefunden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-gray-400 font-medium">Datum</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Beschreibung</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Kategorie</th>
                    <th className="px-4 py-3 text-gray-400 font-medium text-right">Betrag</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Eingereicht von</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Gezahlt an</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Beleg</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-gray-800/50">
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{formatDate(e.purchaseDate)}</td>
                      <td className="px-4 py-3 text-gray-200 max-w-48 truncate">{e.itemDescription}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{e.categoryParent} → {e.category}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-white whitespace-nowrap">{formatEur(e.amountEur)}</td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{e.purchasedBy}</td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{e.paidTo}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3">
                        {e.receiptPath ? (
                          <a
                            href={`${basePath}/api/receipts/expenses/${e.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Beleg ansehen"
                            className="text-amber-400 hover:text-amber-300"
                          >
                            📎
                          </a>
                        ) : (
                          <span className="text-gray-700">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : incomes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Keine Einnahmen gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium">Datum</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Beschreibung</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Kategorie</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-right">Betrag</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Erhalten von</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Beleg</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((i) => (
                  <tr key={i.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{formatDate(i.incomeDate)}</td>
                    <td className="px-4 py-3 text-gray-200 max-w-48 truncate">{i.description}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{i.categoryParent} → {i.category}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-green-400 whitespace-nowrap">{formatEur(i.amountEur)}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{i.receivedFrom}</td>
                    <td className="px-4 py-3">
                      {i.receiptPath ? (
                        <a
                          href={`${basePath}/api/receipts/income/${i.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Beleg ansehen"
                          className="text-amber-400 hover:text-amber-300"
                        >
                          📎
                        </a>
                      ) : (
                        <span className="text-gray-700">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
