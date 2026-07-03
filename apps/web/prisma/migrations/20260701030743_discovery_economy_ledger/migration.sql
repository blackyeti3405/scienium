-- CreateTable
CREATE TABLE "discovery_source_visits" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kp_awarded" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_source_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_kp_days" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kp_total" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_kp_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_topic_bonus" (
    "team_id" TEXT NOT NULL,
    "kp_awarded" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_topic_bonus_pkey" PRIMARY KEY ("team_id")
);

-- CreateIndex
CREATE INDEX "discovery_source_visits_team_id_created_at_idx" ON "discovery_source_visits"("team_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_source_visits_team_id_node_id_key" ON "discovery_source_visits"("team_id", "node_id");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_kp_days_team_id_day_key" ON "discovery_kp_days"("team_id", "day");

-- CreateIndex
CREATE INDEX "topic_interests_team_id_idx" ON "topic_interests"("team_id");

-- CreateIndex
CREATE INDEX "topic_interests_created_by_user_id_idx" ON "topic_interests"("created_by_user_id");

-- AddForeignKey
ALTER TABLE "discovery_source_visits" ADD CONSTRAINT "discovery_source_visits_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_kp_days" ADD CONSTRAINT "discovery_kp_days_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_topic_bonus" ADD CONSTRAINT "discovery_topic_bonus_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
