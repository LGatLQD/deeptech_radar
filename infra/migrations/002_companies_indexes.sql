CREATE INDEX IF NOT EXISTS idx_companies_date_of_creation
ON companies (date_of_creation);

CREATE INDEX IF NOT EXISTS idx_companies_company_status
ON companies (company_status);

CREATE INDEX IF NOT EXISTS idx_companies_company_type
ON companies (company_type);

