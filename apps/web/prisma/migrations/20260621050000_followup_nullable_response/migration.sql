-- AlterTable: make response nullable and add answered_at to project_log_followups
ALTER TABLE "project_log_followups" ALTER COLUMN "response" DROP NOT NULL;
ALTER TABLE "project_log_followups" ADD COLUMN "answered_at" TIMESTAMP(3);
