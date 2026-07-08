// Plain JS seed for Docker production (no ts-node needed)
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const incomeTree = {
  'Ticketverkäufe': ['Supporter', 'Standard', 'Soli'],
  'Extras': ['Poster'],
  'Getränke': ['Voucherverkauf'],
  'Zuwendungen': ['Spenden', 'Mitgliedsbeiträge'],
}

const expenseTree = {
  'Verein': ['Miete Lager', 'Veranstaltungsversicherung'],
  'Alte Hölle': ['Miete Venue'],
  'Verpflegung': ['Frühstück', 'Abendessen', 'Aufbauschmaus'],
  'Stages': ['Bühnenbau', 'Technik', 'Deko'],
  'Bar': ['Getränke', 'Gadgets'],
  'Programm': ['Workshop-Needs', 'Geiles Hochleitner Zeug', 'Kaffebar'],
  'Media': ['Poster', 'Timetable'],
  'Logistik': ['Sprinter', 'Sprit Transportautos', 'Leihzelt'],
}

async function seedTree(tree, type) {
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
  console.log('🌱 Seeding categories (full replace – safe to run repeatedly)...')

  await prisma.category.deleteMany({})

  const incomeCount = await seedTree(incomeTree, 'income')
  const expenseCount = await seedTree(expenseTree, 'expense')

  console.log(`✅ Seeded ${incomeCount + expenseCount} categories`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e.message)
    // Don't exit with error – missing categories is not fatal
  })
  .finally(() => prisma.$disconnect())
