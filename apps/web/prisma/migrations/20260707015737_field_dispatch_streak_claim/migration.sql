-- CreateTable
CREATE TABLE "field_dispatch_streak_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "lab_type" "lab_type" NOT NULL,
    "milestone" INTEGER NOT NULL,
    "kp_awarded" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_dispatch_streak_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_dispatch_streak_claims_user_id_milestone_key" ON "field_dispatch_streak_claims"("user_id", "milestone");

-- AddForeignKey
ALTER TABLE "field_dispatch_streak_claims" ADD CONSTRAINT "field_dispatch_streak_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_dispatch_streak_claims" ADD CONSTRAINT "field_dispatch_streak_claims_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
