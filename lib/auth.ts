import { redirect } from 'next/navigation'
import { getSession } from './session'

export async function requireAuth() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    redirect('/login')
  }
  return session
}

export async function requireTreasurer() {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'treasurer') {
    redirect('/dashboard')
  }
  return session
}
