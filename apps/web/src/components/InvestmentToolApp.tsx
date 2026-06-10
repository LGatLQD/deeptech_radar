'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  RefreshCw,
  Bookmark,
  Trash2,
} from 'lucide-react';

type Director = {
  name: string;
  role?: string | null;
  linkedin_url?: string | null;
};

type CompanyRow = {
  company_number: string;
  company_name: string;
  registered_locality: string | null;
  registered_postcode: string | null;
  date_of_creation: string | null;
  tech_hub: string;
  primary_sic_category: string | null;
  sic_categories: string[] | null;
  keyword_categories: string[] | null;
  sector_categories: string[] | null;
  display_categories: string[] | null;
  core_score: number;
  cross_ref_promote: boolean;
  alignment_score: number;
  combined_score: number;
  rank_position?: number | null;
  total_ranked?: number | null;
  stage_estimate: string | null;
  stage_confidence: string | null;
  team_score: number | null;
  cap_table_score: number | null;
  activity_score: number | null;
  why_selected: string[] | null;
  risk_flags: string[] | null;
  directors?: Director[] | null;
  sic_score: number | null;
  keyword_score: number | null;
  cluster_score: number | null;
};

type SortKey =
  | 'rank_position'
  | 'combined_score'
  | 'core_score'
  | 'alignment_score'
  | 'date_of_creation'
  | 'company_name';

type SortDir = 'asc' | 'desc';

type AgeFilter = 'all' | '3' | '6' | '12' | '24' | '36' | '60';

const badgeClass =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function scoreCell(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}

function normaliseArray(values: string[] | null | undefined): string[] {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

function companiesHouseUrl(companyNumber: string): string {
  return `https://find-and-update.company-information.service.gov.uk/company/${companyNumber}`;
}

function linkedInSearchUrl(name: string, company: string): string {
  const q = encodeURIComponent(`${name} ${company} LinkedIn`);
  return `https://www.google.com/search?q=${q}`;
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat('en-GB').format(n);
}

function latestTrafficGrowth(traffic: any): string {
  const visits = traffic?.EstimatedMonthlyVisits;
  if (!visits || typeof visits !== 'object') return '—';

  const entries = Object.entries(visits).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length < 2) return '—';

  const previous = Number(entries[entries.length - 2][1]);
  const latest = Number(entries[entries.length - 1][1]);

  if (!previous || Number.isNaN(previous) || Number.isNaN(latest)) return '—';

  const growth = ((latest - previous) / previous) * 100;
  return `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}%`;
}

function makeInvestmentSummary(snapshot: any): string[] {
  const data = snapshot?.result?.data;
  const firmo = data?.firmographics;
  const funding = data?.funding?.overall;
  const headcount = data?.headcount;

  return [
    firmo?.location ? `Based in ${firmo.location}.` : null,
    firmo?.founded ? `Founded in ${firmo.founded}.` : null,
    funding?.funding_stage ? `${funding.funding_stage} funding stage.` : null,
    funding?.total_funding ? `${formatMoney(funding.total_funding)} total funding reported by Wokelo.` : null,
    funding?.key_investors?.length ? `Key investor(s): ${funding.key_investors.slice(0, 3).join(', ')}.` : null,
    headcount?.linkedin_insights?.totalEmployees ? `${formatNumber(headcount.linkedin_insights.totalEmployees)} LinkedIn employees.` : null,
    firmo?.core_offering || firmo?.short_description || null,
  ].filter(Boolean) as string[];
}


export default function InvestmentToolApp() {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [returned, setReturned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queryInput, setQueryInput] = useState('');
  const [selectedStagesDraft, setSelectedStagesDraft] = useState<string[]>([]);
  const [selectedHubsDraft, setSelectedHubsDraft] = useState<string[]>([]);
  const [selectedCategoriesDraft, setSelectedCategoriesDraft] = useState<string[]>([]);
  const [validatedOnlyDraft, setValidatedOnlyDraft] = useState(false);
  const [ageMonthsDraft, setAgeMonthsDraft] = useState<AgeFilter>('all');
  const [sortKeyDraft, setSortKeyDraft] = useState<SortKey>('rank_position');
  const [sortDirDraft, setSortDirDraft] = useState<SortDir>('asc');

  const [query, setQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedHubs, setSelectedHubs] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [validatedOnly, setValidatedOnly] = useState(false);
  const [ageMonths, setAgeMonths] = useState<AgeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank_position');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [expanded, setExpanded] = useState<string | null>(null);

  type TabType = 'all' | 'watchlist' | 'bin';
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [watchlistMap, setWatchlistMap] = useState<Record<string, string>>({});
  const [binMap, setBinMap] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<{ company_number: string; type: 'watchlist' | 'bin' } | null>(null);
  const [pendingReason, setPendingReason] = useState('');
  const [wokeloLoading, setWokeloLoading] = useState<string | null>(null);
  const [wokeloSnapshot, setWokeloSnapshot] = useState<any | null>(null);
  const [wokeloSnapshotLoading, setWokeloSnapshotLoading] = useState(false);
  const [wokeloSnapshotCheckedFor, setWokeloSnapshotCheckedFor] = useState<string | null>(null);

  useEffect(() => {
    async function loadLists() {
      const [wRes, bRes] = await Promise.all([fetch('/api/watchlist'), fetch('/api/bin')]);
      const wData = wRes.ok ? await wRes.json() : { rows: [] };
      const bData = bRes.ok ? await bRes.json() : { rows: [] };
      const wMap: Record<string, string> = {};
      for (const r of wData.rows ?? []) wMap[r.company_number] = r.reason ?? '';
      const bMap: Record<string, string> = {};
      for (const r of bData.rows ?? []) bMap[r.company_number] = r.reason ?? '';
      setWatchlistMap(wMap);
      setBinMap(bMap);
    }
    loadLists();
  }, []);

  const stages = ['seed', 'post-seed', 'pre-seed', 'unknown'];
  const hubs = [
    'CAMBRIDGE',
    'OXFORD',
    'LONDON',
    'BRISTOL',
    'EDINBURGH',
    'SHEFFIELD',
    'MANCHESTER',
    'OTHER',
  ];
  const categories = [
    'AI & Software',
    'Advanced Materials',
    'Biotech',
    'CleanTech',
    'Data & Cloud',
    'Deep R&D',
    'Hardware',
    'HealthTech',
    'MedTech',
    'Quantum / Photonics',
    'Robotics',
    'Space & Aero',
  ];

  async function loadData(args?: {
    q?: string;
    stages?: string[];
    hubs?: string[];
    categories?: string[];
    validatedOnly?: boolean;
    ageMonths?: AgeFilter;
    sortKey?: SortKey;
    sortDir?: SortDir;
  }) {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      const q = args?.q ?? query;
      const stageValues = args?.stages ?? selectedStages;
      const hubValues = args?.hubs ?? selectedHubs;
      const categoryValues = args?.categories ?? selectedCategories;
      const validated = args?.validatedOnly ?? validatedOnly;
      const age = args?.ageMonths ?? ageMonths;
      const sortBy = args?.sortKey ?? sortKey;
      const direction = args?.sortDir ?? sortDir;

      if (q.trim()) params.set('q', q.trim());
      stageValues.forEach((v) => params.append('stage', v));
      hubValues.forEach((v) => params.append('hub', v));
      categoryValues.forEach((v) => params.append('category', v));
      if (validated) params.set('validated_only', 'true');
      if (age !== 'all') params.set('age_months', age);
      params.set('sort_key', sortBy);
      params.set('sort_dir', direction);

      const res = await fetch(`/api/investment-tool?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const data = await res.json();

      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setReturned(data.returned ?? 0);
      setExpanded(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setRows([]);
      setTotal(0);
      setReturned(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData({
      q: '',
      stages: [],
      hubs: [],
      categories: [],
      validatedOnly: false,
      ageMonths: 'all',
      sortKey: 'rank_position',
      sortDir: 'asc',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleValue(value: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(value) ? current.filter((x) => x !== value) : [...current, value]);
  }

  function sortByColumn(key: SortKey) {
  const nextDir: SortDir =
    sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';

  setSortKey(key);
  setSortDir(nextDir);
  setSortKeyDraft(key);
  setSortDirDraft(nextDir);

  loadData({
    q: query,
    stages: selectedStages,
    hubs: selectedHubs,
    categories: selectedCategories,
    validatedOnly,
    ageMonths,
    sortKey: key,
    sortDir: nextDir,
  });
}

  function applyFilters() {
    setQuery(queryInput);
    setSelectedStages(selectedStagesDraft);
    setSelectedHubs(selectedHubsDraft);
    setSelectedCategories(selectedCategoriesDraft);
    setValidatedOnly(validatedOnlyDraft);
    setAgeMonths(ageMonthsDraft);
    setSortKey(sortKeyDraft);
    setSortDir(sortDirDraft);

    loadData({
      q: queryInput,
      stages: selectedStagesDraft,
      hubs: selectedHubsDraft,
      categories: selectedCategoriesDraft,
      validatedOnly: validatedOnlyDraft,
      ageMonths: ageMonthsDraft,
      sortKey: sortKeyDraft,
      sortDir: sortDirDraft,
    });
  }

  function clearFilters() {
    setQueryInput('');
    setSelectedStagesDraft([]);
    setSelectedHubsDraft([]);
    setSelectedCategoriesDraft([]);
    setValidatedOnlyDraft(false);
    setAgeMonthsDraft('all');
    setSortKeyDraft('rank_position');
    setSortDirDraft('asc');

    setQuery('');
    setSelectedStages([]);
    setSelectedHubs([]);
    setSelectedCategories([]);
    setValidatedOnly(false);
    setAgeMonths('all');
    setSortKey('rank_position');
    setSortDir('asc');

    loadData({
      q: '',
      stages: [],
      hubs: [],
      categories: [],
      validatedOnly: false,
      ageMonths: 'all',
      sortKey: 'rank_position',
      sortDir: 'asc',
    });
  }

  async function addToWatchlist(company_number: string, reason: string) {
    await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_number, reason }) });
    setWatchlistMap((prev) => ({ ...prev, [company_number]: reason }));
    setPendingAction(null);
    setPendingReason('');
  }

  async function removeFromWatchlist(company_number: string) {
    await fetch('/api/watchlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_number }) });
    setWatchlistMap((prev) => { const next = { ...prev }; delete next[company_number]; return next; });
  }

  async function addToBin(company_number: string, reason: string) {
    await fetch('/api/bin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_number, reason }) });
    setBinMap((prev) => ({ ...prev, [company_number]: reason }));
    setPendingAction(null);
    setPendingReason('');
  }

  async function removeFromBin(company_number: string) {
    await fetch('/api/bin', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company_number }) });
    setBinMap((prev) => { const next = { ...prev }; delete next[company_number]; return next; });
  }

  async function generateWokeloSnapshot(row: CompanyRow) {
  try {
    setWokeloLoading(row.company_number);

    const res = await fetch('/api/wokelo/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: row.company_name,
        company_number: row.company_number,
    }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    setWokeloSnapshot({
  companyName: row.company_name,
  matchedCompany: data.matchedCompany,
  result: data.result,
}); 

setWokeloSnapshotCheckedFor(row.company_number);

setExpanded(row.company_number);

  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to generate Wokelo snapshot');
  } finally {
    setWokeloLoading(null);
  }
}

async function loadSavedWokeloSnapshot(row: CompanyRow) {
  try {
    setWokeloSnapshotLoading(true);
    setWokeloSnapshotCheckedFor(null);
    setWokeloSnapshot(null);

    const res = await fetch(
      `/api/wokelo/snapshot?company_number=${encodeURIComponent(row.company_number)}`
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    if (data.found) {
      setWokeloSnapshot({
        companyName: row.company_name,
        matchedCompany: data.matchedCompany,
        result: data.result,
      });
    }

    setWokeloSnapshotCheckedFor(row.company_number);
  } catch {
    setWokeloSnapshot(null);
    setWokeloSnapshotCheckedFor(row.company_number);
  } finally {
    setWokeloSnapshotLoading(false);
  }
}

  function renderFilterGroup(
    title: string,
    values: string[],
    selected: string[],
    setter: (v: string[]) => void
  ) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-slate-900">{title}</div>
        <div className="flex flex-wrap gap-2">
          {values.map((value) => {
            const active = selected.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleValue(value, selected, setter)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">DeepTech Radar</h1>
              <p className="mt-2 text-sm text-slate-600">
                Screen, sort and inspect the scored UK deep-tech universe.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Showing</div>
                <div className="mt-1 text-2xl font-semibold">{returned.toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-500">Top rows returned</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Matches</div>
                <div className="mt-1 text-2xl font-semibold">{total.toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-500">Across full screened set</div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Cross-ref matched</div>
                <div className="mt-1 text-2xl font-semibold">
                  {rows.filter((r) => r.cross_ref_promote).length.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Present in curated external reference list
                </div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Seed/Post-seed</div>
                <div className="mt-1 text-2xl font-semibold">
                  {rows.filter((r) => ['seed', 'post-seed'].includes(r.stage_estimate || '')).length.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-slate-500">Within current result set</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-semibold">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Search by company name, number, hub or category"
                className="w-full rounded-2xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none ring-0 transition focus:border-slate-900"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Search runs across the full screened universe and returns the top 600 matches.
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Sort by</label>
                <select
                  value={sortKeyDraft}
                  onChange={(e) => setSortKeyDraft(e.target.value as SortKey)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm"
                >
                  <option value="rank_position">Rank</option>
                  <option value="combined_score">Combined score</option>
                  <option value="core_score">Core score</option>
                  <option value="alignment_score">Alignment score</option>
                  <option value="date_of_creation">Incorporation date</option>
                  <option value="company_name">Company name</option>
                </select>
              </div>
                            <div>
                <label className="mb-2 block text-sm font-semibold">Direction</label>
                <select
                  value={sortDirDraft}
                  onChange={(e) => setSortDirDraft(e.target.value as SortDir)}
                  className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-2 block text-sm font-semibold">Incorporation date</label>
              <select
                value={ageMonthsDraft}
                onChange={(e) => setAgeMonthsDraft(e.target.value as AgeFilter)}
                className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm"
              >
                <option value="all">All</option>
                <option value="3">Last 3 months</option>
                <option value="6">Last 6 months</option>
                <option value="12">Last 12 months</option>
                <option value="24">Last 24 months</option>
                <option value="36">Last 36 months</option>
                <option value="60">Last 5 years</option>
              </select>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={validatedOnlyDraft}
                onChange={(e) => setValidatedOnlyDraft(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show cross-ref matched companies only
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                <Search className="h-4 w-4" /> Go
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                <RefreshCw className="h-4 w-4" /> Clear
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {renderFilterGroup('Sectors', categories, selectedCategoriesDraft, setSelectedCategoriesDraft)}
          {renderFilterGroup('Tech hubs', hubs, selectedHubsDraft, setSelectedHubsDraft)}
          {renderFilterGroup('Stage', stages, selectedStagesDraft, setSelectedStagesDraft)}
        </div>


      

        <div className="rounded-3xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex gap-1 rounded-xl border bg-slate-50 p-1">
              {(['all', 'watchlist', 'bin'] as TabType[]).map((tab) => {
                const count = tab === 'all'
                  ? rows.filter((r) => !binMap[r.company_number]).length
                  : tab === 'watchlist'
                  ? Object.keys(watchlistMap).length
                  : Object.keys(binMap).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                      activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'watchlist' ? 'Watchlist' : 'Binned'} <span className="ml-1 text-xs text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-sm text-slate-500">
              {activeTab === 'all' ? `Showing ${returned.toLocaleString()} of ${total.toLocaleString()} matches` : ''}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-10 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading companies…
            </div>
          ) : error ? (
            <div className="p-10 text-sm text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    {[
                      ['Rank', 'rank_position'],
                      ['Company', 'company_name'],
                      ['Incorporated', 'date_of_creation'],
                      ['Combined', 'combined_score'],
                      ['Core', 'core_score'],
                      ['Alignment', 'alignment_score'],
                    ].map(([label, key]) => (
                      <th key={key} className="px-4 py-3 font-medium">
                        <button
                          type="button"
                          onClick={() => sortByColumn(key as SortKey)}
                          className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                        >
                          {label}
                          {sortKey === key ? (
                            sortDir === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          ) : null}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium">Hub</th>
                    <th className="px-4 py-3 font-medium">Sectors</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((row) => {
                      if (activeTab === 'all') return !binMap[row.company_number];
                      if (activeTab === 'watchlist') return !!watchlistMap[row.company_number];
                      if (activeTab === 'bin') return !!binMap[row.company_number];
                      return true;
                    })
                    .map((row) => {
                    const isOpen = expanded === row.company_number;
                    return (
                      <React.Fragment key={row.company_number}>
                        <tr className="border-t align-top hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold">
                            {row.rank_position && row.total_ranked
                              ? `${row.rank_position} / ${row.total_ranked}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{row.company_name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span>{row.company_number}</span>
                              <a
                                href={companiesHouseUrl(row.company_number)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-700 underline"
                              >
                                Companies House <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                            {row.cross_ref_promote && (
                              <div className="mt-2">
                                <span className={`${badgeClass} border-emerald-300 bg-emerald-50 text-emerald-700`}>
                                  Cross-ref matched
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">{formatDate(row.date_of_creation)}</td>
                          <td className="px-4 py-3">
                            <div>{row.tech_hub}</div>
                            <div className="mt-1 text-xs text-slate-500">{row.registered_locality || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex max-w-md flex-wrap gap-1.5">
                              {normaliseArray(row.display_categories).map((cat) => (
                                <span key={cat} className={`${badgeClass} border-slate-300 bg-slate-50 text-slate-700`}>
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>{row.stage_estimate || '—'}</div>
                            <div className="mt-1 text-xs text-slate-500">{row.stage_confidence || '—'}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold">{scoreCell(row.combined_score)}</td>
                          <td className="px-4 py-3">{scoreCell(row.core_score)}</td>
                          <td className="px-4 py-3">{scoreCell(row.alignment_score)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              title="Generate Wokelo snapshot"
                              disabled={wokeloLoading === row.company_number}
                              onClick={() => generateWokeloSnapshot(row)}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            >
                              {wokeloLoading === row.company_number ? 'Loading…' : 'View / Generate Wokelo'}
                            </button>
                              {/* Watchlist button */}
                              <button
                                type="button"
                                title={watchlistMap[row.company_number] ? 'Remove from watchlist' : 'Add to watchlist'}
                                onClick={() => {
                                  if (watchlistMap[row.company_number]) {
                                    removeFromWatchlist(row.company_number);
                                  } else {
                                    setPendingAction({ company_number: row.company_number, type: 'watchlist' });
                                    setPendingReason('');
                                  }
                                }}
                                className={`rounded-xl border p-2 transition ${
                                  watchlistMap[row.company_number]
                                    ? 'border-amber-300 bg-amber-50 text-amber-600'
                                    : 'border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500'
                                }`}
                              >
                                <Bookmark className="h-4 w-4" />
                              </button>
                              {/* Bin button */}
                              {activeTab !== 'bin' ? (
                                <button
                                  type="button"
                                  title="Move to bin"
                                  onClick={() => {
                                    setPendingAction({ company_number: row.company_number, type: 'bin' });
                                    setPendingReason('');
                                  }}
                                  className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:border-red-300 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removeFromBin(row.company_number)}
                                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                >
                                  Restore
                                </button>
                              )}
                              {/* Details button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isOpen) {
                                    setExpanded(null);
                                  } else {
                                    setExpanded(row.company_number);
                                    loadSavedWokeloSnapshot(row);
                                  }
                                }}
                                className="rounded-xl border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {isOpen ? (
                                  <span className="inline-flex items-center gap-1">
                                    <ChevronUp className="h-4 w-4" /> Hide
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <ChevronDown className="h-4 w-4" /> Details
                                  </span>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {pendingAction?.company_number === row.company_number && (
                          <tr className="border-t bg-amber-50">
                            <td colSpan={10} className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-700">
                                  {pendingAction.type === 'watchlist' ? 'Add to watchlist:' : 'Move to bin:'}
                                </span>
                                <select
                                  value={pendingReason}
                                  onChange={(e) => setPendingReason(e.target.value)}
                                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
                                >
                                  <option value="">Select reason…</option>
                                  {pendingAction.type === 'watchlist' ? (
                                    <>
                                      <option value="In Pipeline">In Pipeline</option>
                                      <option value="Worth Monitoring">Worth Monitoring</option>
                                      <option value="Other">Other</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Not DeepTech">Not DeepTech</option>
                                      <option value="Shell Company">Shell Company</option>
                                      <option value="Not Active">Not Active</option>
                                      <option value="Other">Other</option>
                                    </>
                                  )}
                                </select>
                                <button
                                  type="button"
                                  disabled={!pendingReason}
                                  onClick={() => {
                                    if (pendingAction.type === 'watchlist') addToWatchlist(pendingAction.company_number, pendingReason);
                                    else addToBin(pendingAction.company_number, pendingReason);
                                  }}
                                  className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setPendingAction(null); setPendingReason(''); }}
                                  className="text-sm text-slate-500 hover:text-slate-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {isOpen && (
                          <tr className="border-t bg-slate-50">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="grid gap-4 lg:grid-cols-4">
                                {wokeloSnapshotLoading &&
                                  expanded === row.company_number && (
                                    <div className="rounded-2xl border border-dashed bg-white p-4 text-sm text-slate-500 lg:col-span-4">
                                      Checking for saved Wokelo snapshot...
                                    </div>
                                )}

                                {!wokeloSnapshotLoading &&
                                  wokeloSnapshotCheckedFor === row.company_number &&
                                  !wokeloSnapshot && (
                                    <div className="rounded-2xl border border-dashed bg-white p-4 text-sm text-slate-500 lg:col-span-4">
                                      No saved Wokelo snapshot for this company yet. Use the Wokelo button to generate one.
                                    </div>
                                )}

                                {wokeloSnapshot &&
                                  wokeloSnapshot.companyName === row.company_name && (
  <div className="rounded-2xl border bg-white p-4 lg:col-span-4">
  <div className="flex items-start justify-between gap-4">
    <div>
      <div className="text-sm font-semibold">Wokelo Snapshot</div>
      <div className="mt-1 text-xs text-slate-500">
        Matched as: {wokeloSnapshot.matchedCompany?.name || '—'}
      </div>
    </div>

    <button
      type="button"
      onClick={() => setWokeloSnapshot(null)}
      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
    >
      Close
    </button>
  </div>

  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="text-xs uppercase tracking-wide text-slate-500">Investment summary</div>
    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
      {makeInvestmentSummary(wokeloSnapshot).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-4">
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">Founded</div>
      <div className="mt-1 font-semibold">
        {wokeloSnapshot.result?.data?.firmographics?.founded || '—'}
      </div>
    </div>

    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">Location</div>
      <div className="mt-1">
        {wokeloSnapshot.result?.data?.firmographics?.location || '—'}
      </div>
    </div>

    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">Employees</div>
      <div className="mt-1 font-semibold">
        {formatNumber(
          wokeloSnapshot.result?.data?.headcount?.linkedin_insights?.totalEmployees ||
            wokeloSnapshot.result?.data?.headcount?.employees_linkedin ||
            wokeloSnapshot.result?.data?.headcount?.employees_crunchbase
        )}
      </div>
    </div>

    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">Funding stage</div>
      <div className="mt-1">
        {wokeloSnapshot.result?.data?.funding?.overall?.funding_stage || '—'}
      </div>
    </div>
  </div>

  <div className="mt-5 grid gap-4 md:grid-cols-3">
    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Funding</div>
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <div>Total funding: {formatMoney(wokeloSnapshot.result?.data?.funding?.overall?.total_funding)}</div>
        <div>Last funding: {formatDate(wokeloSnapshot.result?.data?.funding?.overall?.last_funding_date || null)}</div>
        <div>Rounds: {wokeloSnapshot.result?.data?.funding?.overall?.num_funding_rounds || '—'}</div>
      </div>
    </div>

    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Headcount growth</div>
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        {(wokeloSnapshot.result?.data?.headcount?.linkedin_insights?.growth_periods || []).map((g: any) => (
          <div key={g.monthDifferenceStr}>
            {g.monthDifferenceStr}: {g.changePercentageStr || '—'}
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Website traffic</div>
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <div>
          Monthly visits: {formatNumber(wokeloSnapshot.result?.data?.website_traffic?.Engagements?.Visits)}
        </div>
        <div>
          Latest growth: {latestTrafficGrowth(wokeloSnapshot.result?.data?.website_traffic)}
        </div>
        <div>
          Pages / visit: {wokeloSnapshot.result?.data?.website_traffic?.Engagements?.PagePerVisit
            ? Number(wokeloSnapshot.result.data.website_traffic.Engagements.PagePerVisit).toFixed(1)
            : '—'}
        </div>
      </div>
    </div>
  </div>

  <div className="mt-5 grid gap-4 md:grid-cols-2">
    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Investors</div>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
        {(wokeloSnapshot.result?.data?.funding?.key_investors || []).slice(0, 8).map((investor: any) => (
          <li key={investor.name}>{investor.name}</li>
        ))}
      </ul>
    </div>

    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Team composition</div>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
        {(wokeloSnapshot.result?.data?.headcount?.linkedin_insights?.employees_breakup_by_function || [])
          .slice(0, 8)
          .map((fn: any) => (
            <li key={fn.name}>
              {fn.name}: {fn.percentage}% ({formatNumber(fn.employeeCount)})
            </li>
          ))}
      </ul>
    </div>
  </div>

  <div className="mt-5 grid gap-4 md:grid-cols-2">
    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Technology</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(wokeloSnapshot.result?.data?.gtm_and_business_model?.technology || []).map((item: string) => (
          <span key={item} className={`${badgeClass} border-slate-300 bg-slate-50 text-slate-700`}>
            {item}
          </span>
        ))}
      </div>
    </div>

    <div className="rounded-2xl border p-4">
      <div className="text-sm font-semibold">Commercial model</div>
      <div className="mt-2 text-sm text-slate-700">
        <div>Model: {wokeloSnapshot.result?.data?.gtm_and_business_model?.business_model_classification || '—'}</div>
        <div className="mt-2">Customers:</div>
        <ul className="list-disc pl-4">
          {(wokeloSnapshot.result?.data?.gtm_and_business_model?.customer_segments || []).map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-2">Revenue:</div>
        <ul className="list-disc pl-4">
          {(wokeloSnapshot.result?.data?.gtm_and_business_model?.revenue_streams || []).map((item: string) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>

  <div className="mt-5 rounded-2xl border p-4">
    <div className="text-sm font-semibold">Description</div>
    <p className="mt-2 text-sm text-slate-700">
      {wokeloSnapshot.result?.data?.firmographics?.long_description ||
        wokeloSnapshot.result?.data?.firmographics?.short_description ||
        'No description returned.'}
    </p>
  </div>
</div>
)}
                                <div className="rounded-2xl border bg-white p-4">
                                  <div className="text-sm font-semibold">Scores</div>
                                  <div className="mt-3 space-y-4 text-sm text-slate-700">

                                    {/* Core score */}
                                    <div>
                                      <div className="flex justify-between font-medium">
                                        <span>Core <span className="font-normal text-slate-400">(First Ranking)</span></span>
                                        <span>{scoreCell(row.core_score)}</span>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Deep-tech relevance from SIC codes, name keywords and cluster location.
                                      </div>
                                      <div className="mt-2 space-y-1.5">
                                        {[
                                          { label: 'SIC', desc: 'Deep-tech code matches', value: row.sic_score, max: 28 },
                                          { label: 'Keyword', desc: 'Deep-tech name signal', value: row.keyword_score, max: 25 },
                                          { label: 'Cluster', desc: 'Located in innovation hub', value: row.cluster_score, max: 20 },
                                        ].map(({ label, desc, value, max }) => (
                                          <div key={label}>
                                            <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                                              <span>{label} <span className="text-slate-400">— {desc}</span></span>
                                              <span>{value ?? '—'} / {max}</span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-slate-100">
                                              <div
                                                className="h-1.5 rounded-full bg-slate-700"
                                                style={{ width: `${Math.min(100, ((value ?? 0) / max) * 100)}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="border-t pt-3">
                                      <div className="flex justify-between font-medium">
                                        <span>Alignment <span className="font-normal text-slate-400">(Enriched Ranking)</span></span>
                                        <span>{scoreCell(row.alignment_score)}</span>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Structural credibility from directors, ownership and filing activity.
                                      </div>
                                      <div className="mt-2 space-y-1.5">
                                        {[
                                          { label: 'Team', desc: 'Director breadth & structure', value: row.team_score, max: 15 },
                                          { label: 'Cap table', desc: 'Ownership complexity', value: row.cap_table_score, max: 15 },
                                          { label: 'Activity', desc: 'Filing depth beyond incorporation', value: row.activity_score, max: 15 },
                                        ].map(({ label, desc, value, max }) => (
                                          <div key={label}>
                                            <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                                              <span>{label} <span className="text-slate-400">— {desc}</span></span>
                                              <span>{value ?? '—'} / {max}</span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-slate-100">
                                              <div
                                                className="h-1.5 rounded-full bg-indigo-500"
                                                style={{ width: `${Math.min(100, ((value ?? 0) / max) * 100)}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="border-t pt-3">
                                      <div className="flex justify-between font-semibold">
                                        <span>Combined</span>
                                        <span>{scoreCell(row.combined_score)}</span>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">Core + Alignment</div>
                                    </div>

                                  </div>
                                </div>

                                <div className="rounded-2xl border bg-white p-4">
                                  <div className="text-sm font-semibold">Category signals</div>
                                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                                    <div>
                                      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Primary SIC</div>
                                      <div>{row.primary_sic_category || '—'}</div>
                                    </div>
                                    <div>
                                      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">SIC categories</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {normaliseArray(row.sic_categories).map((cat) => (
                                          <span key={cat} className={`${badgeClass} border-slate-300 bg-slate-50 text-slate-700`}>
                                            {cat}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Keyword categories</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {normaliseArray(row.keyword_categories).map((cat) => (
                                          <span key={cat} className={`${badgeClass} border-indigo-300 bg-indigo-50 text-indigo-700`}>
                                            {cat}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-2xl border bg-white p-4">
                                  <div className="text-sm font-semibold">Directors</div>
                                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                                    {Array.isArray(row.directors) && row.directors.length > 0 ? (
                                      row.directors.map((director) => (
                                        <div key={`${director.name}-${director.role || ''}`} className="rounded-xl border p-3">
                                          <div className="font-medium">{director.name}</div>
                                          <div className="mt-1 text-xs text-slate-500">{director.role || 'Director'}</div>
                                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                            <a
                                              href={companiesHouseUrl(row.company_number)}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 underline"
                                            >
                                              Companies House <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                            <a
                                              href={director.linkedin_url || linkedInSearchUrl(director.name, row.company_name)}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 underline"
                                            >
                                              LinkedIn search <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-xs text-slate-500">
                                        Director list not yet attached to this row.
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-2xl border bg-white p-4">
                                  <div className="text-sm font-semibold">Selection notes</div>
                                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                                    <div>
                                      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Why selected</div>
                                      <ul className="list-disc space-y-1 pl-4">
                                        {normaliseArray(row.why_selected).length > 0 ? (
                                          normaliseArray(row.why_selected).map((item) => <li key={item}>{item}</li>)
                                        ) : (
                                          <li>—</li>
                                        )}
                                      </ul>
                                    </div>
                                    <div>
                                      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Risk flags</div>
                                      <ul className="list-disc space-y-1 pl-4">
                                        {normaliseArray(row.risk_flags).length > 0 ? (
                                          normaliseArray(row.risk_flags).map((item) => <li key={item}>{item}</li>)
                                        ) : (
                                          <li>None</li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}