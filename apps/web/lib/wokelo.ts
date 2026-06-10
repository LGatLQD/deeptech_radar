// apps/web/lib/wokelo.ts

const BASE_URL = process.env.WOKELO_API_BASE || "https://api.wokelo.ai";

let cachedToken: string | null = null;

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value.trim();
}

async function getAccessToken() {
  if (cachedToken) return cachedToken;

  const form = new FormData();
  form.append("client_id", required("WOKELO_CLIENT_ID"));
  form.append("client_secret", required("WOKELO_CLIENT_SECRET"));
  form.append("username", required("WOKELO_USERNAME"));
  form.append("password", required("WOKELO_PASSWORD"));
  form.append("grant_type", "password");

  const response = await fetch(`${BASE_URL}/auth/token/`, {
    method: "POST",
    body: form,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Failed auth ${response.status}: ${text}`);
  }

  const data = JSON.parse(text);

  cachedToken = data.access_token;

  return cachedToken;
}

export async function wokeloFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Wokelo error ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}