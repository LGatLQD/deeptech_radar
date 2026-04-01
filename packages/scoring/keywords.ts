type KeywordResult = {
  score: number;
  matches: string[];
};

const STRONG_KEYWORDS = new Map<string, number>([
  ['quantum', 12],
  ['photonic', 12],
  ['photonics', 12],
  ['graphene', 12],
  ['nanoparticle', 12],
  ['nanoparticles', 12],
  ['nanomaterial', 12],
  ['nanomaterials', 12],
  ['semiconductor', 12],
  ['semiconductors', 12],
  ['chip', 10],
  ['chips', 10],
  ['asic', 12],
  ['robotics', 12],
  ['robotic', 12],
  ['autonomous', 12],
  ['drone', 10],
  ['drones', 10],
  ['uav', 10],
  ['biotech', 12],
  ['bioscience', 12],
  ['biosciences', 12],
  ['therapeutic', 12],
  ['therapeutics', 12],
  ['genomic', 12],
  ['genomics', 12],
  ['diagnostic', 12],
  ['diagnostics', 12],
  ['bioreactor', 12],
  ['bioreactors', 12],
  ['biomanufacturing', 12],
  ['materials', 12],
  ['materials nexus', 12],
  ['plasma', 10],
  ['battery', 12],
  ['batteries', 12],
  ['power electronics', 12],
  ['carbon capture', 12],
  ['additive', 10],
  ['3d printing', 10],
  ['drug discovery', 12],
  ['protein', 10],
  ['proteins', 10],
  ['enzyme', 10],
  ['enzymes', 10],
  ['cell', 8],
  ['cells', 8],
  ['vaccine', 10],
  ['vaccines', 10],
  ['toxicity', 10],
  ['biologics', 10],
  ['rna', 10],
  ['single-cell', 12],
  ['single cell', 12],
  ['neuromorphic', 12],
  ['glucose sensor', 12],
  ['x-ray', 10],
  ['infrared', 10],
  ['ftir', 10],
  ['ultrasonic', 10],
  ['barocaloric', 12],
  ['auxetic', 12],
  ['microled', 12],
  ['holographic', 10],
  ['echolocation', 10],
]);

const MEDIUM_KEYWORDS = new Map<string, number>([
  ['ai', 4],
  ['artificial intelligence', 8],
  ['machine learning', 8],
  ['computer vision', 8],
  ['synthetic data', 8],
  ['simulation', 8],
  ['optimisation', 8],
  ['optimization', 8],
  ['reasoning', 8],
  ['inference', 8],
  ['foundation model', 8],
  ['foundation models', 8],
  ['llm', 8],
  ['edge ai', 8],
  ['data science', 6],
  ['model checking', 8],
  ['symbolic execution', 8],
  ['aerospace', 8],
  ['rotorcraft', 8],
  ['satellite', 8],
  ['satellites', 8],
  ['antenna', 8],
  ['antennas', 8],
  ['sensor', 8],
  ['sensors', 8],
  ['sensing', 8],
  ['imaging', 8],
  ['optical', 8],
  ['switch', 8],
  ['switching', 8],
  ['networking', 8],
  ['precision manufacturing', 8],
  ['manufacturing', 6],
  ['engineering', 6],
  ['motor', 8],
  ['motors', 8],
  ['generator', 8],
  ['generators', 8],
  ['wireless', 6],
  ['wireless comms', 8],
  ['power transformer', 8],
  ['photonic', 8],
  ['medical robotics', 10],
  ['surgical robotics', 10],
  ['pathogen', 8],
  ['microbial', 8],
  ['molecule', 8],
  ['molecules', 8],
  ['mutat', 6],
  ['sequencing', 10],
  ['multiomic', 10],
  ['delivery', 6],
  ['biometric', 8],
  ['cyber', 8],
  ['secure', 6],
  ['security', 8],
  ['red teaming', 10],
  ['resilience', 6],
  ['climate risk', 8],
  ['geolocation', 8],
  ['gnss', 8],
  ['speech', 6],
  ['uncertainty', 8],
  ['quantification', 6],
  ['graph-native', 10],
  ['graph native', 10],
  ['ultrafast', 8],
  ['plasma jet', 10],
  ['cold plasma', 10],
  ['bioreactor', 8],
  ['composite', 8],
  ['coating', 6],
  ['coatings', 6],
]);

const WEAK_KEYWORDS = new Map<string, number>([
  ['advanced', 1],
  ['technology', 1],
  ['technologies', 1],
  ['systems', 1],
  ['solution', 1],
  ['solutions', 1],
  ['labs', 2],
  ['lab', 2],
  ['bio', 2],
  ['medical', 2],
  ['health', 2],
  ['global', 1],
  ['platform', 1],
  ['software', 1],
  ['cloud', 1],
  ['analytics', 1],
  ['data', 1],
]);

function collectMatches(name: string, keywordMap: Map<string, number>) {
  const matches: string[] = [];
  let score = 0;

  for (const [keyword, weight] of keywordMap.entries()) {
    if (name.includes(keyword)) {
      matches.push(keyword);
      score += weight;
    }
  }

  return { score, matches };
}

export function scoreCompanyName(companyName: string): KeywordResult {
  const name = companyName.toLowerCase();

  const strong = collectMatches(name, STRONG_KEYWORDS);
  const medium = collectMatches(name, MEDIUM_KEYWORDS);
  const weak = collectMatches(name, WEAK_KEYWORDS);

  const allMatches = [...strong.matches, ...medium.matches, ...weak.matches];

  // Cap each band to stop spammy stacking
  const strongScore = Math.min(strong.score, 20);
  const mediumScore = Math.min(medium.score, 12);
  const weakScore = Math.min(weak.score, 3);

  // Slight bonus for mixed technical signals
  const diversityBonus =
    (strong.matches.length > 0 ? 2 : 0) +
    (medium.matches.length >= 2 ? 2 : 0);

  const score = Math.min(strongScore + mediumScore + weakScore + diversityBonus, 25);

  return {
    score,
    matches: allMatches,
  };
}