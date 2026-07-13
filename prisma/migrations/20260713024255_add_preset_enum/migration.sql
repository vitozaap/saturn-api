-- CreateEnum
CREATE TYPE "Preset" AS ENUM ('HIGH', 'MID', 'LOW');

-- AlterTable
ALTER TABLE "compression" ADD COLUMN     "preset" "Preset" NOT NULL DEFAULT 'MID';
