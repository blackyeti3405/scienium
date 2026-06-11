import type { LabType } from '@nova-lab/shared-types'

export const LAB_TYPES: { id: LabType; name: string; domain: string; scope: string }[] = [
  { id: 'biocore', name: 'BioCore', domain: 'Biology / Environmental Science', scope: 'Life sciences, ecology, genetics' },
  { id: 'chemworks', name: 'ChemWorks', domain: 'Chemistry', scope: 'Reactions, materials, formulations' },
  { id: 'volt_lab', name: 'Volt Lab', domain: 'Engineering, Electronics, Physical Systems', scope: 'Systems design, circuits, mechanical engineering' },
  { id: 'terrabase', name: 'TerraBase', domain: 'Earth Science', scope: 'Climate, geology, earth systems' },
  { id: 'mindframe', name: 'MindFrame', domain: 'Social / Cognitive Science', scope: 'Behavior, psychology, data' },
  { id: 'axiom', name: 'Axiom', domain: 'Math / Physics / Astronomy', scope: 'Pure & applied math, physics, astronomy' },
]
