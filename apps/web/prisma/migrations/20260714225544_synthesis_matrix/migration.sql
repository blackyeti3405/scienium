-- CreateTable
CREATE TABLE "synthesis_matrices" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Synthesis Matrix',
    "template_id" TEXT NOT NULL,
    "columns_json" JSONB NOT NULL,
    "paper_ids" TEXT[],
    "last_check_json" JSONB,
    "last_checked_at" TIMESTAMP(3),
    "kp_awarded" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "synthesis_matrices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synthesis_cells" (
    "matrix_id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "column_id" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "synthesis_cells_pkey" PRIMARY KEY ("matrix_id","paper_id","column_id")
);

-- CreateIndex
CREATE INDEX "synthesis_matrices_team_id_updated_at_idx" ON "synthesis_matrices"("team_id", "updated_at");

-- AddForeignKey
ALTER TABLE "synthesis_matrices" ADD CONSTRAINT "synthesis_matrices_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synthesis_matrices" ADD CONSTRAINT "synthesis_matrices_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synthesis_cells" ADD CONSTRAINT "synthesis_cells_matrix_id_fkey" FOREIGN KEY ("matrix_id") REFERENCES "synthesis_matrices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

