'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

interface CategoryNode {
  id: string
  name: string
  type: string
  children: { id: string; name: string; type: string }[]
}

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024
const RECEIPT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'

export default function IncomeForm() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/finanzen'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [obers, setObers] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState('')

  const [form, setForm] = useState({
    description: '',
    categoryParent: '',
    category: '',
    categoryProposal: '',
    categoryProposalScope: 'ober' as 'ober' | 'unter',
    categoryProposalParent: '',
    categoryProposalBy: '',
    receivedFrom: '',
    incomeDate: new Date().toISOString().split('T')[0],
    amountEur: '',
    comment: '',
  })

  useEffect(() => {
    fetch(`${basePath}/api/categories?type=income&grouped=true`)
      .then((r) => r.json())
      .then(setObers)
      .catch(() => setError('Kategorien konnten nicht geladen werden.'))
  }, [basePath])

  const unterOptions = useMemo(
    () => obers.find((o) => o.name === form.categoryParent)?.children ?? [],
    [obers, form.categoryParent]
  )

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function setOberkategorie(value: string) {
    setForm((prev) => ({ ...prev, categoryParent: value, category: '' }))
  }

  function resetForm() {
    setForm({
      description: '',
      categoryParent: '',
      category: '',
      categoryProposal: '',
      categoryProposalScope: 'ober',
      categoryProposalParent: '',
      categoryProposalBy: '',
      receivedFrom: '',
      incomeDate: new Date().toISOString().split('T')[0],
      amountEur: '',
      comment: '',
    })
    setReceiptFile(null)
    setReceiptError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    setReceiptError('')
    if (!file) {
      setReceiptFile(null)
      return
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setReceiptError('Die Datei ist zu groß (maximal 10 MB).')
      setReceiptFile(null)
      e.target.value = ''
      return
    }
    setReceiptFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData()
    fd.append('description', form.description)
    fd.append('category', form.category)
    fd.append('categoryParent', form.categoryParent)
    if (form.categoryProposal.trim()) {
      fd.append('categoryProposal', form.categoryProposal.trim())
      fd.append('categoryProposalScope', form.categoryProposalScope)
      if (form.categoryProposalScope === 'unter') {
        fd.append('categoryProposalParent', form.categoryProposalParent)
      }
      if (form.categoryProposalBy.trim()) fd.append('categoryProposalBy', form.categoryProposalBy.trim())
    }
    fd.append('receivedFrom', form.receivedFrom)
    fd.append('incomeDate', form.incomeDate)
    fd.append('amountEur', form.amountEur)
    if (form.comment) fd.append('comment', form.comment)
    if (receiptFile) fd.append('receipt', receiptFile)

    try {
      const res = await fetch(`${basePath}/api/income`, {
        method: 'POST',
        body: fd,
      })

      if (res.ok) {
        setSuccess(true)
        resetForm()
        setTimeout(() => setSuccess(false), 5000)
      } else {
        const data = await res.json()
        setError(data.error || 'Fehler beim Einreichen. Bitte erneut versuchen.')
      }
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors disabled:opacity-50'
  const labelClass = 'block text-sm font-medium text-gray-400 mb-2'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {success && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-xl text-green-400">
          ✅ Einnahme erfolgreich eingetragen!
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Description */}
      <div>
        <label className={labelClass}>Beschreibung *</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="z. B. Ticketverkauf Vorverkauf Phase 1"
          required
          className={inputClass}
        />
      </div>

      {/* Category: Ober + Unter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Oberkategorie *</label>
          <select
            value={form.categoryParent}
            onChange={(e) => setOberkategorie(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Bitte auswählen …</option>
            {obers.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Unterkategorie *</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            required
            disabled={!form.categoryParent}
            className={inputClass}
          >
            <option value="">Bitte auswählen …</option>
            {unterOptions.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Proposal */}
      <div className="space-y-3 p-4 bg-gray-800/50 rounded-xl border border-gray-800">
        <div>
          <label className={labelClass}>Neue Kategorie vorschlagen (optional)</label>
          <input
            type="text"
            value={form.categoryProposal}
            onChange={(e) => set('categoryProposal', e.target.value)}
            placeholder="Name der gewünschten neuen Kategorie"
            className={inputClass}
          />
        </div>
        {form.categoryProposal.trim() && (
          <>
            <div>
              <label className={labelClass}>Art des Vorschlags</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => set('categoryProposalScope', 'ober')}
                  className={`p-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                    form.categoryProposalScope === 'ober'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  Neue Oberkategorie
                </button>
                <button
                  type="button"
                  onClick={() => set('categoryProposalScope', 'unter')}
                  className={`p-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                    form.categoryProposalScope === 'unter'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  Neue Unterkategorie
                </button>
              </div>
            </div>
            {form.categoryProposalScope === 'unter' && (
              <div>
                <label className={labelClass}>Unter welche Oberkategorie einordnen? *</label>
                <select
                  value={form.categoryProposalParent}
                  onChange={(e) => set('categoryProposalParent', e.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Bitte auswählen …</option>
                  {obers.map((o) => (
                    <option key={o.id} value={o.name}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>Dein Name (für Rückfragen)</label>
              <input
                type="text"
                value={form.categoryProposalBy}
                onChange={(e) => set('categoryProposalBy', e.target.value)}
                placeholder="Dein Name"
                className={inputClass}
              />
            </div>
          </>
        )}
        <p className="text-xs text-gray-500">
          Vorschläge werden dem Kassenwart zur Prüfung angezeigt.
        </p>
      </div>

      {/* Received From */}
      <div>
        <label className={labelClass}>Erhalten von *</label>
        <input
          type="text"
          value={form.receivedFrom}
          onChange={(e) => set('receivedFrom', e.target.value)}
          placeholder="z. B. Ticket-Käufer:in, Förderverein …"
          required
          className={inputClass}
        />
      </div>

      {/* Date + Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Datum *</label>
          <input
            type="date"
            value={form.incomeDate}
            onChange={(e) => set('incomeDate', e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Betrag (EUR) *</label>
          <input
            type="number"
            value={form.amountEur}
            onChange={(e) => set('amountEur', e.target.value)}
            placeholder="0,00"
            step="0.01"
            min="0.01"
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Receipt Upload */}
      <div>
        <label className={labelClass}>Beleg hochladen (optional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept={RECEIPT_ACCEPT}
          onChange={handleReceiptChange}
          className={inputClass + ' file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-600 file:text-white file:font-medium file:cursor-pointer cursor-pointer'}
        />
        <p className="text-xs text-gray-500 mt-1">PDF oder Bild (JPG, PNG, WebP), maximal 10 MB.</p>
        {receiptError && <p className="text-red-400 text-xs mt-1">{receiptError}</p>}
        {receiptFile && !receiptError && (
          <p className="text-xs text-gray-400 mt-1">Ausgewählt: {receiptFile.name}</p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label className={labelClass}>Kommentar (optional)</label>
        <textarea
          value={form.comment}
          onChange={(e) => set('comment', e.target.value)}
          placeholder="Zusätzliche Infos …"
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !!receiptError}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-base"
      >
        {loading ? 'Wird eingetragen …' : 'Einnahme eintragen'}
      </button>
    </form>
  )
}
