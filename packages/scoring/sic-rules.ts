const HIGH_VALUE_SIC = new Set([
  '72110', // biotech R&D
  '72190', // other R&D
  '62012', // business/software dev
]);

const MEDIUM_VALUE_SIC = new Set([
  '62020', // IT consultancy
  '62090', // other IT
  '71121', // engineering design
]);

export function scoreSic(sicCodes: string[]): number {
  let score = 0;

  for (const code of sicCodes) {
    if (HIGH_VALUE_SIC.has(code)) score += 3;
    else if (MEDIUM_VALUE_SIC.has(code)) score += 1;
  }

  return Math.min(score, 8);
}