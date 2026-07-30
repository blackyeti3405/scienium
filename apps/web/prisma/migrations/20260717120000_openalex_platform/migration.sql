-- Third source platform for Discovery papers: works with neither an arXiv id
-- nor a PMID (open-access journal articles, non-arXiv preprint servers such as
-- bioRxiv/medRxiv/PsyArXiv), keyed by their OpenAlex work id. Additive only.
ALTER TYPE "external_platform" ADD VALUE IF NOT EXISTS 'openalex';
