-- CreateEnum
CREATE TYPE "class_join_request_status" AS ENUM ('pending', 'approved', 'denied');

-- CreateTable
CREATE TABLE "class_join_requests" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "class_join_request_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by_user_id" TEXT,

    CONSTRAINT "class_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_join_requests_class_id_status_idx" ON "class_join_requests"("class_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "class_join_requests_class_id_user_id_key" ON "class_join_requests"("class_id", "user_id");

-- AddForeignKey
ALTER TABLE "class_join_requests" ADD CONSTRAINT "class_join_requests_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_join_requests" ADD CONSTRAINT "class_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

