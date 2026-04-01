/**
 * UK Research Cluster scoring.
 *
 * Replaces the broad city-name geography scoring with postcode-prefix matching
 * against known innovation clusters. This is more precise — a SW7 postcode
 * (Imperial College) is a much stronger signal than any generic "London" match.
 *
 * Postcodes are matched on the OUTWARD CODE (the part before the space, e.g. "CB2").
 * The company's full postcode is split on the first space.
 *
 * Scoring (max 20 pts):
 *   20 — Tier-1 cluster: world-leading research density, direct campus adjacency
 *   17 — Tier-2 cluster: major UK research hub
 *   14 — Tier-3 cluster: established tech/science park or university district
 *   11 — Tier-4: smaller but recognised tech corridor
 *    5 — Anywhere else in the UK (not a known cluster)
 *    0 — No registered office / no postcode
 */

export interface ClusterEntry {
  name: string;
  tier: 1 | 2 | 3 | 4;
  score: number;
  postcodes: string[];    // outward codes (case-insensitive)
  description: string;   // shown on methodology page
}

export const CLUSTERS: ClusterEntry[] = [

  // ── Tier 1 · 20 pts ──────────────────────────────────────────────────────────

  {
    name: 'Cambridge Cluster',
    tier: 1, score: 20,
    postcodes: ['CB1','CB2','CB3','CB4','CB5','CB10','CB21','CB22','CB23','CB24','CB25'],
    description: 'Cambridge Biomedical Campus, Cambridge Science Park, Babraham Research Campus, Wellcome Genome Campus (Hinxton)',
  },
  {
    name: 'Oxford–Harwell Corridor',
    tier: 1, score: 20,
    postcodes: ['OX1','OX2','OX3','OX4','OX5','OX11','OX14'],
    description: 'Oxford Science Park, Begbroke Science Park, Harwell Science & Innovation Campus (Rutherford Appleton Lab, Diamond Light Source)',
  },
  {
    name: 'Stevenage Bioscience Catalyst',
    tier: 1, score: 20,
    postcodes: ['SG1','SG2'],
    description: 'GSK global HQ, Autolus, Ultragenyx UK — one of the highest concentrations of pharma R&D in Europe',
  },

  // ── Tier 2 · 17 pts ──────────────────────────────────────────────────────────

  {
    name: 'London Golden Triangle',
    tier: 2, score: 17,
    postcodes: ['SW7','WC1','WC2','NW1','EC1','EC2','SE1','W1'],
    description: 'Imperial College (SW7), UCL & Crick Institute (WC1), King\'s College London (SE1), Alan Turing Institute (NW1)',
  },
  {
    name: 'Edinburgh BioQuarter',
    tier: 2, score: 17,
    postcodes: ['EH9','EH14','EH16','EH1'],
    description: 'Edinburgh BioQuarter (EH16), King\'s Buildings campus (EH9), Heriot-Watt University (EH14)',
  },

  // ── Tier 3 · 14 pts ──────────────────────────────────────────────────────────

  {
    name: 'Manchester Science Park',
    tier: 3, score: 14,
    postcodes: ['M1','M13','M15','M60'],
    description: 'Manchester Science Park (M15), University of Manchester (M13), MediaCityUK adjacent',
  },
  {
    name: 'Bristol–Bath Tech',
    tier: 3, score: 14,
    postcodes: ['BS1','BS2','BS8','BS34','BA1','BA2'],
    description: 'University of Bristol (BS8), Bristol & Bath Science Park (BS34), University of Bath (BA2)',
  },
  {
    name: 'Daresbury–Hartree',
    tier: 3, score: 14,
    postcodes: ['WA4','WA5'],
    description: 'Daresbury Science & Innovation Campus — Hartree Centre (IBM), Cockcroft Institute, STFC',
  },
  {
    name: 'Nottingham Science Park',
    tier: 3, score: 14,
    postcodes: ['NG7','NG9'],
    description: 'University of Nottingham (NG7), BioCity Nottingham, MediCity UK',
  },

  // ── Tier 4 · 11 pts ──────────────────────────────────────────────────────────

  {
    name: 'Sheffield AMRC',
    tier: 4, score: 11,
    postcodes: ['S1','S3','S60'],
    description: 'Advanced Manufacturing Research Centre (S60), University of Sheffield, Nuclear AMRC',
  },
  {
    name: 'Glasgow Innovation District',
    tier: 4, score: 11,
    postcodes: ['G1','G12','G20','G75'],
    description: 'Glasgow Science Park (G20), University of Glasgow (G12), Strathclyde Tech Park (G75)',
  },
  {
    name: 'Newcastle Helix',
    tier: 4, score: 11,
    postcodes: ['NE1','NE2','NE4'],
    description: 'Newcastle Helix urban science district, Newcastle University, National Innovation Centre for Ageing',
  },
  {
    name: 'Birmingham Precision Medicine',
    tier: 4, score: 11,
    postcodes: ['B1','B15'],
    description: 'University of Birmingham (B15), Birmingham Health Partners, Brindleyplace tech district',
  },
  {
    name: 'London Tech City',
    tier: 4, score: 11,
    postcodes: ['EC2A','EC1V','N1','E1','E2'],
    description: 'Silicon Roundabout / Old Street corridor — higher concentration of deep tech than rest of London',
  },
];

// Build a fast lookup: outward code → best cluster entry
const CLUSTER_MAP = new Map<string, ClusterEntry>();
for (const cluster of CLUSTERS) {
  for (const pc of cluster.postcodes) {
    // Shorter code may already be a prefix of a longer one — keep highest score
    const existing = CLUSTER_MAP.get(pc.toLowerCase());
    if (!existing || cluster.score > existing.score) {
      CLUSTER_MAP.set(pc.toLowerCase(), cluster);
    }
  }
}

/**
 * Score a company's registered office postcode against known research clusters.
 */
export function scoreCluster(postalCode: string | undefined): {
  score: number;
  clusterName: string | null;
} {
  if (!postalCode) return { score: 0, clusterName: null };

  // Extract outward code (everything before the first space, or first 2–4 chars)
  const outward = postalCode.trim().split(' ')[0]?.toLowerCase() ?? '';

  // Try progressively shorter prefixes (e.g. "ec2a" → "ec2" → "ec")
  for (let len = outward.length; len >= 2; len--) {
    const prefix = outward.slice(0, len);
    const match  = CLUSTER_MAP.get(prefix);
    if (match) return { score: match.score, clusterName: match.name };
  }

  // Anywhere else in UK still gets a baseline
  return { score: 0, clusterName: 'Null' };
}
