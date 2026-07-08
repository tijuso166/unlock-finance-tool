import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  role?: 'member' | 'treasurer'
  isLoggedIn: boolean
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'festival-finance-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
