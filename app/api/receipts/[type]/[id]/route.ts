import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, id } = params
  if (type !== 'expenses' && type !== 'income') {
    return NextResponse.json({ error: 'Ungültiger Typ' }, { status: 400 })
  }

  const entry = type === 'expenses'
    ? await prisma.expense.findUnique({ where: { id }, select: { receiptPath: true } })
    : await prisma.income.findUnique({ where: { id }, select: { receiptPath: true } })

  if (!entry?.receiptPath) {
    return NextResponse.json({ error: 'Kein Beleg vorhanden' }, { status: 404 })
  }

  const absolutePath = path.join(process.cwd(), entry.receiptPath)
  let buffer: Buffer
  try {
    buffer = await fs.readFile(absolutePath)
  } catch {
    return NextResponse.json({ error: 'Beleg-Datei nicht gefunden' }, { status: 404 })
  }

  const ext = path.extname(absolutePath).slice(1)
  const contentType = ext === 'pdf' ? 'application/pdf' : 'image/webp'

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="beleg-${id}.${ext}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
