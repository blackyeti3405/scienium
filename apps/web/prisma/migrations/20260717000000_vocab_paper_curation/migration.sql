-- Once-ever vocab curation marker: one row per (user, paper) whose curation
-- call has already been paid. The build route skips marked papers so a
-- re-build never re-bills a paper (curation deliberately rejects trivial
-- candidates, so "all candidates carded" can never serve as the marker).
CREATE TABLE "vocab_paper_curations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vocab_paper_curations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vocab_paper_curations_user_id_paper_id_key" ON "vocab_paper_curations"("user_id", "paper_id");

ALTER TABLE "vocab_paper_curations" ADD CONSTRAINT "vocab_paper_curations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vocab_paper_curations" ADD CONSTRAINT "vocab_paper_curations_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
