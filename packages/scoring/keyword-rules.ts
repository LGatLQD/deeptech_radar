const KEYWORDS = [
  'ai',
  'artificial intelligence',
  'quantum',
  'robotics',
  'biotech',
  'machine learning',
  'semiconductor',
  'deep tech',
  'bioscience',
  'biosciences',
  'therapeutics',
  'photonics',
];

export function scoreKeywords(name: string): number {
  const lower = name.toLowerCase();

  let score = 0;

  for (const keyword of KEYWORDS) {
    if (lower.includes(keyword)) score += 1;
  }

  return Math.min(score, 5);
}