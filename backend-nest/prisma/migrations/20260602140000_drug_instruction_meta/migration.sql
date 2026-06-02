-- AlterTable
ALTER TABLE "Drug" ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT;
ALTER TABLE "Drug" ADD COLUMN IF NOT EXISTS "instructionMeta" JSONB;
