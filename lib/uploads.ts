import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

export class ReceiptUploadError extends Error {}

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PDF_TYPE = 'application/pdf'

export type ReceiptKind = 'expenses' | 'income'

/** Throws ReceiptUploadError with a German message if the file is unusable. */
export function validateReceiptFile(file: File) {
  if (file.size > MAX_SIZE_BYTES) {
    throw new ReceiptUploadError('Die Datei ist zu groß (maximal 10 MB).')
  }
  if (!IMAGE_TYPES.includes(file.type) && file.type !== PDF_TYPE) {
    throw new ReceiptUploadError('Nur PDF- oder Bilddateien (JPG, PNG, WebP) sind erlaubt.')
  }
}

/**
 * Saves an already-validated receipt to local disk under
 * uploads/receipts/{kind}/{entryId}.{ext}, compressing images to WebP.
 * Returns the path relative to the project root (what's stored in the DB).
 */
export async function saveReceiptFile(file: File, kind: ReceiptKind, entryId: string): Promise<string> {
  const isPdf = file.type === PDF_TYPE
  const ext = isPdf ? 'pdf' : 'webp'

  const dir = path.join(process.cwd(), 'uploads', 'receipts', kind)
  await fs.mkdir(dir, { recursive: true })

  const relativePath = path.join('uploads', 'receipts', kind, `${entryId}.${ext}`)
  const absolutePath = path.join(process.cwd(), relativePath)
  const buffer = Buffer.from(await file.arrayBuffer())

  if (isPdf) {
    await fs.writeFile(absolutePath, buffer)
  } else {
    await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(absolutePath)
  }

  return relativePath
}
