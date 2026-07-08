-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "CategoryProposal" ADD COLUMN     "proposedParentName" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "categoryParent" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "categoryParent" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_key" ON "Category"("name", "type");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
