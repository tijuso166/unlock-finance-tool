'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface NavBarProps {
  role: 'member' | 'treasurer'
}

export default function NavBar({ role }: NavBarProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/finanzen'

  async function handleLogout() {
    setLoggingOut(true)
    await fetch(`${basePath}/api/auth/logout`, { method: 'POST' })
    window.location.href = `${basePath}/login`
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-white">
            <span className="text-xl">🎪</span>
            <span className="hidden sm:block text-sm">Festival Finance</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Übersicht
            </Link>
            <Link
              href="/ausgabe-einreichen"
              className="px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Ausgabe
            </Link>
            <Link
              href="/einnahme-einreichen"
              className="px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Einnahme
            </Link>
            <Link
              href="/liste"
              className="px-3 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Liste
            </Link>
            {role === 'treasurer' && (
              <Link
                href="/verwaltung"
                className="px-3 py-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-gray-800 transition-colors font-medium"
              >
                Verwaltung
              </Link>
            )}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="ml-2 px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors text-xs"
            >
              {loggingOut ? '…' : 'Abmelden'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
