import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import type { SessionData } from '@/lib/session'
import { sessionOptions } from '@/lib/session'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { role, password } = body

  let validPassword = false
  if (role === 'member' && password === process.env.MEMBER_PASSWORD) {
    validPassword = true
  } else if (role === 'treasurer' && password === process.env.TREASURER_PASSWORD) {
    validPassword = true
  }

  if (!validPassword) {
    return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true, role })
  const session = await getIronSession<SessionData>(request, response, sessionOptions)
  session.role = role as 'member' | 'treasurer'
  session.isLoggedIn = true
  await session.save()

  return response
}
