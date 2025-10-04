-- AlterTable
ALTER TABLE "ApprovalFlow" ADD COLUMN     "isSequential" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ApprovalFlowStep" ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT true;
