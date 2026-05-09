/*
  Warnings:

  - The `status` column on the `drug_imports` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "InteractionSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CONTRAINDICATED');

-- AlterTable
ALTER TABLE "drug_imports" DROP COLUMN "status",
ADD COLUMN     "status" "ImportStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "drugs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dosageForm" TEXT,
    "manufacturer" TEXT,
    "atcCode" TEXT,
    "rxRequired" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substances" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "latinName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "substances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substance_synonyms" (
    "id" SERIAL NOT NULL,
    "substanceId" INTEGER NOT NULL,
    "synonym" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "substance_synonyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_substances" (
    "drugId" INTEGER NOT NULL,
    "substanceId" INTEGER NOT NULL,
    "strengthValue" DECIMAL(10,2),
    "strengthUnit" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "drug_substances_pkey" PRIMARY KEY ("drugId","substanceId")
);

-- CreateTable
CREATE TABLE "drug_analogs" (
    "id" SERIAL NOT NULL,
    "sourceDrugId" INTEGER NOT NULL,
    "targetDrugId" INTEGER NOT NULL,
    "reason" TEXT,
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_analogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_interactions" (
    "id" SERIAL NOT NULL,
    "drugAId" INTEGER NOT NULL,
    "drugBId" INTEGER NOT NULL,
    "severity" "InteractionSeverity" NOT NULL,
    "mechanism" TEXT,
    "clinicalEffect" TEXT,
    "recommendation" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drug_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substance_interactions" (
    "id" SERIAL NOT NULL,
    "substanceAId" INTEGER NOT NULL,
    "substanceBId" INTEGER NOT NULL,
    "severity" "InteractionSeverity" NOT NULL,
    "mechanism" TEXT,
    "clinicalEffect" TEXT,
    "recommendation" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "substance_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contraindications" (
    "id" SERIAL NOT NULL,
    "drugId" INTEGER NOT NULL,
    "condition" TEXT NOT NULL,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "context" TEXT,
    "severity" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contraindications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_drugs" (
    "userId" INTEGER NOT NULL,
    "drugId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_drugs_pkey" PRIMARY KEY ("userId","drugId")
);

-- CreateIndex
CREATE UNIQUE INDEX "drugs_slug_key" ON "drugs"("slug");

-- CreateIndex
CREATE INDEX "drugs_name_idx" ON "drugs"("name");

-- CreateIndex
CREATE INDEX "drugs_slug_idx" ON "drugs"("slug");

-- CreateIndex
CREATE INDEX "drugs_atcCode_idx" ON "drugs"("atcCode");

-- CreateIndex
CREATE UNIQUE INDEX "substances_name_key" ON "substances"("name");

-- CreateIndex
CREATE INDEX "substances_name_idx" ON "substances"("name");

-- CreateIndex
CREATE INDEX "substance_synonyms_synonym_idx" ON "substance_synonyms"("synonym");

-- CreateIndex
CREATE UNIQUE INDEX "substance_synonyms_substanceId_synonym_key" ON "substance_synonyms"("substanceId", "synonym");

-- CreateIndex
CREATE INDEX "drug_substances_substanceId_idx" ON "drug_substances"("substanceId");

-- CreateIndex
CREATE INDEX "drug_analogs_targetDrugId_idx" ON "drug_analogs"("targetDrugId");

-- CreateIndex
CREATE UNIQUE INDEX "drug_analogs_sourceDrugId_targetDrugId_key" ON "drug_analogs"("sourceDrugId", "targetDrugId");

-- CreateIndex
CREATE INDEX "drug_interactions_drugBId_idx" ON "drug_interactions"("drugBId");

-- CreateIndex
CREATE UNIQUE INDEX "drug_interactions_drugAId_drugBId_key" ON "drug_interactions"("drugAId", "drugBId");

-- CreateIndex
CREATE INDEX "substance_interactions_substanceBId_idx" ON "substance_interactions"("substanceBId");

-- CreateIndex
CREATE UNIQUE INDEX "substance_interactions_substanceAId_substanceBId_key" ON "substance_interactions"("substanceAId", "substanceBId");

-- CreateIndex
CREATE INDEX "contraindications_drugId_idx" ON "contraindications"("drugId");

-- CreateIndex
CREATE INDEX "contraindications_condition_idx" ON "contraindications"("condition");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "drug_imports_createdBy_idx" ON "drug_imports"("createdBy");

-- AddForeignKey
ALTER TABLE "substance_synonyms" ADD CONSTRAINT "substance_synonyms_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "substances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_substances" ADD CONSTRAINT "drug_substances_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_substances" ADD CONSTRAINT "drug_substances_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "substances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_analogs" ADD CONSTRAINT "drug_analogs_sourceDrugId_fkey" FOREIGN KEY ("sourceDrugId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_analogs" ADD CONSTRAINT "drug_analogs_targetDrugId_fkey" FOREIGN KEY ("targetDrugId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drugAId_fkey" FOREIGN KEY ("drugAId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drugBId_fkey" FOREIGN KEY ("drugBId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substance_interactions" ADD CONSTRAINT "substance_interactions_substanceAId_fkey" FOREIGN KEY ("substanceAId") REFERENCES "substances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substance_interactions" ADD CONSTRAINT "substance_interactions_substanceBId_fkey" FOREIGN KEY ("substanceBId") REFERENCES "substances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contraindications" ADD CONSTRAINT "contraindications_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_drugs" ADD CONSTRAINT "favorite_drugs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_drugs" ADD CONSTRAINT "favorite_drugs_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "drugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
