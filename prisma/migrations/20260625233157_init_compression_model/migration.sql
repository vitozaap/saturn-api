-- CreateEnum
CREATE TYPE "CompressionStatus" AS ENUM ('PENDING_UPLOAD', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "compression" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "CompressionStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "contentType" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceSize" BIGINT,
    "outputKey" TEXT,
    "outputSize" BIGINT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "compression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compression_sourceKey_key" ON "compression"("sourceKey");

-- CreateIndex
CREATE INDEX "compression_userId_status_idx" ON "compression"("userId", "status");

-- CreateIndex
CREATE INDEX "compression_status_idx" ON "compression"("status");

-- AddForeignKey
ALTER TABLE "compression" ADD CONSTRAINT "compression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
