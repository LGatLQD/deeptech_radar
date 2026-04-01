import '../config/env';
import axios from 'axios';

const BASE_URL = 'https://api.company-information.service.gov.uk';

const apiKey = (process.env.COMPANIES_HOUSE_API_KEY || '').trim();

if (!apiKey) {
  throw new Error('COMPANIES_HOUSE_API_KEY is not set');
}

const auth = {
  username: apiKey,
  password: '',
};

export async function fetchCompanyProfile(companyNumber: string) {
  const res = await axios.get(`${BASE_URL}/company/${companyNumber}`, { auth });
  return res.data;
}

export async function fetchFilingHistory(companyNumber: string) {
  const res = await axios.get(
    `${BASE_URL}/company/${companyNumber}/filing-history`,
    { auth }
  );
  return res.data;
}

export async function fetchOfficers(companyNumber: string) {
  const res = await axios.get(
    `${BASE_URL}/company/${companyNumber}/officers`,
    { auth }
  );
  return res.data;
}

export async function fetchPSCs(companyNumber: string) {
  const res = await axios.get(
    `${BASE_URL}/company/${companyNumber}/persons-with-significant-control`,
    { auth }
  );
  return res.data;
}

export async function fetchCharges(companyNumber: string) {
  const res = await axios.get(
    `${BASE_URL}/company/${companyNumber}/charges`,
    { auth }
  );
  return res.data;
}