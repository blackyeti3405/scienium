-- New credibility tier for plain-language explainer sources (MedlinePlus/NIH):
-- authoritative background reading, distinct from citable primary research.
-- Additive only.
ALTER TYPE "credibility_tier" ADD VALUE IF NOT EXISTS 'reference';
