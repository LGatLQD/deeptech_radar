const CLUSTERS = new Set([
  'cambridge',
  'oxford',
  'london',
]);

export function scoreCluster(locality: string | null): number {
  if (!locality) return 0;

  return CLUSTERS.has(locality.toLowerCase()) ? 5 : 0;
}

