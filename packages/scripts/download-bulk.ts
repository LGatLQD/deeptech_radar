import '../config/env';
import fs from 'fs';
import path from 'path';
import https from 'https';
import unzipper from 'unzipper';

const DATA_DIR = process.env.COMPANIES_HOUSE_DATA_DIR || 'data';
const ZIP_PATH = path.join(DATA_DIR, 'BasicCompanyData.zip');
const CSV_PATH = path.join(DATA_DIR, 'BasicCompanyData.csv');

const DOWNLOAD_ROOT = 'https://download.companieshouse.gov.uk/';

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', reject);
  });
}

function monthCandidates(): string[] {
  const candidates: string[] = [];
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    candidates.push(
      `https://download.companieshouse.gov.uk/BasicCompanyDataAsOneFile-${yyyy}-${mm}-01.zip`
    );
  }

  return candidates;
}

function urlExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    https
      .request(url, { method: 'HEAD' }, (response) => {
        resolve(response.statusCode === 200);
      })
      .on('error', () => resolve(false))
      .end();
  });
}

async function getLatestBulkUrl(): Promise<string> {
  if (process.env.COMPANIES_HOUSE_BULK_URL) {
    return process.env.COMPANIES_HOUSE_BULK_URL;
  }

  for (const url of monthCandidates()) {
    console.log(`Checking ${url}`);
    if (await urlExists(url)) {
      return url;
    }
  }

  throw new Error('Could not find an available Companies House bulk ZIP in the last 6 months');
}

async function run() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const bulkUrl = await getLatestBulkUrl();
  console.log(`Downloading ${bulkUrl}`);
  await download(bulkUrl, ZIP_PATH);

  console.log(`Extracting ${ZIP_PATH}`);
  await fs
    .createReadStream(ZIP_PATH)
    .pipe(unzipper.Extract({ path: DATA_DIR }))
    .promise();

  const files = fs.readdirSync(DATA_DIR);
  const extractedCsv = files.find((file) => file.endsWith('.csv'));

  if (!extractedCsv) {
    throw new Error('No CSV file found after unzip');
  }

  const extractedPath = path.join(DATA_DIR, extractedCsv);

  if (extractedPath !== CSV_PATH) {
    fs.renameSync(extractedPath, CSV_PATH);
  }

  console.log(`CSV ready at ${CSV_PATH}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});