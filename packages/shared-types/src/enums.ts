export type LabType =
  | 'biocore'
  | 'chemworks'
  | 'volt_lab'
  | 'terrabase'
  | 'mindframe'
  | 'axiom'

export type ProjectPhase =
  | 'discovery'
  | 'literature_review'
  | 'working'
  | 'showcase'

// PvP-raid spell type; cycle: empirical > theoretical > applied > empirical (spec §11.4)
export type SpellType = 'empirical' | 'theoretical' | 'applied'

export type BuildingRole = 'starter' | 'standard' | 'premium'

export type UserRole = 'student' | 'teacher' | 'admin'

export type ProjectLogEntryType = 'progress' | 'failure'

export type PrivacyLevel = 'public' | 'school_only' | 'link_only' | 'private'
