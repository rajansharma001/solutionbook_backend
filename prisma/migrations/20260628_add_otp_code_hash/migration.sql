-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN "codeHash" TEXT;

-- Update existing rows with a placeholder hash
UPDATE "OtpCode" SET "codeHash" = 'migrated_' || "code";

-- Drop the old code column
ALTER TABLE "OtpCode" DROP COLUMN "code";