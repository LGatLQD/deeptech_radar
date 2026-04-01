import { fetchCompanyProfile } from '../ch-client';

async function run() {
  const profile = await fetchCompanyProfile('12359822');
  console.log(profile.company_name);
}

run().catch((err) => {
  console.error(err.response?.data || err.message || err);
  process.exit(1);
});