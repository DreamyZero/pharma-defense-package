-- AlterTable
ALTER TABLE "drugs" ADD COLUMN IF NOT EXISTS "pharmacologicalGroup" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "drug_indications" (
    "id" SERIAL NOT NULL,
    "drugId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_indications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "drug_indications_drugId_idx" ON "drug_indications"("drugId");
CREATE INDEX IF NOT EXISTS "drug_indications_name_idx" ON "drug_indications"("name");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "drug_indications" ADD CONSTRAINT "drug_indications_drugId_fkey"
    FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
