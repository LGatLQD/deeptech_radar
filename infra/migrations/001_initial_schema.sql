CREATE TABLE IF NOT EXISTS companies (
  company_number TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_status TEXT,
  company_type TEXT,
  date_of_creation DATE,
  jurisdiction TEXT,
  registered_postcode TEXT,
  registered_locality TEXT,
  registered_region TEXT,
  sic_codes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_screen_results (
  company_number TEXT PRIMARY KEY REFERENCES companies(company_number) ON DELETE CASCADE,
  core_score NUMERIC NOT NULL,
  sic_score NUMERIC NOT NULL,
  keyword_score NUMERIC NOT NULL,
  cluster_score NUMERIC NOT NULL,
  recency_score NUMERIC NOT NULL,
  confidence_band TEXT,
  promotion_reason TEXT,
  promoted_to_enrichment BOOLEAN DEFAULT FALSE,
  screened_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS filings (
  id BIGSERIAL PRIMARY KEY,
  company_number TEXT REFERENCES companies(company_number) ON DELETE CASCADE,
  transaction_id TEXT,
  filing_type TEXT,
  category TEXT,
  filing_date DATE,
  description TEXT,
  raw_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS officers (
  id BIGSERIAL PRIMARY KEY,
  company_number TEXT REFERENCES companies(company_number) ON DELETE CASCADE,
  name TEXT,
  role TEXT,
  appointed_on DATE,
  resigned_on DATE,
  nationality TEXT,
  occupation TEXT,
  raw_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS pscs (
  id BIGSERIAL PRIMARY KEY,
  company_number TEXT REFERENCES companies(company_number) ON DELETE CASCADE,
  name TEXT,
  kind TEXT,
  notified_on DATE,
  ceased_on DATE,
  natures_of_control JSONB,
  raw_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS charges (
  id BIGSERIAL PRIMARY KEY,
  company_number TEXT REFERENCES companies(company_number) ON DELETE CASCADE,
  charge_code TEXT,
  created_on DATE,
  status TEXT,
  persons_entitled JSONB,
  classification_description TEXT,
  raw_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS enrichment_results (
  company_number TEXT PRIMARY KEY REFERENCES companies(company_number) ON DELETE CASCADE,
  funding_activity_score NUMERIC NOT NULL DEFAULT 0,
  cap_table_score NUMERIC NOT NULL DEFAULT 0,
  team_score NUMERIC NOT NULL DEFAULT 0,
  debt_score NUMERIC NOT NULL DEFAULT 0,
  activity_score NUMERIC NOT NULL DEFAULT 0,
  investment_relevance_score NUMERIC NOT NULL DEFAULT 0,
  stage_estimate TEXT,
  stage_confidence TEXT,
  why_selected JSONB DEFAULT '[]'::jsonb,
  risk_flags JSONB DEFAULT '[]'::jsonb,
  enriched_at TIMESTAMP DEFAULT NOW()
);