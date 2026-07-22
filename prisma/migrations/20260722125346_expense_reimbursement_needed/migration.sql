-- AlterTable: Expense drops PayPal reimbursement method in favor of a plain
-- Ja/Nein toggle. Existing rows predate the toggle and were all submitted
-- back when reimbursement was always required, so backfill them to true
-- rather than guessing at their historical status.
ALTER TABLE "Expense" DROP COLUMN "paypalAddress",
DROP COLUMN "reimbursementMethod",
ADD COLUMN     "reimbursementNeeded" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Expense" ALTER COLUMN "reimbursementNeeded" DROP DEFAULT;

-- AlterTable: RecurringExpense templates mirror the same change so
-- materialized occurrences (lib/recurringScheduler.ts) stay consistent.
ALTER TABLE "RecurringExpense" DROP COLUMN "paypalAddress",
DROP COLUMN "reimbursementMethod",
ADD COLUMN     "reimbursementNeeded" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RecurringExpense" ALTER COLUMN "reimbursementNeeded" DROP DEFAULT;
