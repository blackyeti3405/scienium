-- Store PDFs in Cloudflare R2: add the object key. The legacy `pdf_data` blob
-- column is retained as a fallback until existing rows are backfilled into R2.
ALTER TABLE "papers" ADD COLUMN "pdf_key" TEXT;
