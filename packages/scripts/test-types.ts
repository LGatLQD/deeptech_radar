import { CompanyProfile } from '../domain/types';

const c: CompanyProfile = {
  companyNumber: '12345678',
  companyName: 'Test Ltd',
  companyStatus: 'active',
  companyType: 'ltd',
  dateOfCreation: '2025-01-01',
  jurisdiction: 'england-wales',
  registeredPostcode: 'CB4 0WS',
  registeredLocality: 'Cambridge',
  registeredRegion: null,
  sicCodes: ['72110'],
};

console.log(c.companyName);
