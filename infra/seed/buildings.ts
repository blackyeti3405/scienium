// spellType is the PvP-raid spell type each building grants (spec §9.3 / §11).
// Cycle: empirical > theoretical > applied > empirical.
export const BUILDINGS = [
  // BioCore
  { labType: 'biocore', name: 'Greenhouse', role: 'starter', description: 'Cultivate and observe plant specimens', spellType: 'empirical' },
  { labType: 'biocore', name: 'Specimen Vault', role: 'standard', description: 'Curate and classify biological samples', spellType: 'empirical' },
  { labType: 'biocore', name: 'Microscopy Suite', role: 'standard', description: 'Visualize cells and microorganisms', spellType: 'empirical' },
  { labType: 'biocore', name: 'Incubation Chamber', role: 'standard', description: 'Grow cultures under controlled conditions', spellType: 'theoretical' },
  { labType: 'biocore', name: 'Wet Lab', role: 'standard', description: 'Conduct biological assays', spellType: 'applied' },
  { labType: 'biocore', name: 'Field Station', role: 'standard', description: 'Collect ecological data from the field', spellType: 'theoretical' },
  { labType: 'biocore', name: 'Aquatic Habitat', role: 'standard', description: 'Study aquatic ecosystems', spellType: 'empirical' },
  { labType: 'biocore', name: 'Genetics Sequencing Lab', role: 'standard', description: 'Sequence and align DNA samples', spellType: 'theoretical' },
  { labType: 'biocore', name: 'Behavioral Observation Room', role: 'standard', description: 'Track and analyze animal behavior', spellType: 'theoretical' },
  { labType: 'biocore', name: 'Bioinformatics Suite', role: 'premium', description: 'Analyze genomic data at scale', spellType: 'applied' },

  // ChemWorks
  { labType: 'chemworks', name: 'Fume Hood Bench', role: 'starter', description: 'Safe baseline workspace for reactions', spellType: 'applied' },
  { labType: 'chemworks', name: 'Reaction Synthesis Lab', role: 'standard', description: 'Run controlled chemical syntheses', spellType: 'theoretical' },
  { labType: 'chemworks', name: 'Spectroscopy Suite', role: 'standard', description: 'Identify compounds by spectral signatures', spellType: 'empirical' },
  { labType: 'chemworks', name: 'Materials Testing Bay', role: 'standard', description: 'Measure mechanical and chemical properties', spellType: 'empirical' },
  { labType: 'chemworks', name: 'Crystallography Room', role: 'standard', description: 'Determine molecular structures', spellType: 'theoretical' },
  { labType: 'chemworks', name: 'Distillation Tower', role: 'standard', description: 'Separate and purify mixtures', spellType: 'applied' },
  { labType: 'chemworks', name: 'Catalysis Lab', role: 'standard', description: 'Study reaction acceleration', spellType: 'applied' },
  { labType: 'chemworks', name: 'Polymer Workshop', role: 'standard', description: 'Synthesize and test polymers', spellType: 'applied' },
  { labType: 'chemworks', name: 'Computational Chemistry Hub', role: 'standard', description: 'Simulate molecules in silico', spellType: 'theoretical' },
  { labType: 'chemworks', name: 'Cleanroom Synthesizer', role: 'premium', description: 'Precision synthesis under contamination control', spellType: 'applied' },

  // Volt Lab
  { labType: 'volt_lab', name: 'Workshop', role: 'starter', description: 'Default workbench for general builds', spellType: 'applied' },
  { labType: 'volt_lab', name: 'CNC Mill Shop', role: 'standard', description: 'Precision subtractive fabrication', spellType: 'applied' },
  { labType: 'volt_lab', name: '3D Printing Shop', role: 'standard', description: 'Additive prototyping', spellType: 'applied' },
  { labType: 'volt_lab', name: 'PCB Fab', role: 'standard', description: 'Design and produce circuit boards', spellType: 'applied' },
  { labType: 'volt_lab', name: 'Robotics Bay', role: 'standard', description: 'Integrate sensors, actuators, control', spellType: 'applied' },
  { labType: 'volt_lab', name: 'Electronics Bench', role: 'standard', description: 'Build and debug analog/digital circuits', spellType: 'empirical' },
  { labType: 'volt_lab', name: 'Mechanical Testing Rig', role: 'standard', description: 'Stress, fatigue, and load testing', spellType: 'theoretical' },
  { labType: 'volt_lab', name: 'Welding & Fabrication', role: 'standard', description: 'Metalwork and structural assembly', spellType: 'applied' },
  { labType: 'volt_lab', name: 'Embedded Systems Lab', role: 'standard', description: 'Microcontroller-based projects', spellType: 'applied' },
  { labType: 'volt_lab', name: 'AI Incubator', role: 'premium', description: 'Develop ML-driven engineering systems', spellType: 'applied' },

  // TerraBase
  { labType: 'terrabase', name: 'Sampling Station', role: 'starter', description: 'Collect and catalog field samples', spellType: 'empirical' },
  { labType: 'terrabase', name: 'Seismograph Array', role: 'standard', description: 'Monitor seismic activity', spellType: 'theoretical' },
  { labType: 'terrabase', name: 'Weather Monitoring Post', role: 'standard', description: 'Record and analyze atmospheric data', spellType: 'theoretical' },
  { labType: 'terrabase', name: 'Geological Core Lab', role: 'standard', description: 'Analyze sediment and rock cores', spellType: 'empirical' },
  { labType: 'terrabase', name: 'Hydrology Bay', role: 'standard', description: 'Study water systems and flow', spellType: 'empirical' },
  { labType: 'terrabase', name: 'Atmospheric Sensor Array', role: 'standard', description: 'Track atmospheric chemistry', spellType: 'theoretical' },
  { labType: 'terrabase', name: 'Soil Analysis Lab', role: 'standard', description: 'Characterize soil composition', spellType: 'empirical' },
  { labType: 'terrabase', name: 'Remote Sensing Hub', role: 'standard', description: 'Interpret satellite and aerial data', spellType: 'theoretical' },
  { labType: 'terrabase', name: 'Climate Modeling Station', role: 'standard', description: 'Run simulations of Earth systems', spellType: 'applied' },
  { labType: 'terrabase', name: 'Deep Earth Observatory', role: 'premium', description: 'Probe planetary-scale processes', spellType: 'theoretical' },

  // MindFrame
  { labType: 'mindframe', name: 'Interview Room', role: 'starter', description: 'Conduct structured interviews', spellType: 'empirical' },
  { labType: 'mindframe', name: 'Survey Distribution Center', role: 'standard', description: 'Design and field surveys', spellType: 'empirical' },
  { labType: 'mindframe', name: 'Behavioral Lab', role: 'standard', description: 'Run controlled behavioral experiments', spellType: 'theoretical' },
  { labType: 'mindframe', name: 'Eye Tracking Suite', role: 'standard', description: 'Measure attention and gaze', spellType: 'theoretical' },
  { labType: 'mindframe', name: 'Statistical Analysis Hub', role: 'standard', description: 'Choose and run the right test', spellType: 'empirical' },
  { labType: 'mindframe', name: 'Focus Group Chamber', role: 'standard', description: 'Run group-based qualitative studies', spellType: 'empirical' },
  { labType: 'mindframe', name: 'Longitudinal Study Wing', role: 'standard', description: 'Track participants over time', spellType: 'applied' },
  { labType: 'mindframe', name: 'EEG/Biofeedback Room', role: 'standard', description: 'Measure physiological response', spellType: 'theoretical' },
  { labType: 'mindframe', name: 'Data Visualization Studio', role: 'standard', description: 'Communicate findings visually', spellType: 'applied' },
  { labType: 'mindframe', name: 'Computational Social Science Lab', role: 'premium', description: 'Model social systems at scale', spellType: 'applied' },

  // Axiom
  { labType: 'axiom', name: 'Chalkboard Room', role: 'starter', description: 'Foundational derivations and proofs', spellType: 'theoretical' },
  { labType: 'axiom', name: 'Computation Cluster', role: 'standard', description: 'Numerical simulations', spellType: 'applied' },
  { labType: 'axiom', name: 'Particle Physics Bench', role: 'standard', description: 'Tabletop physics experiments', spellType: 'empirical' },
  { labType: 'axiom', name: 'Optics Laboratory', role: 'standard', description: 'Light, lenses, interference', spellType: 'applied' },
  { labType: 'axiom', name: 'Quantum Simulation Lab', role: 'standard', description: 'Model quantum systems', spellType: 'theoretical' },
  { labType: 'axiom', name: 'Mathematical Modeling Suite', role: 'standard', description: 'Build models of real phenomena', spellType: 'applied' },
  { labType: 'axiom', name: 'Observatory Dome', role: 'standard', description: 'Observe and classify celestial objects', spellType: 'empirical' },
  { labType: 'axiom', name: 'Theoretical Physics Annex', role: 'standard', description: 'Symbolic reasoning and derivations', spellType: 'theoretical' },
  { labType: 'axiom', name: 'Numerical Methods Hub', role: 'standard', description: 'Algorithms for scientific computing', spellType: 'applied' },
  { labType: 'axiom', name: 'Cosmology Visualization Theater', role: 'premium', description: 'Render large-scale structures of the universe', spellType: 'theoretical' },
]
