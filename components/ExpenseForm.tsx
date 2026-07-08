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

export default function ExpenseForm() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/finanzen'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [obers, setObers] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState('')

  const [form, setForm] = useState({
    itemDescription: '',
    categoryParent: '',
    category: '',
    categoryProposal: '',
    categoryProposalScope: 'ober' as 'ober' | 'unter',
    categoryProposalParent: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    amountEur: '',
    reimbursementMethod: 'paypal' as 'paypal' | 'iban',
    paypalAddress: '',
    iban: '',
    purchasedBy: '',
    paidTo: '',
    comment: '',
    isRecurring: false,
    interval: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })

  useEffect(() => {
    fetch(`${basePath}/api/categories?type=expense&grouped=true`)
      .then((r) => r.json())
      .then(setObers)
      .catch(() => setError('Kategorien konnten nicht geladen werden.'))
  }, [basePath])

  const unterOptions = useMemo(
    () => obers.find((o) => o.name === form.categoryParent)?.children ?? [],
    [obers, form.categoryParent]
  )

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function setOberkategorie(value: string) {
    setForm((prev) => ({ ...prev, categoryParent: value, category: '' }))
  }

  function resetForm() {
    setForm({
      itemDescription: '',
      categoryParent: '',
      category: '',
      categoryProposal: '',
      categoryProposalScope: 'ober',
      categoryProposalParent: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      amountEur: '',
      reimbursementMethod: 'paypal',
      paypalAddress: '',
      iban: '',
      purchasedBy: '',
      paidTo: '',
      comment: '',
      isRecurring: false,
      interval: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
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
    fd.append('itemDescription', form.itemDescription)
    fd.append('category', form.category)
    fd.append('categoryParent', form.categoryParent)
    if (form.categoryProposal.trim()) {
      fd.append('categoryProposal', form.categoryProposal.trim())
      fd.append('categoryProposalScope', form.categoryProposalScope)
      if (form.categoryProposalScope === 'unter') {
        fd.append('categoryProposalParent', form.categoryProposalParent)
      }
    }
    fd.append('amountEur', form.amountEur)
    fd.append('reimbursementMethod', form.reimbursementMethod)
    if (form.reimbursementMethod === 'paypal') fd.append('paypalAddress', form.paypalAddress)
    else fd.append('iban', form.iban)
    fd.append('purchasedBy', form.purchasedBy)
    fd.append('paidTo', form.paidTo)
    if (form.comment) fd.append('comment', form.comment)
    fd.append('isRecurring', String(form.isRecurring))
    if (form.isRecurring) {
      fd.append('interval', form.interval)
      fd.append('startDate', form.startDate)
      if (form.endDate) fd.append('endDate', form.endDate)
    } else {
      fd.append('purchaseDate', form.purchaseDate)
    }
    if (receiptFile) fd.append('receipt', receiptFile)

    try {
      const res = await fetch(`${basePath}/api/expenses`, {
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
          ✅ {form.isRecurring ? 'Laufende Kosten erfolgreich angelegt!' : 'Ausgabe erfolgreich eingereicht!'}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Description */}
      <div>
        <label className={labelClass}>Was wurde gekauft? *</label>
        <input
          type="text"
          value={form.itemDescription}
          onChange={(e) => set('itemDescription', e.target.value)}
          placeholder="z. B. Verlängerungskabel, 3× 10m"
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
          </>
        )}
        <p className="text-xs text-gray-500">
          Vorschläge werden dem Kassenwart zur Prüfung angezeigt.
        </p>
      </div>

      {/* Recurring toggle */}
      <label className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-xl border border-gray-800 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isRecurring}
          onChange={(e) => set('isRecurring', e.target.checked)}
          className="mt-1 w-4 h-4 accent-amber-500"
        />
        <span className="text-sm text-gray-300">
          Laufende Kosten
        </span>
      </label>

      {/* Date OR recurring fields */}
      {form.isRecurring ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Intervall *</label>
            <select
              value={form.interval}
              onChange={(e) => set('interval', e.target.value)}
              required
              className={inputClass}
            >
              <option value="monthly">Monatlich</option>
              <option value="quarterly">Vierteljährlich</option>
              <option value="yearly">Jährlich</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Startdatum *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Enddatum (optional)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className={labelClass}>Kaufdatum *</label>
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => set('purchaseDate', e.target.value)}
            required
            className={inputClass}
          />
        </div>
      )}

      {/* Amount */}
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

      {/* Reimbursement Method */}
      <div>
        <label className={labelClass}>Erstattungsmethode *</label>
        <div className="grid grid-cols-2 gap-3">
          {(['paypal', 'iban'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => set('reimbursementMethod', method)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                form.reimbursementMethod === method
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
              }`}
            >
              {method === 'paypal' ? '💳 PayPal' : '🏦 IBAN'}
            </button>
          ))}
        </div>
      </div>

      {/* PayPal / IBAN conditional */}
      {form.reimbursementMethod === 'paypal' && (
        <div>
          <label className={labelClass}>PayPal-Adresse *</label>
          <input
            type="text"
            value={form.paypalAddress}
            onChange={(e) => set('paypalAddress', e.target.value)}
            placeholder="name@beispiel.de"
            required
            className={inputClass}
          />
        </div>
      )}
      {form.reimbursementMethod === 'iban' && (
        <div>
          <label className={labelClass}>IBAN *</label>
          <input
            type="text"
            value={form.iban}
            onChange={(e) => set('iban', e.target.value.toUpperCase())}
            placeholder="DE00 0000 0000 0000 0000 00"
            required
            className={inputClass}
          />
        </div>
      )}

      {/* Purchased By + Paid To */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Eingereicht von (Name) *</label>
          <input
            type="text"
            value={form.purchasedBy}
            onChange={(e) => set('purchasedBy', e.target.value)}
            placeholder="Dein Name"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Gezahlt an *</label>
          <input
            type="text"
            value={form.paidTo}
            onChange={(e) => set('paidTo', e.target.value)}
            placeholder="z. B. Baumarkt Meyer"
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
          className={inputClass + ' file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-gray-950 file:font-medium file:cursor-pointer cursor-pointer'}
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
          placeholder="Zusätzliche Infos, Kontext, Belegnummer …"
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !!receiptError}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-semibold py-3 px-4 rounded-xl transition-colors text-base"
      >
        {loading
          ? 'Wird eingereicht …'
          : form.isRecurring
            ? 'Laufende Kosten anlegen'
            : 'Ausgabe einreichen'}
      </button>
    </form>
  )
}
