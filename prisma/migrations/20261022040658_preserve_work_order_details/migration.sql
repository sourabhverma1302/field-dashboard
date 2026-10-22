/*
  Warnings:

  - A unique constraint covering the columns `[jobId]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jobId` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "assetName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "jobId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_jobId_key" ON "WorkOrder"("jobId");
