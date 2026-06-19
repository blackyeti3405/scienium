/**
 * ISEF category list (Feature 3c).
 *
 * The 22 Regeneron ISEF 2026 competition categories. Static — these rarely
 * change and need no per-team state, so no DB seeding is used.
 */

export interface IsefCategory {
  code: string
  name: string
  description: string
  exampleTopics: string[]
}

export const ISEF_CATEGORIES: IsefCategory[] = [
  {
    code: 'ANIM',
    name: 'Animal Sciences',
    description:
      'Studies of non-human animals — behavior, ecology, physiology, genetics, and conservation.',
    exampleTopics: [
      'Insect learning and memory',
      'Fish habitat preferences',
      'Effects of pesticides on bee colonies',
      'Wildlife population estimation',
    ],
  },
  {
    code: 'BEHA',
    name: 'Behavioral & Social Sciences',
    description:
      'Human and animal cognition, perception, emotion, social interaction, and decision-making.',
    exampleTopics: [
      'Social media and adolescent anxiety',
      'Effect of music on focus',
      'Color perception and memory recall',
      'Crowd behavior modeling',
    ],
  },
  {
    code: 'BCHM',
    name: 'Biochemistry',
    description:
      'Chemical processes and molecules within living organisms — enzymes, proteins, metabolism, and molecular pathways.',
    exampleTopics: [
      'Enzyme kinetics of amylase',
      'Protein folding prediction',
      'Effect of pH on enzyme activity',
      'Plant secondary metabolites',
    ],
  },
  {
    code: 'BMED',
    name: 'Biomedical & Health Sciences',
    description:
      'Human health, disease diagnosis, treatment, epidemiology, and public-health interventions.',
    exampleTopics: [
      'Novel cancer biomarker detection',
      'Antibiotic resistance patterns',
      'Machine learning for disease screening',
      'Nutrition and cognitive function',
    ],
  },
  {
    code: 'BENG',
    name: 'Biomedical Engineering',
    description:
      'Engineering solutions to medical and biological problems — devices, prosthetics, diagnostics, and drug delivery.',
    exampleTopics: [
      'Low-cost prosthetic hand design',
      'Biodegradable drug-delivery scaffold',
      'Point-of-care diagnostic sensor',
      'Wearable blood-glucose monitor',
    ],
  },
  {
    code: 'CELL',
    name: 'Cellular & Molecular Biology',
    description:
      'Cell structure, organelle function, gene expression, molecular genetics, and intracellular signaling.',
    exampleTopics: [
      'CRISPR gene editing in bacteria',
      'Apoptosis pathways in cancer cells',
      'Effect of temperature on cell membrane permeability',
      'siRNA knockdown efficiency',
    ],
  },
  {
    code: 'CHEM',
    name: 'Chemistry',
    description:
      'Properties, composition, reactions, and synthesis of substances — from materials to atmospheric chemistry.',
    exampleTopics: [
      'Green synthesis of nanoparticles',
      'Photocatalytic water purification',
      'Polymer degradation rates',
      'Heavy-metal adsorption by biochar',
    ],
  },
  {
    code: 'CBIO',
    name: 'Computational Biology & Bioinformatics',
    description:
      'Algorithms, machine learning, and statistical models applied to biological data — genomics, proteomics, and systems biology.',
    exampleTopics: [
      'Genome-wide association study pipeline',
      'Protein-structure prediction with ML',
      'Drug-target interaction network analysis',
      'Single-cell RNA-seq clustering',
    ],
  },
  {
    code: 'EAEV',
    name: 'Earth & Environmental Sciences',
    description:
      'Geology, meteorology, oceanography, climate, and environmental monitoring.',
    exampleTopics: [
      'Microplastic distribution in local waterways',
      'Soil carbon sequestration',
      'Urban heat-island measurement',
      'Air-quality index and health outcomes',
    ],
  },
  {
    code: 'EBED',
    name: 'Embedded Systems',
    description:
      'Hardware-software co-design for dedicated real-time applications — sensors, actuators, and IoT devices.',
    exampleTopics: [
      'Smart irrigation controller',
      'Wearable fall-detection device',
      'Low-power environmental sensor node',
      'FPGA-based image classifier',
    ],
  },
  {
    code: 'EGCH',
    name: 'Energy: Chemical',
    description:
      'Chemical energy storage and conversion — batteries, fuel cells, biofuels, and electrochemical systems.',
    exampleTopics: [
      'Microbial fuel cell optimization',
      'Solid-state electrolyte for Li-ion batteries',
      'Algae-based biodiesel production',
      'Hydrogen evolution by photocatalysis',
    ],
  },
  {
    code: 'EGPH',
    name: 'Energy: Physical',
    description:
      'Mechanical, thermal, nuclear, and electromagnetic energy generation, conversion, and storage.',
    exampleTopics: [
      'Triboelectric nanogenerator for harvesting vibration',
      'Thermoelectric waste-heat recovery',
      'Concentrating solar collector design',
      'Flywheel energy storage optimization',
    ],
  },
  {
    code: 'ENMC',
    name: 'Engineering Mechanics',
    description:
      'Structural, fluid, and solid mechanics applied to engineering design — materials testing, dynamics, and system optimization.',
    exampleTopics: [
      'Aerodynamic drag reduction on cyclists',
      'Structural optimization with finite-element analysis',
      'Passive vibration damping for bridges',
      'Origami-inspired deployable structures',
    ],
  },
  {
    code: 'ENEV',
    name: 'Environmental Engineering',
    description:
      'Engineering solutions to environmental problems — water treatment, waste management, pollution remediation, and sustainable systems.',
    exampleTopics: [
      'Low-cost arsenic removal filter',
      'Biofilm reactor for wastewater treatment',
      'Constructed wetland for nutrient removal',
      'Plastic pyrolysis for fuel recovery',
    ],
  },
  {
    code: 'MATS',
    name: 'Materials Science',
    description:
      'Structure, properties, processing, and performance of materials — metals, ceramics, polymers, composites, and nanomaterials.',
    exampleTopics: [
      'Self-healing hydrogels',
      'Graphene-reinforced composite tensile strength',
      'Biodegradable packaging from agricultural waste',
      'Shape-memory alloy actuators',
    ],
  },
  {
    code: 'MATH',
    name: 'Mathematics',
    description:
      'Pure and applied mathematics — number theory, combinatorics, topology, algorithms, and mathematical modeling.',
    exampleTopics: [
      'Graph coloring algorithms',
      'Chaos and fractal geometry',
      'Optimization of traffic-signal timing',
      'Cryptographic hash-function analysis',
    ],
  },
  {
    code: 'MICR',
    name: 'Microbiology',
    description:
      'Bacteria, fungi, viruses, and other microorganisms — growth, pathogenicity, genetics, and applications.',
    exampleTopics: [
      'Bacteriophage therapy for antibiotic-resistant infections',
      'Probiotic effects on gut microbiome diversity',
      'Mycorrhizal fungi and plant growth',
      'Biosensor using engineered E. coli',
    ],
  },
  {
    code: 'PHYS',
    name: 'Physics & Astronomy',
    description:
      'Fundamental physics — optics, electromagnetism, quantum phenomena, acoustics, and observational astronomy.',
    exampleTopics: [
      'Characterizing exoplanet transits',
      'Acoustic levitation of small particles',
      'Quantum dot luminescence tuning',
      'Gravitational wave signal processing',
    ],
  },
  {
    code: 'PLNT',
    name: 'Plant Sciences',
    description:
      'Plant physiology, genetics, ecology, and agriculture — from molecular responses to field-scale studies.',
    exampleTopics: [
      'Effect of UV stress on flavonoid production',
      'CRISPR-Cas9 in plant disease resistance',
      'Hydroponic nutrient optimization',
      'Allelopathy in invasive species',
    ],
  },
  {
    code: 'ROBO',
    name: 'Robotics & Intelligent Machines',
    description:
      'Mechanical design, control systems, and AI for autonomous or semi-autonomous machines.',
    exampleTopics: [
      'Swarm robotics for search and rescue',
      'Reinforcement learning for robot locomotion',
      'Soft-robotic gripper for delicate objects',
      'Vision-based autonomous navigation',
    ],
  },
  {
    code: 'SOFT',
    name: 'Systems Software',
    description:
      'Operating systems, compilers, networking, distributed systems, cybersecurity, and programming language design.',
    exampleTopics: [
      'Side-channel attack detection in OS kernels',
      'Efficient garbage-collection algorithms',
      'Peer-to-peer encrypted messaging protocol',
      'Compiler optimization for embedded targets',
    ],
  },
  {
    code: 'TMED',
    name: 'Translational Medical Science',
    description:
      'Bridging basic science and clinical application — drug discovery, medical device validation, and clinical-trial design.',
    exampleTopics: [
      'AI-guided drug repurposing for rare diseases',
      '3D-printed scaffold for bone regeneration',
      'Liquid biopsy ctDNA quantification',
      'Nanoparticle drug delivery to tumor cells',
    ],
  },
]
