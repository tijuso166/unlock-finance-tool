'use client'

import { useState } from 'react'

type Role = 'member' | 'treasurer'

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRole) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${basePath}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, password }),
      })

      if (res.ok) {
        window.location.href = `${basePath}/dashboard`
      } else {
        const data = await res.json()
        setError(data.error || 'Falsches Passwort. Bitte erneut versuchen.')
      }
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">🎪</div>
        <h1 className="text-3xl font-bold text-white mb-1">Festival Finance</h1>
        <p className="text-gray-400 text-sm">unlock.family · Festivaljahr {new Date().getFullYear()}</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-800">
          <h2 className="text-lg font-semibold text-gray-200 mb-5">Anmelden</h2>

          {/* Role Selection */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-400 mb-3">Ich bin …</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('member')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  selectedRole === 'member'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">🎭</span>
                <span className="text-sm font-medium">Mitglied</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('treasurer')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  selectedRole === 'treasurer'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">🏦</span>
                <span className="text-sm font-medium">Kassenwart</span>
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="mb-5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!selectedRole || !password || loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            {loading ? 'Wird angemeldet …' : 'Anmelden'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Festival Finance · unlock e.V. · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
