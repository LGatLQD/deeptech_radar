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
};

type SortKey =
  | 'rank_position'
  | 'combined_score'
  | 'core_score'
  | 'alignment_score'
  | 'date_of_creation'
  | 'company_name';

type SortDir = 'asc' | 'desc';

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
  const [sortKeyDraft, setSortKeyDraft] = useState<SortKey>('rank_position');
  const [sortDirDraft, setSortDirDraft] = useState<SortDir>('asc');

  const [query, setQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedHubs, setSelectedHubs] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [validatedOnly, setValidatedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rank_position');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [expanded, setExpanded] = useState<string | null>(null);

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
      const sortBy = args?.sortKey ?? sortKey;
      const direction = args?.sortDir ?? sortDir;

      if (q.trim()) params.set('q', q.trim());
      stageValues.forEach((v) => params.append('stage', v));
      hubValues.forEach((v) => params.append('hub', v));
      categoryValues.forEach((v) => params.append('category', v));
      if (validated) params.set('validated_only', 'true');
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
      sortKey: 'rank_position',
      sortDir: 'asc',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleValue(value: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(value) ? current.filter((x) => x !== value) : [...current, value]);
  }

  function applyFilters() {
    setQuery(queryInput);
    setSelectedStages(selectedStagesDraft);
    setSelectedHubs(selectedHubsDraft);
    setSelectedCategories(selectedCategoriesDraft);
    setValidatedOnly(validatedOnlyDraft);
    setSortKey(sortKeyDraft);
    setSortDir(sortDirDraft);

    loadData({
      q: queryInput,
      stages: selectedStagesDraft,
      hubs: selectedHubsDraft,
      categories: selectedCategoriesDraft,
      validatedOnly: validatedOnlyDraft,
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
    setSortKeyDraft('rank_position');
    setSortDirDraft('asc');

    setQuery('');
    setSelectedStages([]);
    setSelectedHubs([]);
    setSelectedCategories([]);
    setValidatedOnly(false);
    setSortKey('rank_position');
    setSortDir('asc');

    loadData({
      q: '',
      stages: [],
      hubs: [],
      categories: [],
      validatedOnly: false,
      sortKey: 'rank_position',
      sortDir: 'asc',
    });
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
              Search runs across the full screened universe and returns the top 300 matches.
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
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4" /> Results
            </div>
            <div className="text-sm text-slate-500">
              Showing {returned.toLocaleString()} of {total.toLocaleString()} matches
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
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Incorporated</th>
                    <th className="px-4 py-3 font-medium">Hub</th>
                    <th className="px-4 py-3 font-medium">Sectors</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium">Combined</th>
                    <th className="px-4 py-3 font-medium">Core</th>
                    <th className="px-4 py-3 font-medium">Alignment</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
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
                            <button
                              type="button"
                              onClick={() => setExpanded(isOpen ? null : row.company_number)}
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
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-t bg-slate-50">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="grid gap-4 lg:grid-cols-4">
                                <div className="rounded-2xl border bg-white p-4">
                                  <div className="text-sm font-semibold">Scores</div>
                                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                                    <div>
                                      <div className="flex justify-between font-medium">
                                        <span>Core</span>
                                        <span>{scoreCell(row.core_score)}</span>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Deep-tech relevance signal from SIC, name keywords and cluster location.
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex justify-between font-medium">
                                        <span>Alignment</span>
                                        <span>{scoreCell(row.alignment_score)}</span>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Structural credibility signal from directors, ownership and filing activity.
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex justify-between">
                                        <span>Team</span>
                                        <span>{scoreCell(row.team_score)}</span>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Breadth of directors and management structure.
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex justify-between">
                                        <span>Cap table</span>
                                        <span>{scoreCell(row.cap_table_score)}</span>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Ownership complexity inferred from PSC structure.
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex justify-between">
                                        <span>Activity</span>
                                        <span>{scoreCell(row.activity_score)}</span>
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Filing depth and evidence of corporate activity beyond incorporation.
                                      </div>
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