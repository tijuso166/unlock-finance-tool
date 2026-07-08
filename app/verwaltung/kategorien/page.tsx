'use client'

import { useState, useEffect, useCallback } from 'react'
import NavBar from '@/components/NavBar'
import Link from 'next/link'

interface CategoryNode {
  id: string
  name: string
  type: string
  isActive: boolean
  children: CategoryNode[]
}

interface Proposal {
  id: string
  proposedName: string
  proposalScope: 'ober' | 'unter'
  parentCategoryName: string | null
  categoryType: 'expense' | 'income'
  proposedBy: string
  createdAt: string
  status: string
}

type CategoryType = 'expense' | 'income'

interface RecurringExpense {
  id: string
  description: string
  categoryParent: string
  category: string
  amountEur: string
  interval: 'monthly' | 'quarterly' | 'yearly'
  startDate: string
  endDate: string | null
  isActive: boolean
}

const INTERVAL_LABEL: Record<RecurringExpense['interval'], string> = {
  monthly: 'monatlich',
  quarterly: 'vierteljährlich',
  yearly: 'jährlich',
}

function formatEur(amount: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(amount))
}

export default function KategorienPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/finanzen'

  const [expenseTree, setExpenseTree] = useState<CategoryNode[]>([])
  const [incomeTree, setIncomeTree] = useState<CategoryNode[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)

  // Add Oberkategorie form
  const [newOberName, setNewOberName] = useState('')
  const [newOberType, setNewOberType] = useState<CategoryType>('expense')
  const [addingOber, setAddingOber] = useState(false)
  const [oberError, setOberError] = useState('')

  // Add Unterkategorie form
  const [newUnterName, setNewUnterName] = useState('')
  const [newUnterType, setNewUnterType] = useState<CategoryType>('expense')
  const [newUnterParentId, setNewUnterParentId] = useState('')
  const [addingUnter, setAddingUnter] = useState(false)
  const [unterError, setUnterError] = useState('')

  const fetchAll = useCallback(async () => {
    const [expRes, incRes, propRes, recurringRes] = await Promise.all([
      fetch(`${basePath}/api/categories?type=expense&grouped=true&includeInactive=true`),
      fetch(`${basePath}/api/categories?type=income&grouped=true&includeInactive=true`),
      fetch(`${basePath}/api/category-proposals`),
      fetch(`${basePath}/api/recurring-expenses`),
    ])
    if (expRes.ok) setExpenseTree(await expRes.json())
    if (incRes.ok) setIncomeTree(await incRes.json())
    if (propRes.ok) setProposals(await propRes.json())
    if (recurringRes.ok) setRecurringExpenses(await recurringRes.json())
    setLoading(false)
  }, [basePath])

  useEffect(() => { fetchAll() }, [fetchAll])

  const treeForType = (type: CategoryType) => (type === 'expense' ? expenseTree : incomeTree)

  async function addOberkategorie(e: React.FormEvent) {
    e.preventDefault()
    setAddingOber(true)
    setOberError('')

    const res = await fetch(`${basePath}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newOberName, type: newOberType }),
    })

    if (res.ok) {
      setNewOberName('')
      fetchAll()
    } else {
      const data = await res.json()
      setOberError(data.error || 'Fehler beim Anlegen.')
    }
    setAddingOber(false)
  }

  async function addUnterkategorie(e: React.FormEvent) {
    e.preventDefault()
    if (!newUnterParentId) {
      setUnterError('Bitte eine Oberkategorie wählen.')
      return
    }
    setAddingUnter(true)
    setUnterError('')

    const res = await fetch(`${basePath}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUnterName, type: newUnterType, parentId: newUnterParentId }),
    })

    if (res.ok) {
      setNewUnterName('')
      fetchAll()
    } else {
      const data = await res.json()
      setUnterError(data.error || 'Fehler beim Anlegen.')
    }
    setAddingUnter(false)
  }

  async function renameCategory(id: string, name: string) {
    await fetch(`${basePath}/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    fetchAll()
  }

  async function deleteCategory(name: string, hasChildren: boolean, id: string) {
    const message = hasChildren
      ? `"${name}" und alle ihre Unterkategorien wirklich löschen?`
      : `"${name}" wirklich löschen?`
    if (!confirm(message)) return
    await fetch(`${basePath}/api/categories/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  async function reactivateCategory(id: string) {
    await fetch(`${basePath}/api/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    })
    fetchAll()
  }

  async function deactivateRecurring(id: string) {
    if (!confirm('Laufende Kosten wirklich deaktivieren? Zukünftige Ausgaben werden dann nicht mehr automatisch erzeugt.')) return
    await fetch(`${basePath}/api/recurring-expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    fetchAll()
  }

  async function handleProposal(id: string, action: 'accept' | 'decline') {
    await fetch(`${basePath}/api/category-proposals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    fetchAll()
  }

  const inputClass = 'bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500'

  return (
    <div className="min-h-screen bg-gray-950">
      <NavBar role="treasurer" />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/verwaltung" className="text-gray-500 hover:text-gray-300 transition-colors">← Zurück</Link>
          <h1 className="text-2xl font-bold text-white">Kategorien</h1>
        </div>

        {/* Recurring Expenses (laufende Kosten) */}
        {recurringExpenses.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Laufende Kosten</h2>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              {recurringExpenses.map((r, idx) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 flex-wrap ${idx < recurringExpenses.length - 1 ? 'border-b border-gray-800/50' : ''} ${!r.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm text-gray-200 font-medium">{r.description}</div>
                    <div className="text-xs text-gray-500">
                      {r.categoryParent} → {r.category} · {formatEur(r.amountEur)} · {INTERVAL_LABEL[r.interval]} · ab {new Date(r.startDate).toLocaleDateString('de-DE')}
                      {r.endDate ? ` bis ${new Date(r.endDate).toLocaleDateString('de-DE')}` : ''}
                    </div>
                  </div>
                  {r.isActive ? (
                    <button
                      onClick={() => deactivateRecurring(r.id)}
                      className="text-xs px-3 py-1 rounded-lg bg-gray-700 hover:bg-red-900/40 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      Deaktivieren
                    </button>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-lg bg-gray-800 text-gray-500 shrink-0">Inaktiv</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Proposals */}
        {proposals.length > 0 && (
          <section className="bg-amber-900/20 border border-amber-700/50 rounded-2xl p-5">
            <h2 className="font-semibold text-amber-300 mb-4 flex items-center gap-2">
              <span>🔔</span>
              {proposals.length} Kategorie-Vorschlag{proposals.length !== 1 ? 'e' : ''} von Mitgliedern
            </h2>
            <div className="space-y-3">
              {proposals.map((p) => (
                <div key={p.id} className="bg-gray-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white">{p.proposedName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.categoryType === 'expense' ? 'bg-amber-900/40 text-amber-300' : 'bg-green-900/40 text-green-300'}`}>
                        {p.categoryType === 'expense' ? 'Ausgabe' : 'Einnahme'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                        {p.proposalScope === 'ober' ? 'Oberkategorie' : 'Unterkategorie'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      von {p.proposedBy} · {new Date(p.createdAt).toLocaleDateString('de-DE')}
                    </div>
                    {p.proposalScope === 'unter' && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Unter Oberkategorie: {p.parentCategoryName || '–'}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleProposal(p.id, 'accept')}
                      className="px-3 py-1.5 bg-green-700/50 hover:bg-green-600/60 text-green-300 rounded-lg text-xs transition-colors"
                    >
                      ✓ Akzeptieren
                    </button>
                    <button
                      onClick={() => handleProposal(p.id, 'decline')}
                      className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/50 text-red-400 rounded-lg text-xs transition-colors"
                    >
                      ✗ Ablehnen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add New Oberkategorie */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="font-semibold text-white mb-4">Neue Oberkategorie anlegen</h2>
          <form onSubmit={addOberkategorie} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newOberName}
              onChange={(e) => setNewOberName(e.target.value)}
              placeholder="Name der Oberkategorie …"
              required
              className={inputClass + ' flex-1'}
            />
            <select
              value={newOberType}
              onChange={(e) => setNewOberType(e.target.value as CategoryType)}
              className={inputClass}
            >
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
            </select>
            <button
              type="submit"
              disabled={addingOber}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              {addingOber ? 'Anlegen …' : '+ Anlegen'}
            </button>
          </form>
          {oberError && <p className="text-red-400 text-sm mt-2">{oberError}</p>}
        </section>

        {/* Add New Unterkategorie */}
        <section className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="font-semibold text-white mb-4">Neue Unterkategorie anlegen</h2>
          <form onSubmit={addUnterkategorie} className="flex flex-col sm:flex-row gap-3">
            <select
              value={newUnterType}
              onChange={(e) => {
                setNewUnterType(e.target.value as CategoryType)
                setNewUnterParentId('')
              }}
              className={inputClass}
            >
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
            </select>
            <select
              value={newUnterParentId}
              onChange={(e) => setNewUnterParentId(e.target.value)}
              required
              className={inputClass}
            >
              <option value="">Oberkategorie wählen …</option>
              {treeForType(newUnterType).map((ober) => (
                <option key={ober.id} value={ober.id}>{ober.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={newUnterName}
              onChange={(e) => setNewUnterName(e.target.value)}
              placeholder="Name der Unterkategorie …"
              required
              className={inputClass + ' flex-1'}
            />
            <button
              type="submit"
              disabled={addingUnter}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              {addingUnter ? 'Anlegen …' : '+ Anlegen'}
            </button>
          </form>
          {unterError && <p className="text-red-400 text-sm mt-2">{unterError}</p>}
        </section>

        {/* Expense Categories */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Ausgaben-Kategorien</h2>
          <CategoryTree
            tree={expenseTree}
            loading={loading}
            onRename={renameCategory}
            onDelete={deleteCategory}
            onReactivate={reactivateCategory}
          />
        </section>

        {/* Income Categories */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Einnahmen-Kategorien</h2>
          <CategoryTree
            tree={incomeTree}
            loading={loading}
            onRename={renameCategory}
            onDelete={deleteCategory}
            onReactivate={reactivateCategory}
          />
        </section>
      </div>
    </div>
  )
}

function CategoryTree({
  tree,
  loading,
  onRename,
  onDelete,
  onReactivate,
}: {
  tree: CategoryNode[]
  loading: boolean
  onRename: (id: string, name: string) => void
  onDelete: (name: string, hasChildren: boolean, id: string) => void
  onReactivate: (id: string) => void
}) {
  if (loading) return <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center text-gray-500 animate-pulse">Lade …</div>
  if (!tree.length) return <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 text-center text-gray-500">Keine Kategorien.</div>

  return (
    <div className="space-y-3">
      {tree.map((ober) => (
        <div key={ober.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <CategoryRow
            category={ober}
            bold
            onRename={onRename}
            onDelete={() => onDelete(ober.name, ober.children.length > 0, ober.id)}
            onReactivate={onReactivate}
          />
          {ober.children.map((unter) => (
            <div key={unter.id} className="border-t border-gray-800/50 pl-6">
              <CategoryRow
                category={unter}
                onRename={onRename}
                onDelete={() => onDelete(unter.name, false, unter.id)}
                onReactivate={onReactivate}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function CategoryRow({
  category,
  bold,
  onRename,
  onDelete,
  onReactivate,
}: {
  category: CategoryNode
  bold?: boolean
  onRename: (id: string, name: string) => void
  onDelete: () => void
  onReactivate: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)

  function saveRename() {
    const trimmed = name.trim()
    setEditing(false)
    if (trimmed && trimmed !== category.name) onRename(category.id, trimmed)
    else setName(category.name)
  }

  return (
    <div className={`flex items-center justify-between gap-2 px-4 py-3 ${!category.isActive ? 'opacity-50' : ''}`}>
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveRename()
            if (e.key === 'Escape') { setName(category.name); setEditing(false) }
          }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm flex-1 focus:outline-none focus:border-amber-500"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`text-sm cursor-text ${bold ? 'font-semibold text-white' : 'text-gray-300'}`}
          title="Klicken zum Umbenennen"
        >
          {category.name}
        </span>
      )}
      <div className="flex items-center gap-2 shrink-0">
        {category.isActive ? (
          <button
            onClick={onDelete}
            className="text-xs px-3 py-1 rounded-lg bg-gray-700 hover:bg-red-900/40 text-gray-300 hover:text-red-400 transition-colors"
          >
            Löschen
          </button>
        ) : (
          <button
            onClick={() => onReactivate(category.id)}
            className="text-xs px-3 py-1 rounded-lg bg-green-900/30 hover:bg-green-700/40 text-green-400 transition-colors"
          >
            Aktivieren
          </button>
        )}
      </div>
    </div>
  )
}
