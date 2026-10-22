-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "assignedTechnician" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "site" TEXT NOT NULL DEFAULT '';
