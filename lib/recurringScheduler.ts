import cron from 'node-cron'
import { prisma } from './db'

const MAX_OCCURRENCES_PER_TEMPLATE = 500

// Recurring dates are always handled in UTC-midnight instants, matching how
// "YYYY-MM-DD" strings from <input type="date"> are parsed elsewhere in the
// app (new Date('2026-07-08') = UTC midnight). Keeping every date-only value
// on this same convention is what makes the due-date equality check below
// reliable enough to guarantee no duplicate is ever created.
function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addInterval(date: Date, interval: string): Date {
  const next = new Date(date)
  if (interval === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1)
  else if (interval === 'quarterly') next.setUTCMonth(next.getUTCMonth() + 3)
  else if (interval === 'yearly') next.setUTCFullYear(next.getUTCFullYear() + 1)
  return next
}

/**
 * Generates any Expense occurrences that are due but don't exist yet, for
 * every active RecurringExpense. Safe to call repeatedly (idempotent) and
 * doubles as the startup catch-up check for occurrences missed while the
 * server was offline.
 */
export async function runRecurringCheck() {
  const templates = await prisma.recurringExpense.findMany({ where: { isActive: true } })
  if (!templates.length) return

  const today = toUtcDateOnly(new Date())
  const festivalYear = parseInt(process.env.FESTIVAL_YEAR || '2025')

  for (const template of templates) {
    let occurrence = toUtcDateOnly(new Date(template.startDate))
    const end = template.endDate ? toUtcDateOnly(new Date(template.endDate)) : null
    let iterations = 0

    while (occurrence <= today && (!end || occurrence <= end) && iterations < MAX_OCCURRENCES_PER_TEMPLATE) {
      iterations++

      const existing = await prisma.expense.findFirst({
        where: { recurringExpenseId: template.id, purchaseDate: occurrence },
        select: { id: true },
      })

      if (!existing) {
        await prisma.expense.create({
          data: {
            itemDescription: template.description,
            category: template.category,
            categoryParent: template.categoryParent,
            paidTo: template.paidTo,
            purchaseDate: occurrence,
            amountEur: template.amountEur,
            reimbursementNeeded: template.reimbursementNeeded,
            iban: template.iban,
            purchasedBy: template.purchasedBy,
            comment: template.comment,
            festivalYear,
            recurringExpenseId: template.id,
            status: template.reimbursementNeeded ? 'pending' : 'paid',
          },
        })
      }

      occurrence = toUtcDateOnly(addInterval(occurrence, template.interval))
    }
  }
}

let started = false

/** Runs an immediate catch-up check, then schedules a daily recheck. */
export function startRecurringScheduler() {
  if (started) return
  started = true

  runRecurringCheck().catch((err) => console.error('Recurring-Kosten Prüfung (Start) fehlgeschlagen:', err))

  cron.schedule('0 3 * * *', () => {
    runRecurringCheck().catch((err) => console.error('Recurring-Kosten Prüfung (täglich) fehlgeschlagen:', err))
  })
}
