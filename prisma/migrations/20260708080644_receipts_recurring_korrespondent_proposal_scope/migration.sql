-- AlterTable: CategoryProposal gains explicit scope/type (empty table, safe as NOT NULL)
ALTER TABLE "CategoryProposal" DROP COLUMN "proposedParentName",
ADD COLUMN     "categoryType" TEXT NOT NULL DEFAULT 'expense',
ADD COLUMN     "parentCategoryName" TEXT,
ADD COLUMN     "proposalScope" TEXT NOT NULL DEFAULT 'ober';
ALTER TABLE "CategoryProposal" ALTER COLUMN "categoryType" DROP DEFAULT;
ALTER TABLE "CategoryProposal" ALTER COLUMN "proposalScope" DROP DEFAULT;

-- AlterTable: Expense gains paidTo (Korrespondent) – backfill existing rows, then drop default
ALTER TABLE "Expense" ADD COLUMN     "paidTo" TEXT NOT NULL DEFAULT 'Unbekannt',
ADD COLUMN     "receiptPath" TEXT,
ADD COLUMN     "recurringExpenseId" TEXT;
ALTER TABLE "Expense" ALTER COLUMN "paidTo" DROP DEFAULT;

-- AlterTable: Income gains receivedFrom (Korrespondent) – backfill existing rows, then drop default
ALTER TABLE "Income" ADD COLUMN     "receiptPath" TEXT,
ADD COLUMN     "receivedFrom" TEXT NOT NULL DEFAULT 'Unbekannt';
ALTER TABLE "Income" ALTER COLUMN "receivedFrom" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryParent" TEXT NOT NULL,
    "amountEur" DECIMAL(10,2) NOT NULL,
    "paidTo" TEXT NOT NULL,
    "reimbursementMethod" TEXT NOT NULL,
    "paypalAddress" TEXT,
    "iban" TEXT,
    "purchasedBy" TEXT NOT NULL,
    "comment" TEXT,
    "interval" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
