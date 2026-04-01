import { SIC_MAP } from './sicCodes';
import { scoreCompanyName } from './keywords';
import { scoreCluster } from './clusters';

function deriveKeywordCategories(name: string): string[] {
  const n = ` ${name.toLowerCase()} `;
  const categories = new Set<string>();

  // Biotech / life sciences
  if (
    n.includes('therapeutic') ||
    n.includes('therapeutics') ||
    n.includes('bioscience') ||
    n.includes('biosciences') ||
    n.includes('biotech') ||
    n.includes('genomic') ||
    n.includes('genomics') ||
    n.includes('diagnostic') ||
    n.includes('diagnostics')
  ) {
    categories.add('Biotech');
  }

  // AI / software
  if (
    n.includes(' ai ') ||
    n.includes('artificial intelligence') ||
    n.includes('machine learning') ||
    n.includes('deep learning') ||
    n.includes('neural')
  ) {
    categories.add('AI & Software');
  }

  // Robotics
  if (n.includes('robot') || n.includes('robotics')) {
    categories.add('Robotics');
  }

  // Quantum / photonics
  if (
    n.includes('quantum') ||
    n.includes('photon') ||
    n.includes('photonic') ||
    n.includes('photonics')
  ) {
    categories.add('Quantum / Photonics');
  }

  // Advanced materials
  if (
    n.includes('material') ||
    n.includes('materials') ||
    n.includes('nanomaterial') ||
    n.includes('graphene')
  ) {
    categories.add('Advanced Materials');
  }

  // Clean tech / energy
  if (
    n.includes('battery') ||
    n.includes('batteries') ||
    n.includes('energy') ||
    n.includes('climate') ||
    n.includes('carbon')
  ) {
    categories.add('CleanTech');
  }

  // MedTech
  if (
    n.includes('medical') ||
    n.includes('medtech') ||
    n.includes('healthtech') ||
    n.includes('health ')
  ) {
    categories.add('MedTech');
  }

  return Array.from(categories).sort();
}

function scoreSic(sicCodes: string[]): {
  score: number;
  primaryCategory: string | null;
  categories: string[];
  multiCodeBonus: number;
} {
  const hasHardCode = sicCodes.some((c) => {
    const e = SIC_MAP.get(c);
    return e && !e.broad;
  });

  let best = 0;
  let bestCategory: string | null = null;
  let hardCodeCount = 0;
  const categories = new Set<string>();

  for (const code of sicCodes) {
    const entry = SIC_MAP.get(code);
    if (!entry) continue;

    const effectiveScore =
      entry.broad && !hasHardCode
        ? Math.round(entry.score * 0.2)
        : entry.score;

    if (entry.category) {
      categories.add(entry.category);
    }

    if (effectiveScore > best) {
      best = effectiveScore;
      bestCategory = entry.category;
    }

    if (!entry.broad) hardCodeCount++;
  }

  const multiCodeBonus = Math.min(Math.max(0, hardCodeCount - 1) * 2, 5);

  return {
    score: best,
    primaryCategory: bestCategory,
    categories: Array.from(categories).sort(),
    multiCodeBonus,
  };
}

function shouldPromoteToEnrichment(args: {
  coreScore: number;
  sicScore: number;
  keywordScore: number;
  clusterScore: number;
}): boolean {
  const { coreScore, sicScore, keywordScore, clusterScore } = args;

  // Very strong overall signal
  if (coreScore >= 45) return true;

  // Strong SIC corroborated by keyword or very strong cluster
  if (sicScore >= 20 && (keywordScore >= 6 || clusterScore >= 20)) return true;

  // Strong keyword-led cases
  if (keywordScore >= 10 && (sicScore >= 8 || clusterScore >= 17)) return true;

  // Strong cluster + meaningful underlying signal
  if (clusterScore >= 20 && sicScore >= 12 && keywordScore >= 3) return true;

  // Quiet deep-tech path
  if (sicScore >= 25 && clusterScore >= 15) return true;

  return false;
}

export function scoreCompany(company: {
  company_name: string;
  sic_codes: string[];
  registered_postcode: string | null;
}) {
  const sicResult = scoreSic(company.sic_codes || []);
  const keywordResult = scoreCompanyName(company.company_name || '');
  const clusterResult = scoreCluster(company.registered_postcode || undefined);

  const rawSicScore = sicResult.score + sicResult.multiCodeBonus;

  // Compress SIC dominance
  const adjustedSicScore = Math.round(rawSicScore * 0.5);

  const coreScore =
    adjustedSicScore +
    keywordResult.score +
    clusterResult.score;

  const promotedToEnrichment = shouldPromoteToEnrichment({
    coreScore,
    sicScore: adjustedSicScore,
    keywordScore: keywordResult.score,
    clusterScore: clusterResult.score,
  });

  let confidenceBand: 'high' | 'medium' | 'low' = 'low';
  if (coreScore >= 60) confidenceBand = 'high';
  else if (coreScore >= 40) confidenceBand = 'medium';

  const keywordCategories = deriveKeywordCategories(company.company_name || '');

  const sectorCategories = Array.from(
    new Set([
      ...(sicResult.categories || []),
      ...(keywordCategories || []),
    ])
  ).sort();

  return {
    sicScore: adjustedSicScore,
    primarySicCategory: sicResult.primaryCategory,
    sicCategories: sicResult.categories,
    keywordCategories,
    sectorCategories,
    keywordScore: keywordResult.score,
    clusterScore: clusterResult.score,
    recencyScore: 0,
    coreScore,
    confidenceBand,
    promotedToEnrichment,
  };
}