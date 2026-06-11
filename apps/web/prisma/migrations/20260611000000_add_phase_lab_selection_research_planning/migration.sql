-- Add lab_selection phase between discovery and literature_review
ALTER TYPE "project_phase" ADD VALUE IF NOT EXISTS 'lab_selection' BEFORE 'literature_review';

-- Add research_planning phase between literature_review and working
ALTER TYPE "project_phase" ADD VALUE IF NOT EXISTS 'research_planning' AFTER 'literature_review';
