'use client'

import { useState, useEffect, useCallback } from 'react'
import StatusBadge from './StatusBadge'

interface Expense {
  id: string
  createdAt: string
  purchasedBy: string
  itemDescription: string
  category: string
  purchaseDate: string
  amountEur: number
  reimbursementMethod: string
  paypalAddress?: string | null
  iban?: string | null
  comment?: string | null
  status: string
  reimbursedAt?: string | null
  treasurerNote?: string | null
}

interface Category {
  id: string
  name: string
  parentId: string | null
}

function formatEur(amount: number | string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(amount))
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '–'
  return new Date(dateStr).toLocaleDateString('de-DE')
}

interface TicketListProps {
  initialStatus?: string
}

export default function TicketList({ initialStatus = 'all' }: TicketListProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/finanzen'

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Expense | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Expense>>({})
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState(initialStatus)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const fetchExpenses = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterCategory) params.set('category', filterCategory)
    if (filterPerson) params.set('person', filterPerson)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)

    const res = await fetch(`${basePath}/api/expenses?${params}`)
    if (res.ok) {
      setExpenses(await res.json())
    }
    setLoading(false)
  }, [basePath, filterStatus, filterCategory, filterPerson, filterDateFrom, filterDateTo])

  useEffect(() => {
    fetch(`${basePath}/api/categories?type=expense&includeInactive=true`)
      .then((r) => r.json())
      // Only leaf (Unter-)categories are ever stored on an expense
      .then((all: Category[]) => setCategories(all.filter((c) => c.parentId)))
  }, [basePath])

  useEffect(() => {
    setLoading(true)
    fetchExpenses()
  }, [fetchExpenses])

  function openDetail(expense: Expense) {
    setSelected(expense)
    setEditMode(false)
    setEditForm({})
  }

  function startEdit() {
    if (!selected) return
    setEditForm({ ...selected })
    setEditMode(true)
  }

  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    const res = await fetch(`${basePath}/api/expenses/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setSelected(updated)
      setEditMode(false)
      fetchExpenses()
    }
    setSaving(false)
  }

  async function markReimbursed(id: string) {
    const res = await fetch(`${basePath}/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markReimbursed: true }),
    })
    if (res.ok) {
      const updated = await res.json()
      if (selected?.id === id) setSelected(updated)
      fetchExpenses()
    }
  }

  async function markPending(id: string) {
    const res = await fetch(`${basePath}/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' }),
    })
    if (res.ok) {
      const updated = await res.json()
      if (selected?.id === id) setSelected(updated)
      fetchExpenses()
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm('Ausgabe wirklich löschen?')) return
    await fetch(`${basePath}/api/expenses/${id}`, { method: 'DELETE' })
    setSelected(null)
    fetchExpenses()
  }

  const inputClass =
    'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Filter</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={inputClass}
          >
            <option value="all">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="reimbursed">Erstattet</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={inputClass}
          >
            <option value="">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Person suchen …"
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            placeholder="Von"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            placeholder="Bis"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-400">
        {expenses.length} Einträge ·{' '}
        <span className="text-amber-400">
          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
            expenses.reduce((s, e) => s + Number(e.amountEur), 0)
          )}
        </span>{' '}
        gesamt
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Lade …</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Keine Ausgaben gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium">Datum</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Person</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Beschreibung</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Kategorie</th>
                  <th className="px-4 py-3 text-gray-400 font-medium text-right">Betrag</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                    onClick={() => openDetail(expense)}
                  >
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {formatDate(expense.purchaseDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{expense.purchasedBy}</td>
                    <td className="px-4 py-3 text-gray-200 max-w-48 truncate">{expense.itemDescription}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-32 truncate">{expense.category}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-white whitespace-nowrap">
                      {formatEur(expense.amountEur)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {expense.status === 'pending' ? (
                          <button
                            onClick={() => markReimbursed(expense.id)}
                            className="px-2 py-1 bg-green-700/50 hover:bg-green-600/60 text-green-300 rounded-lg text-xs transition-colors"
                          >
                            Erstattet
                          </button>
                        ) : (
                          <button
                            onClick={() => markPending(expense.id)}
                            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors"
                          >
                            Zurücksetzen
                          </button>
                        )}
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="px-2 py-1 bg-red-900/40 hover:bg-red-800/50 text-red-400 rounded-lg text-xs transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => { setSelected(null); setEditMode(false) }}
        >
          <div
            className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <h3 className="font-semibold text-white text-lg truncate max-w-xs">
                  {editMode ? 'Bearbeiten' : selected.itemDescription}
                </h3>
                <StatusBadge status={selected.status} />
              </div>
              <button
                onClick={() => { setSelected(null); setEditMode(false) }}
                className="text-gray-500 hover:text-gray-300 text-xl ml-4"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {!editMode ? (
                <>
                  <DetailRow label="Beschreibung" value={selected.itemDescription} />
                  <DetailRow label="Kategorie" value={selected.category} />
                  <DetailRow label="Person" value={selected.purchasedBy} />
                  <DetailRow label="Kaufdatum" value={formatDate(selected.purchaseDate)} />
                  <DetailRow label="Betrag" value={formatEur(selected.amountEur)} highlight />
                  <DetailRow
                    label="Erstattung"
                    value={selected.reimbursementMethod === 'paypal'
                      ? `PayPal: ${selected.paypalAddress || '–'}`
                      : `IBAN: ${selected.iban || '–'}`}
                  />
                  {selected.comment && <DetailRow label="Kommentar" value={selected.comment} />}
                  {selected.treasurerNote && (
                    <DetailRow label="Kassennotiz" value={selected.treasurerNote} highlight />
                  )}
                  {selected.reimbursedAt && (
                    <DetailRow label="Erstattet am" value={formatDate(selected.reimbursedAt)} />
                  )}
                  <DetailRow label="Eingereicht am" value={formatDate(selected.createdAt)} />
                </>
              ) : (
                <>
                  <EditField
                    label="Beschreibung"
                    value={editForm.itemDescription || ''}
                    onChange={(v) => setEditForm({ ...editForm, itemDescription: v })}
                  />
                  <EditField
                    label="Person"
                    value={editForm.purchasedBy || ''}
                    onChange={(v) => setEditForm({ ...editForm, purchasedBy: v })}
                  />
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Kategorie</label>
                    <select
                      value={editForm.category || ''}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <EditField
                    label="Kaufdatum"
                    value={editForm.purchaseDate ? editForm.purchaseDate.split('T')[0] : ''}
                    onChange={(v) => setEditForm({ ...editForm, purchaseDate: v })}
                    type="date"
                  />
                  <EditField
                    label="Betrag (EUR)"
                    value={String(editForm.amountEur || '')}
                    onChange={(v) => setEditForm({ ...editForm, amountEur: v as unknown as number })}
                    type="number"
                  />
                  <EditField
                    label="Kassennotiz (intern)"
                    value={editForm.treasurerNote || ''}
                    onChange={(v) => setEditForm({ ...editForm, treasurerNote: v })}
                    multiline
                  />
                  <EditField
                    label="Kommentar"
                    value={editForm.comment || ''}
                    onChange={(v) => setEditForm({ ...editForm, comment: v })}
                    multiline
                  />
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-gray-800 flex flex-wrap gap-2">
              {!editMode ? (
                <>
                  <button
                    onClick={startEdit}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition-colors"
                  >
                    Bearbeiten
                  </button>
                  {selected.status === 'pending' ? (
                    <button
                      onClick={() => markReimbursed(selected.id)}
                      className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-sm transition-colors"
                    >
                      Als erstattet markieren
                    </button>
                  ) : (
                    <button
                      onClick={() => markPending(selected.id)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition-colors"
                    >
                      Auf ausstehend zurücksetzen
                    </button>
                  )}
                  <button
                    onClick={() => deleteExpense(selected.id)}
                    className="px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-300 rounded-xl text-sm transition-colors ml-auto"
                  >
                    Löschen
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-xl text-sm transition-colors"
                  >
                    {saving ? 'Speichern …' : 'Speichern'}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition-colors"
                  >
                    Abbrechen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
      <span className="text-xs text-gray-500 sm:w-32 sm:text-right shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm ${highlight ? 'text-amber-400 font-medium' : 'text-gray-200'}`}>
        {value || '–'}
      </span>
    </div>
  )
}

function EditField({
  label, value, onChange, type = 'text', multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  multiline?: boolean
}) {
  const cls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500'
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls + ' resize-none'} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  )
}
