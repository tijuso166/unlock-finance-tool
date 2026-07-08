import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const incomeTree: Record<string, string[]> = {
  'Ticketverkäufe': ['Supporter', 'Standard', 'Soli'],
  'Extras': ['Poster'],
  'Getränke': ['Voucherverkauf'],
  'Zuwendungen': ['Spenden', 'Mitgliedsbeiträge'],
}

const expenseTree: Record<string, string[]> = {
  'Verein': ['Miete Lager', 'Veranstaltungsversicherung'],
  'Alte Hölle': ['Miete Venue'],
  'Verpflegung': ['Frühstück', 'Abendessen', 'Aufbauschmaus'],
  'Stages': ['Bühnenbau', 'Technik', 'Deko'],
  'Bar': ['Getränke', 'Gadgets'],
  'Programm': ['Workshop-Needs', 'Geiles Hochleitner Zeug', 'Kaffebar'],
  'Media': ['Poster', 'Timetable'],
  'Logistik': ['Sprinter', 'Sprit Transportautos', 'Leihzelt'],
}

async function seedTree(tree: Record<string, string[]>, type: string) {
  let count = 0
  for (const [oberName, unterNames] of Object.entries(tree)) {
    const ober = await prisma.category.create({ data: { name: oberName, type } })
    count++
    for (const unterName of unterNames) {
      await prisma.category.create({ data: { name: unterName, type, parentId: ober.id } })
      count++
    }
  }
  return count
}

async function main() {
  console.log('🌱 Seeding database...')

  // Categories are fully replaced on every seed run – see README "Datenbank zurücksetzen"
  await prisma.category.deleteMany({})

  const incomeCount = await seedTree(incomeTree, 'income')
  console.log(`✅ ${incomeCount} Einnahmen-Kategorien angelegt (${Object.keys(incomeTree).length} Ober-Kategorien)`)

  const expenseCount = await seedTree(expenseTree, 'expense')
  console.log(`✅ ${expenseCount} Ausgaben-Kategorien angelegt (${Object.keys(expenseTree).length} Ober-Kategorien)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
