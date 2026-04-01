export interface CompanyProfile {
  companyNumber: string;
  companyName: string;
  companyStatus: string | null;
  companyType: string | null;
  dateOfCreation: string | null;
  jurisdiction: string | null;
  registeredPostcode: string | null;
  registeredLocality: string | null;
  registeredRegion: string | null;
  sicCodes: string[];
}

export interface CoreScreenResult {
  companyNumber: string;
  coreScore: number;
  sicScore: number;
  keywordScore: number;
  clusterScore: number;
  recencyScore: number;
  confidenceBand: 'high' | 'medium' | 'low';
  promotionReason: string;
  promotedToEnrichment: boolean;
}

export interface EnrichmentResult {
  companyNumber: string;
  fundingActivityScore: number;
  capTableScore: number;
  teamScore: number;
  debtScore: number;
  activityScore: number;
  investmentRelevanceScore: number;
  stageEstimate: 'pre-seed' | 'seed' | 'post-seed' | 'unknown';
  stageConfidence: 'high' | 'medium' | 'low';
  whySelected: string[];
  riskFlags: string[];
}